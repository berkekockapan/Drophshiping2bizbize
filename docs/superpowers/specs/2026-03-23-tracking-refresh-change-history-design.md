# Tracking Yenileme Audit ve Secici Degisiklik Gecmisi Tasarimi

**Tarih:** 2026-03-23  
**Durum:** Tasarim onaylandi  
**Kapsam:** Manuel ve zamanlanmis yenilemelerde urunlerin guncel durumunu kalici olarak saklayan, ayni kalan alanlarda gereksiz history kaydi uretmeyen, sadece degisen alanlar icin detayli gecmis tutan tasarim

---

## 1. Amac

Bu degisikligin amaci, takip edilen urunlerin her yenilemede yeniden cekilen verisini sistemde kalici olarak guncellemektir. Sistem acildiginda urun verisi yeniden bastan cekilmez; uygulama her zaman veritabanindaki son kayitli durumu gosterir. Yeni cekim yalnizca manuel toplu yenileme veya zamanlanmis otomatik yenileme ile tetiklenir.

Bu ihtiyac yalnizca "guncel degeri yaz" davranisindan ibaret degildir. Beklenen sonuc sunlardir:

- urunun son bilinen durumu sistemde her zaman kayitli kalir
- ayni kalan alanlar icin history sismez
- sadece degisen alanlar icin onceki ve yeni deger izlenebilir olur
- degisiklik olmasa bile yenileme yapildigi audit olarak gorulebilir
- ayni mantik manuel ve otomatik yenilemelerde de gecerli olur
- urun detay ekraninda bu hareketler tek bir degisiklik gecmisi olarak okunabilir

Bu tasarim tam snapshot biriktirmeyi reddeder. Sistem son durumu ayri, degisiklik gecmisini ayri tutar.

---

## 2. Onaylanan urun kararlari

- Degisiklik gecmisi **alan bazli** tutulur; her yenilemede tum snapshot saklanmaz.
- History kapsami su alanlarla sinirlidir:
  - `title`
  - `description`
  - `images`
  - urun seviyesi fiyat
  - varyant fiyatlari
  - varyant stok durumlari
- `brand`, `category` ve `attributes` bu iterasyonda history kapsaminda degildir.
- Degisiklik olmayan yenilemelerde alan history kaydi acilmaz.
- Degisiklik olmayan yenilemeler icin yine de ayri bir `refresh audit` kaydi tutulur.
- Bu mantik hem `Tum urunleri yenile` ile baslayan manuel yenilemelerde hem de otomatik zamanlanmis yenilemelerde calisir.
- Urun detay sayfasinda tek bir `Degisiklik Gecmisi` bolumu bulunur.
- Bu bolum, urun ozeti ve varyant tablosunun altinda **tam genislikte** yer alir.
- Tracking listesi bu iterasyonda son degisiklik ozeti gostermez; ana gorunum urun detay sayfasidir.

---

## 3. Secilen yaklasim

Secilen yaklasim sudur:

- mevcut `products`, `product_current_state` ve `product_variants` tablolari urunun **son durumu** olmaya devam eder
- her yenileme icin ayri bir `product_refresh_audits` kaydi yazilir
- sadece gercekten degisen icerik alanlari icin `product_content_history` kaydi yazilir
- mevcut `price_history` ve `stock_history` tablolari korunur, ancak her kayit ilgili audit ile baglanir
- hem manuel toplu yenileme hem de scheduler tabanli otomatik yenileme ayni `processRefreshJob` hattini kullanir

Bu yaklasim su nedenlerle secilmistir:

- mevcut mimariye minimum darbe ile uyumludur
- ayni veri tekrar geldikce history sismesini engeller
- manuel ve otomatik yenileme davranisini ayrismadan tek yerde tutar
- mevcut fiyat/stok gecmisini cope atmadan genisletir
- detay ekraninda tek timeline kurmaya izin verir

Asagidaki yaklasimlar secilmemistir:

- her yenilemede tam urun snapshot'i saklamak: ayni veriyi gereksiz tekrarlar
- tek dev event tablosuna tum mevcut history yapisini tasimak: gecis maliyeti yuksek ve mevcut kodla daha risklidir

---

## 4. Mimari akis

### 4.1 Ortak yenileme hatti

Merkezi akis `processRefreshJob` olur. Su girisler ayni kuralla bu hatta baglanir:

- manuel tekil/toplu yenileme
- zamanlanmis otomatik yenileme

Bu sayede ayni urun hangi kaynaktan yenilenirse yenilensin ayni diff ve persistence kurallari uygulanir.

### 4.2 Ust duzey veri akisi

Her yenilemede su sira izlenir:

1. Veritabanindan urunun mevcut kayitli son durumu okunur.
2. Trendyol HTML'i cekilir ve parse edilir.
3. Eski durum ile yeni parse sonucu alan bazli karsilastirilir.
4. Son durumu temsil eden tablolar guncellenir.
5. O yenileme icin bir `refresh audit` kaydi yazilir.
6. Sadece degisen alanlar icin history kayitlari yazilir.
7. Parse veya fetch hatasi varsa audit hata statusu ile yazilir; son gecerli urun verisi korunur.

### 4.3 Son durum ile history'nin ayristirilmasi

Bu tasarimda iki farkli veri katmani vardir:

- **Current state:** uygulamanin ilk actiginda gosterdigi son kayitli durum
- **History/audit:** hangi yenilemede hangi alanin degistigi veya hic degismedigi

Bu ayrim sayesinde:

- ekran acilisinda ekstra scrape gerekmez
- tracking listesi ve detay sayfasi hizli yuklenir
- history yalnizca gercek bilgi tasidigi kadar buyur

---

## 5. Veri modeli

### 5.1 Korunan tablolar

Asagidaki tablolar son durumu tutmaya devam eder:

- `products`
- `product_current_state`
- `product_variants`

Bu tablolarda her urun icin yalnizca **en yeni** veri bulunur.

### 5.2 Yeni `product_refresh_audits` tablosu

Bu tablo her urun yenilemesi icin tek satir tutar.

Onerilen alanlar:

- `id`
- `product_id`
- `source` -> `MANUAL` | `SCHEDULED`
- `manual_refresh_run_id` -> varsa ilgili toplu manuel run
- `status` -> `SUCCESS` | `NO_CHANGE` | `PARSE_ERROR` | `FETCH_ERROR`
- `checked_at`
- `change_count`
- `changed_fields_json`
- `error_message`
- `created_at`

Amaci:

- degisiklik olmayan yenilemeleri audit etmek
- hata ile biten yenilemeleri timeline'a tasimak
- bir yenilemenin hangi alanlari etkiledigini ozetlemek
- price/content/stock history satirlarini ortak bir yenileme kimligine baglamak

### 5.3 Yeni `product_content_history` tablosu

Bu tablo yalnizca icerik alanlarinda gercek fark oldugunda satir uretir.

Onerilen alanlar:

- `id`
- `product_id`
- `refresh_audit_id`
- `field_key` -> `TITLE` | `DESCRIPTION` | `IMAGES`
- `previous_value_raw`
- `new_value_raw`
- `changed_at`
- `created_at`

Bu tabloda ayni kalan degerler icin yeni satir acilmaz.

### 5.4 Mevcut history tablolarinin genisletilmesi

Asagidaki tablolara `refresh_audit_id` alani eklenir:

- `price_history`
- `stock_history`

Bu alan sayesinde detay ekraninda farkli history kaynaklari tek timeline'a dogru sekilde baglanabilir.

### 5.5 Saklanmayacak veri

Bu iterasyonda sunlar yapilmayacaktir:

- her yenileme icin tam snapshot saklamak
- `brand`, `category`, `attributes` icin history tutmak
- track edilmeyen alanlarda "fark var mi" mantigi kurmak

---

## 6. Degisiklik karsilastirma kurallari

Amac yalanci degisiklikleri azaltmaktir.

### 6.1 `title`

Karsilastirma oncesi normalize edilir:

- trim
- birden fazla boslugu teke dusurme

Normalize edilmis eski ve yeni deger ayniysa degisiklik sayilmaz. Farkliysa `TITLE` history satiri yazilir.

### 6.2 `description`

Karsilastirma oncesi:

- trim
- birden fazla boslugu teke dusurme

Normalize edilmis sonuc ayniysa history yazilmaz. Farkliysa `DESCRIPTION` history satiri yazilir.

### 6.3 `images`

Gorseller URL listesi olarak karsilastirilir.

- URL'ler normalize edilir
- dizi sira duyarlidir

Ayni URL'ler farkli sira ile gelirse degisiklik sayilir. Bunun nedeni gorsel siralamanin urun sunumunu etkileyebilmesidir.

### 6.4 Urun seviyesi fiyat

Urunun ana fiyati degismisse `price_history` kaydi yazilir. Ayniysa yazilmaz.

### 6.5 Varyant fiyatlari

Her varyant `variant_key` ile eslestirilir. Bir varyantin fiyatinda fark varsa ayri bir `price_history` kaydi yazilir. `null -> sayi`, `sayi -> null` ve `sayi -> farkli sayi` gecisleri degisiklik sayilir.

### 6.6 Varyant stok durumlari

Her varyant `variant_key` ile eslestirilir. `IN_STOCK` / `OUT_OF_STOCK` degismisse `stock_history` kaydi yazilir.

### 6.7 `NO_CHANGE` karari

Asagidaki izlenen alanlardan hicbiri degismediyse:

- `title`
- `description`
- `images`
- urun fiyati
- varyant fiyatlari
- varyant stok durumlari

sonuc olarak:

- field history kaydi yazilmaz
- price history kaydi yazilmaz
- stock history kaydi yazilmaz
- `product_refresh_audits.status = NO_CHANGE` kaydi yazilir

### 6.8 Hata durumlari

Fetch veya parse hatasinda:

- son gecerli urun verisi korunur
- yeni content/price/stock history yazilmaz
- audit kaydi hata statusu ile yazilir
- mevcut notification davranisi korunur

---

## 7. Persistence davranisi

### 7.1 Son durum tablolarinin guncellenmesi

Refresh basarili oldugunda:

- `products` son `title`, `description`, `images` ve diger guncel alanlarla guncellenir
- `product_current_state` son fiyat/gorunum bilgisi ile guncellenir
- `product_variants` varyantlarin son fiyat ve stok durumunu tutar

Bu guncelleme history yazimindan bagimsizdir. Yani veri ayni kalsa bile son kontrol zamani ve gerekli teknik alanlar guncellenir.

### 7.2 `lastCheckedAt`

Her basarili refresh sonrasi guncellenir. Bu alan "veri ne zaman son kontrol edildi" bilgisidir.

### 7.3 `lastChangeAt`

Bu tasarimda `lastChangeAt`, izlenen history alanlarindan herhangi biri degistiginde guncellenir. Boylece kullanici "son degisiklik" bilgisini yalnizca fiyat/stok ile sinirli olmayan daha tutarli bir sekilde gorebilir.

### 7.4 Yenileme kaynagi

Audit kaydi `source` ile isaretlenir:

- `MANUAL`
- `SCHEDULED`

Bu ayrim ileride filtreleme veya raporlama gereksinimleri icin yeterli temel saglar.

---

## 8. API tasarimi

### 8.1 Refresh baslatma ve scheduler

Mevcut manuel toplu yenileme endpointleri korunur. Davranis farki persistence katmanindadir:

- manuel run icindeki her urun ortak refresh hattina girer
- scheduler queue tarafindaki her job ayni refresh hattina girer

Bu sayede hem manuel hem otomatik yenileme ayni audit/history kurallarini uretir.

### 8.2 Urun detay cevabi

Mevcut `ProductDetailResponse` genisletilir. Ek olarak:

- `changeTimeline`

donulur.

Bu alan backend tarafinda birlestirilmis olur; frontend price/content/stock/audit kaynaklarini tek tek merge etmez.

Onerilen timeline item tipleri:

- `REFRESH_NO_CHANGE`
- `REFRESH_ERROR`
- `TITLE_CHANGED`
- `DESCRIPTION_CHANGED`
- `IMAGES_CHANGED`
- `PRODUCT_PRICE_CHANGED`
- `VARIANT_PRICE_CHANGED`
- `VARIANT_STOCK_CHANGED`

Her timeline item icin asgari alanlar:

- `id`
- `type`
- `changedAt`
- `summary`
- `details`
- `before` -> gerekiyorsa
- `after` -> gerekiyorsa
- `variantKey` -> gerekiyorsa
- `refreshSource`

### 8.3 Timeline assembly

Backend su kaynaklari birlestirir:

- `product_refresh_audits`
- `product_content_history`
- `price_history`
- `stock_history`

Sonuc ters kronolojik, tek liste olarak dondurulur.

Tekrarlayan anlatim olmamasi icin:

- `NO_CHANGE` ve hata audit'leri timeline'da bagimsiz satir olarak gosterilir
- degisiklik ureten `SUCCESS` audit kaydi ise timeline'da ayri bir "yenileme basarili" satiri olarak gosterilmez
- degisiklik olan refresh'lerde kullaniciya gosterilen satirlar field/price/stock olaylaridir
- audit kaydi yine de backend trace ve baglanti amaciyla saklanir

---

## 9. Arayuz tasarimi

### 9.1 Tracking Center

Tracking Center'in liste davranisi korunur.

- ekran DB'deki son kayitli durumu gosterir
- `Tum urunleri yenile` mevcut manual refresh run akisini tetikler
- islem tamamlaninca guncel liste ve detay verisi invalidate edilerek yenilenir

Bu iterasyonda tracking kartlarina ayri "son degisiklik ozeti" eklenmez.

### 9.2 Urun detay sayfasi

Yerlesim:

1. Urun ozeti
2. Varyant tablosu
3. Tam genislikte `Degisiklik Gecmisi`

### 9.3 `Degisiklik Gecmisi` bolumu

Bolum tek timeline olarak calisir.

Ornek satirlar:

- `Yenileme yapildi, degisiklik bulunamadi`
- `Baslik degisti`
- `Aciklama guncellendi`
- `Gorsel listesi degisti`
- `Urun fiyati degisti: 899.99 TL -> 949.99 TL`
- `38 numara varyanti fiyati degisti`
- `M varyanti stok disi oldu`
- `Yenileme parse hatasi ile bitti`

Icerik alanlari icin:

- ilk satir kisa ozet olur
- detay kisminda onceki ve yeni deger gosterilebilir

Gorseller icin:

- varsayilan ozet "X gorsel degisti" gibi kisa olur
- tam URL veya liste detayi acilir yapida gosterilir

### 9.4 Geriye donuk okunabilirlik

Kullanici timeline'a bakarak su sorulari cevaplayabilmelidir:

- son yenileme ne zaman yapildi
- degisiklik olmadi mi, olduysa ne degisti
- fiyat mi degisti, icerik mi degisti, stok mu degisti
- hata alan yenileme oldu mu

---

## 10. Hata yonetimi ve sinirlar

### 10.1 Parse/fetch hatalari

- refresh audit hata statusu ile olusur
- mevcut urun snapshot'i korunur
- detay timeline'inda hata olayi gorunur
- mevcut notification kayitlari devam eder

### 10.2 Ayni verinin tekrar gelmesi

- current state tablolari guncel kalir
- history buyumez
- audit `NO_CHANGE` ile kaydedilir

### 10.3 Kapsam disi alanlar

Bu iterasyonda history kapsaminda olmayan alanlar icin degisiklik audit ozetine de sokulmaz. Boylece sistem "izledigim alanlar degismedi" mantigiyla calisir ve kapsam sismez.

### 10.4 Varyant silinmesi veya yeni varyant gelmesi

Bu iterasyonda temel odak mevcut varyantlarin fiyat/stok degisimidir. Yeni varyant eklenmesi veya kaybolan varyantlar icin ayri olay semasi gelecekte genisletilebilir. Ilk iterasyonda bunlar ayrica urunlestirilmez.

---

## 11. Test stratejisi

### 11.1 API/integration

Su senaryolar integration test ile kapsanir:

- manual refresh ile degisiklik yok -> `NO_CHANGE` audit yazilir, field history yazilmaz
- manual refresh ile `title` degisir -> content history yazilir
- `description` degisir -> content history yazilir
- `images` degisir -> content history yazilir
- urun fiyati degisir -> `price_history` yazilir
- varyant fiyati degisir -> varyant bazli `price_history` yazilir
- varyant stok durumu degisir -> `stock_history` yazilir
- scheduler uzerinden gelen refresh ayni sekilde audit/history uretir
- parse hatasi -> audit hata statusu ile yazilir, mevcut snapshot korunur
- urun detay endpoint'i birlestirilmis `changeTimeline` doner

### 11.2 UI testleri

Su senaryolar component/page testleri ile kapsanir:

- urun detay sayfasinda `Degisiklik Gecmisi` bolumu tam genislikte render olur
- `NO_CHANGE` audit satiri dogru metinle gorunur
- title/description/images degisiklik satirlari dogru ozetle gorunur
- fiyat ve stok satirlari timeline icinde dogru siralanir
- hata audit kaydi timeline'da gorunur

### 11.3 Regresyon korumasi

Asagidaki mevcut davranislar korunur:

- tracking listesi mevcut ozeti gostermeye devam eder
- manuel refresh run ilerleme mantigi bozulmaz
- scheduler tabanli queue refresh akisi calismaya devam eder

---

## 12. Kapsam ozeti

Bu tasarim sonunda sistem su davranisa sahip olur:

- uygulama acildiginda urunler yeniden scrape edilmez; DB'deki son durum kullanilir
- manuel ve otomatik yenilemeler ortak refresh hattindan gecer
- son durum tek yerde tutulur
- ayni veri tekrar geldiginde history sismez
- sadece gercek degisiklikler detayli olarak saklanir
- degisiklik olmayan yenilemeler bile audit olarak izlenir
- urun detay ekraninda tum bunlar tek bir `Degisiklik Gecmisi` olarak okunur
