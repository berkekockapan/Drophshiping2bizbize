# Tracking Toplu Yenileme ve Canli Ilerleme Tasarimi

**Tarih:** 2026-03-23  
**Durum:** Tasarim onaylandi  
**Kapsam:** Tracking Center uzerinden tum urunleri gercekten yenileyen, ilerlemeyi canli gosteren ve hatali urunleri tekrar deneyebilen toplu yenileme akisi

---

## 1. Amac

Bu degisikligin amaci, kullanicinin Tracking Center ekranindan tek tikla tum takipli urunlerin guncel verilerini gercekten cekebilmesidir.

Bu davranis yalnizca "yenileme baslat" anlamina gelmez. Beklenen sonuc sunlardir:

- butona basildiginda tum takipli urunler icin veri cekme islemi gercekten calisir
- yenileme sirasinda kullanici canli ilerlemeyi gorur
- islem bitmeden arayuz "tamamlandi" demez
- islem bitince web arayuzunde guncel urun verileri gorunur
- hata alan urunler icin sadece onlari tekrar deneyen ayri bir aksiyon bulunur

Bu tasarim, onceki queue-merkezli "arkada baslat ve hemen don" varsayimini gecersiz sayar. Manuel toplu yenileme, kullanici beklentisine uygun olarak sonuc odakli ve gorunur ilerleme sunan bir akis haline gelir.

---

## 2. Onaylanan urun kararlari

- `Tum urunleri yenile` butonu `Tum Urunler` / `Favoriler` satirinin saginda kalir.
- Bu buton gorunumu hangi sekmede olundugundan bagimsiz calisir; tum kayitli urunleri hedefler.
- Butona basildiginda mevcut buton alani animasyonlu bir yukleme/progress bilesenine donusur.
- Ilerleme gostergesi gercek zamanli olur; doluluk orani gercek tamamlanan urun sayisina dayanir.
- Islem ayni anda **20 urun** isleyebilir.
- Islem bittiginde progress bileseni kapanir, buton eski haline doner.
- Tamamlanma sonrasi kucuk bir popup gorunur ve sonucun ozeti yazilir.
- Hata varsa popup icinde `Hatalilari tekrar dene` butonu yer alir.
- Retry aksiyonu yalnizca onceki calismada hata alan urunleri yeniden yeniler.
- Tek bir urunde hata olsa bile toplu islem durmaz; sonuc ozeti basarili ve hatali sayilarini birlikte verir.

Bu kapsamda urun bazli detayli hata listesi ilk iterasyonda zorunlu degildir; once ozette toplam sayilar yeterlidir.

---

## 3. Mevcut sorun ve neden basit cozum yetmiyor

Mevcut uygulamada manuel toplu yenileme butonu varsa bile davranis sadece kuyruga is atmaktan ibaret kalmaktadir. Bu nedenle:

- kullanici "yenileme basladi" gorur ama verinin gercekten ne zaman guncellendigini bilmez
- liste ve detay ekranlari tamamlanmis sonuc garantisi olmadan stale veri gosterebilir
- gercek zamanli progress hesaplanamaz
- sadece hatali urunleri tekrar deneme gibi sonuc odakli UX kurmak zorlasir

Dolayisiyla yeni ihtiyac queue'ya bir is gondermek degil, "manuel toplu yenileme calismasi" diye ayri bir uygulama kavrami eklemektir.

---

## 4. Secilen yaklasim

Secilen yaklasim sudur:

- backend tarafinda kalici bir `manual refresh run` modeli olusturulur
- kullanici toplu yenileme baslattiginda once bir run yaratilir
- bu run icinde her urun icin ayri durum tutulur
- yenileme isleri arka planda ama ayni run kapsaminda **20 paralel** calisir
- frontend run durumunu kisa araliklarla sorgular ve progress bilesenini gercek sayilara gore gunceller
- run tamamlandiginda frontend ilgili query cache'lerini invalidate ederek guncel veriyi ekrana ceker

Bu secim su nedenlerle uygun gorulmustur:

- ilerleme ve sonuc bilgisi bagimsiz, kalici ve tekrar okunabilir olur
- kullanici sayfayi yenilese bile aktif run durumu kaybolmaz
- sadece hatali urunleri yeniden deneme mantigi temiz bicimde kurulabilir
- uzun sureli tek HTTP stream baglantisina bagimli kalinmaz
- mevcut `processRefreshJob` mantigi veri yazma acisindan yeniden kullanilabilir

Tek bir uzun HTTP istegi uzerinden streaming ilerleme secilmemistir; cunku kopan baglantilarda durum izlenebilirligini ve retry ergonomisini zayiflatir.

---

## 5. Veri modeli

### 5.1 Manual refresh run tablosu

Yeni bir `manual_refresh_runs` tablosu eklenir.

Onerilen alanlar:

- `id`
- `scope` (`ALL` veya `FAILED_ONLY`)
- `source_run_id` (`FAILED_ONLY` retry run'lari icin)
- `status` (`PENDING`, `RUNNING`, `COMPLETED`)
- `total_count`
- `pending_count`
- `running_count`
- `success_count`
- `failed_count`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

Bu tablo, bir toplu yenileme oturumunun ozetini ve son durumunu tutar.

### 5.2 Manual refresh run item tablosu

Yeni bir `manual_refresh_run_items` tablosu eklenir.

Onerilen alanlar:

- `id`
- `run_id`
- `product_id`
- `status` (`PENDING`, `RUNNING`, `SUCCESS`, `FAILED`)
- `attempt_count`
- `error_message`
- `started_at`
- `finished_at`
- `created_at`
- `updated_at`

Bu tablo, her urunun o run icindeki durumunu izler.

### 5.3 Durum toplamlari

Frontend progress hesabi yalnizca bu alanlara dayanir:

- `total_count`
- `success_count`
- `failed_count`
- `running_count`
- `pending_count`

Progress orani:

- `completed = success_count + failed_count`
- `percent = completed / total_count`

Boylece bara yansiyan oran gercekten sonuclanmis urunlere gore hesaplanir.

---

## 6. Backend akis tasarimi

### 6.1 Run baslatma

`POST /tracking/products/refresh-runs` endpointi yeni bir run olusturur.

Varsayilan davranis:

- tum takipli urunler secilir
- run kaydi yazilir
- item kayitlari olusturulur
- run `RUNNING` durumuna alinir
- arka planda isleyici tetiklenir
- frontend'e en az `runId` ve ilk ozet donulur

### 6.2 Failed-only retry

`POST /tracking/products/refresh-runs/:runId/retry-failed` endpointi:

- kaynak run'daki `FAILED` item'lari bulur
- yeni bir run acar
- yalnizca o urunler icin item kaydi olusturur
- yeni run'i calistirir

Bu secim, retry davranisini audit edilebilir ve bagimsiz tutar; ayni run icinde item durumlarini tekrar ezmez.

### 6.3 Run durumunu okuma

`GET /tracking/products/refresh-runs/:runId` endpointi:

- run ozetini
- gerekirse son durum zaman bilgisini
- popup ozeti icin yeterli sayisal sonuc alanlarini
doner

Ilk iterasyonda urun bazli tum item listesini UI'a tasimak zorunlu degildir.

### 6.4 Arka plan isleme

Run baslatildiginda backend tarafinda kontrollu bir paralellik uygulanir:

- ayni anda en fazla 20 urun islenir
- her urun icin mevcut `processRefreshJob` mantigi kullanilir
- urun `RUNNING` oldugunda item status guncellenir
- basariliysa `SUCCESS`, hatada `FAILED` yazilir
- her sonuc sonrasi run toplamlari guncellenir
- tum urunler bittiginde run `COMPLETED` olur ve `finished_at` yazilir

Bu islemde queue zorunlu degildir. Manuel toplu yenileme kendi run isleyicisiyle yonetilir.

### 6.5 Veri guncelleme garantisi

Her item basarili sonuclandiginda urun verisi mevcut refresh akisi uzerinden gercekten DB'ye yazilmis olur:

- urun snapshot
- current state
- varyantlar
- fiyat gecmisi
- stok gecmisi
- notification kayitlari

Dolayisiyla run `COMPLETED` oldugunda liste ve detay ekranlari yeniden cekildiginde guncel veri gorunur.

---

## 7. Arayuz tasarimi

### 7.1 Tracking Center buton/progress donusumu

Normal durumda sag tarafta:

- `Tum urunleri yenile`

Tetiklenince ayni alan sunlara donusur:

- hafif animasyonlu progress container
- dolan bar
- sayisal ilerleme (`12 / 87`)
- kisa durum metni (`Urun verileri yenileniyor...`)

Buton bu sirada ayri bir yerde gosterilmez.

### 7.2 Progress davranisi

Frontend aktif `runId` icin polling yapar.

Onerilen polling araligi:

- 300ms ile 500ms arasi

Her polling sonucunda:

- bar dolulugu
- tamamlanan sayi
- hata sayisi
- durum metni
guncellenir.

### 7.3 Tamamlanma ve popup

Run `COMPLETED` oldugunda:

- progress bileseni kapanir
- normal `Tum urunleri yenile` butonu geri gelir
- ayni alanin ustunde veya yakininda kucuk bir popup/acik kart acilir

Popup icerigi:

- `84 urun guncellendi, 3 urun hata verdi`
- hata yoksa sadece basari ozeti
- hata varsa `Hatalilari tekrar dene` butonu
- popup'i kapatmak icin kucuk bir kapatma aksiyonu

Popup'in otomatik kaybolmasi zorunlu degildir; kullanici kapatabilir.

### 7.4 Query yenileme davranisi

Run tamamlandiginda frontend:

- `tracking-products`
- `product-detail`

query cache'lerini invalidate eder.

Boylece:

- Tracking Center kartlari
- acik urun detay ekranlari

guncel DB sonucunu yeniden alir.

---

## 8. Hata yontemi

- Tek urun hatalari toplu islemi durdurmaz.
- Her hata ilgili run item satirina yazilir.
- Run sonunda toplam `failed_count` popup'ta gosterilir.
- Retry aksiyonu yalnizca `FAILED` item'lar icin yeni run baslatir.
- Tumuyle basarisiz run durumunda da UI tutarli kalir: bar tamamlanir, buton geri gelir, popup hata agirlikli ozeti gosterir.

Bu tasarim "hepsi ya da hic" yerine kismen basarili toplu is mantigini benimser; cunku kullanici icin en degerli olan sey, calisabilen urunlerin yine de guncellenmesidir.

---

## 9. Performans ve sinirlar

- Ayni anda 20 urun islenmesi kullanici istegiyle kabul edilmistir.
- Bu seviye daha hizli toplu guncelleme saglar ancak dusuk paralellige gore daha fazla timeout veya gecici fetch hatasi riski tasir.
- Bu risk retry aksiyonuyla dengelenir.
- Ilk iterasyonda dinamik concurrency ayari veya backoff zorunlu degildir.

Gerekirse sonraki iterasyonda:

- concurrency dusurme
- gecici hata siniflandirma
- otomatik yeniden deneme

eklenebilir; ancak bu kapsamda YAGNI geregi dahil edilmez.

---

## 10. Test stratejisi

### 10.1 API testleri

- run olusturma testi
- durum sayaclarinin dogru guncellenmesi
- 20 paralel islemede run item sonuclarinin kayda gecmesi
- kismi basari / kismi hata senaryosu
- retry-failed endpointinin yalnizca failed item'larla yeni run acmasi
- run tamamlandiginda urun current state bilgisinin gercekten guncellenmis olmasi

### 10.2 Web testleri

- butonun progress bilesenine donusmesi
- polling ile progress oraninin artmasi
- tamamlaninca butonun geri gelmesi
- sonuc popup'inin acilmasi
- hata varsa `Hatalilari tekrar dene` aksiyonunun gorunmesi
- tamamlanma sonrasi ilgili query invalidate/refetch davranisi

### 10.3 Residual risk

En buyuk teknik risk, 20 paralel scrape akisinda dis servis kaynakli gecici hata oraninin yukselmesidir. Tasarim bunu durdurucu hata yerine item-bazli hata ve retry aksiyonu ile yonetir.
