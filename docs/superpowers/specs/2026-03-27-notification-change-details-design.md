# Tracking Bildirimlerinde Degisiklik Detayi Tasarimi

**Tarih:** 2026-03-27  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/api`, `apps/web`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, kayitli urunler yenilendiginde sistemin yalnizca "degisiklik oldu" bilgisini vermesi yerine, hangi alanin nasil degistigini bildirim merkezinde acik sekilde gostermesidir.

Beklenen urun davranisi sunlardir:

- kullanici yenileme sonrasinda hangi urunde neyin degistigini tek bakista gorebilir
- fiyat degisimlerinde `eski -> yeni` degeri gorunur
- baslik, aciklama ve gorsel degisimleri de bildirim uretir
- varyant stok degisimi mevcut davranisini korur, ancak daha acik okunur metinlerle sunulur
- mevcut bildirim merkezi korunur; kullanici yeni bir ekran ogrenmek zorunda kalmaz
- manuel ve zamanlanmis yenilemeler ayni bildirim mantigini kullanir

Bu tasarim, mevcut bildirim mimarisini tamamen degistirmek yerine, halihazirdaki `notifications` akisini daha acik ve daha faydali hale getirmeyi hedefler.

---

## 2. Mevcut durum ve problem

Kod tabaninda su anki davranis incelendiginde asagidaki durum goruluyor:

- `apps/api/src/modules/sync/diffProductState.ts` fiyat ve stok degisimleri icin bildirim uretiyor.
- ayni dosya `title`, `description` ve `images` icin history uretiyor; fakat bu alanlar icin bildirim uretmiyor.
- `apps/web/src/features/notifications/components/NotificationList.tsx` ekrani gelen `title` ve `body` alanlarini duz metin olarak gosteriyor.
- `apps/web/src/app/api.ts` icindeki `NotificationItem` modeli yalnizca `title` ve `body` tabanli mevcut yaklasimi temsil ediyor.

Bu nedenle bugunku kullanici deneyimi eksik kaliyor:

- fiyat degisimleri gorulebiliyor ama diger icerik degisimleri gorulemiyor
- fiyat ve stok bildirimleri yeterince acik degil; hangi degerden hangi degere gecildigi daha okunur verilebilir
- detayli degisiklik bilgisi timeline tarafinda bulunabilse de bildirim merkezinde ayni netlik yok

Kullanici ihtiyaci, bildirim merkezinin "degisiklik listesi" gibi davranmasi ve yenilemede yakalanan farklari acikca gostermesidir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin netlestirilen urun kararlari sunlardir:

- bildirimlerde degisiklik ozeti degil, acik degisim metni gosterilecek
- desteklenen degisim turleri ilk iterasyonda su alanlarla sinirli olacak:
  - urun seviyesi fiyat
  - varyant seviyesi fiyat
  - varyant stok durumu
  - urun basligi
  - urun aciklamasi
  - urun gorselleri
- her bildirimde mumkun oldugunca `eski -> yeni` mantigi kullanilacak
- aciklama gibi uzun alanlarda tam metin yerine kisaltilmis onizleme gosterilecek
- gorsel degisimlerinde ham JSON veya URL listesi birebir kullaniciya gosterilmeyecek; ozetlenmis insan okunur metin kullanilacak
- mevcut `notifications` tablosuna yeni kolon eklenmeyecek
- bildirim ekrani yeni bir veri kaynagina tasinmayacak; mevcut `/owners/:ownerKey/notifications` akisi korunacak

Bu iterasyonda `brand`, `category`, `attributes` gibi bugun diff edilse bile notification'a baglanmayan yeni alanlar sisteme eklenmeyecektir.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Mevcut bildirim modelini zenginlestirilmis metinle devam ettirmek (**secilen**)

Backend tarafinda yeni notification tipleri eklenir ve `title/body` alanlari daha akilli uretilir. UI yalnizca bu metinleri gostermeye devam eder.

**Artilari**
- mevcut veritabani semasini bozmaz
- API sozlesmesini degistirmeden ilerler
- uygulama riski dusuktur
- bildirim merkezi hizli sekilde daha faydali hale gelir

**Eksileri**
- veri yapisal degil, metin icinde tasinir
- ileride daha ozel kart tasarimlari istenirse ek genisleme gerekir

### Yaklasim B - Bildirim modeline `before/after/fieldKey` eklemek

Bildirim tablosu ve API yapisi genisletilir, frontend her bildirim turu icin ayri diff karti cizer.

**Artilari**
- yapisal veri daha temizdir
- gelecekte zengin UI icin daha uygun temel sunar

**Eksileri**
- migration gerekir
- backend, API ve frontend birlikte degismelidir
- mevcut ihtiyac icin gereksiz kapsama buyur

### Yaklasim C - Bildirim ekranini tamamen degisiklik timeline verisi ile beslemek

Bildirim merkezi mevcut notification kayitlarini kullanmak yerine timeline kayitlarini okuyarak degisiklikleri listeler.

**Artilari**
- tek bir degisiklik kaynagi olusturur
- `before/after` verisini dogrudan kullanmak kolaylasir

**Eksileri**
- bildirim ve timeline kavramlari birbirine karisir
- parse error gibi klasik bildirimler icin ek kurgu gerekir
- owner notifications endpoint davranisi anlamsal olarak degismis olur

Secilen yaklasim: **Yaklasim A**.

---

## 5. Hedef davranis

### 5.1 Bildirim merkezinin rolu

Bildirim merkezi, yenileme sonucunda algilanan degisikliklerin okunur ozet ekrani olmaya devam edecektir. Kullanici buraya girdiginde su tipte mesajlar gorecektir:

- `Urun fiyati degisti`
- `Siyah / M varyanti fiyati degisti`
- `Mavi / L varyanti stok disi oldu`
- `Urun basligi degisti`
- `Urun aciklamasi guncellendi`
- `Urun gorselleri guncellendi`
- `Parse hatasi`

Mevcut uyarilar / bilgilendirmeler ayrimi korunur.

### 5.2 Metin ilkeleri

Bildirim metni su kurallara gore uretilecektir:

- kisa ve ilk bakista anlasilir olacak
- gereksiz teknik ifade kullanilmayacak
- mumkun olan yerlerde `eski -> yeni` gosterilecek
- uzun metinler tek karti kaplayacak kadar buyumeyecek
- ham JSON, tam HTML veya kontrolsuz URL listeleri gosterilmeyecek

### 5.3 Ornek gorunumler

Onerilen ornekler:

- Baslik: `Urun fiyati degisti`  
  Govde: `399,90 TL -> 429,90 TL`

- Baslik: `Siyah / M varyanti fiyati degisti`  
  Govde: `399,90 TL -> 379,90 TL`

- Baslik: `Siyah / M varyanti stok disi oldu`  
  Govde: `Stokta -> Stokta degil`

- Baslik: `Urun basligi degisti`  
  Govde: `"Oversize Hoodie" -> "Oversize Hoodie Renewed"`

- Baslik: `Urun aciklamasi guncellendi`  
  Govde: `"Soft brushed cotton hoodie..." -> "Soft brushed cotton hoodie... Yeni sezon kumasi."`

- Baslik: `Urun gorselleri guncellendi`  
  Govde: `Gorsel sayisi 2 -> 3`

Gorsel sayisi ayni kalip sadece icerik degisti ise alternatif govde: `Kapak gorseli degisti` veya `Gorsel listesi degisti`.

---

## 6. Mimari tasarim

### 6.1 Genel akis

Merkezi yenileme akisi degismeyecektir:

1. `processRefreshJob` urunun eski snapshot'ini okur.
2. Trendyol verisi cekilir ve parse edilir.
3. `diffProductState` eski ve yeni veriyi karsilastirir.
4. Degisen alanlar icin history kayitlari olusur.
5. Ayni anda uygun notification nesneleri uretilir.
6. `notificationsRepo.insertNotifications` ile kayitlar yazilir.
7. `NotificationList` mevcut endpoint uzerinden bu kayitlari gosterir.

Buradaki ana degisiklik, `diffProductState` icindeki notification uretim mantiginin genisletilmesidir.

### 6.2 Notification uretim siniri

Notification uretimi su katmanda kalacaktir:

- `apps/api/src/modules/sync/diffProductState.ts`

Gerekce:

- alan bazli eski/yeni degeri burada zaten birlikte goruyoruz
- history kayitlari ile notification'lar ayni karar mekanizmasindan cikmis olur
- farkli yerlerde ayni degisiklik mantigi kopyalanmaz

### 6.3 Frontend etkisi

Frontend tarafinda veri kaynagi degismeyecektir. Ancak bildirim listesi komponenti su iki iyilestirmeyi alabilir:

- `body` metninin okunurlugunu arttirmak icin daha rahat satir kirilimi
- gerekirse `type` etiketi icin daha anlasilir etiketleme veya aynen koruma

Bu iterasyonda bildirim kartlari icin ayri collapse, modal veya detay paneli eklenmeyecektir.

---

## 7. Notification tipleri ve metin kurallari

### 7.1 Tip stratejisi

Mevcut tipler korunur, yeni tipler eklenir.

Korunan tipler:

- `PRICE_INCREASED`
- `PRICE_DECREASED`
- `OUT_OF_STOCK`
- `BACK_IN_STOCK`
- `PARSE_ERROR`

Yeni tipler:

- `TITLE_CHANGED`
- `DESCRIPTION_CHANGED`
- `IMAGES_CHANGED`

Not: Urun seviyesi fiyat icin mevcut `PRICE_INCREASED` / `PRICE_DECREASED` ayrimi korunur. Varyant fiyatlari icin de ayni ayrim kullanilacaktir; ancak bildirim metni varyant adini mutlaka icermelidir. Tasarim karari olarak ayri bir varyant fiyat notification tipi eklenmeyecektir.

Bu iterasyonda veri modeli en sade kalsin diye secilen kurallar sunlardir:

- urun fiyati degisiminde mevcut `PRICE_INCREASED` / `PRICE_DECREASED`
- varyant fiyat degisiminde de yine mevcut `PRICE_INCREASED` / `PRICE_DECREASED`, ancak `title` varyanti acikca belirtir
- yeni tip ihtiyaci yalnizca icerik degisimleri icin kullanilir

### 7.2 Severity kurallari

- fiyat artis / azalis: `info`
- varyant tekrar stokta: `info`
- baslik degisimi: `info`
- aciklama degisimi: `info`
- gorsel degisimi: `info`
- stok disi olma: `warning`
- parse hatasi: `warning`

Bu sayede gercek aksiyon gerektiren durumlar warning grubunda kalir.

### 7.3 Urun seviyesi fiyat metni

Urun seviyesi fiyat bildirimleri su sekilde olacaktir:

- title: `Urun fiyati artti` veya `Urun fiyati dustu`
- body: `<eski fiyat> -> <yeni fiyat>`

Fiyat gosterimi `TL` ve iki ondalik ile kullanici dostu formatta uretilecektir. Mevcut veri cent bazli tutuldugu icin backend tarafinda `39990 -> 399,90 TL` formatina cevrilecektir.

### 7.4 Varyant fiyat metni

Varyant fiyat degisiminde title varyant kimligini insan okunur sekilde gosterecektir.

Onerilen kurallar:

- varyant etiketi varsa `option1 / option2 / option3` sirasi kullanilir
- bu alanlar bos ise `variantKey` kullanilir
- title: `<varyant etiketi> varyanti fiyati artti/dustu`
- body: `<eski fiyat> -> <yeni fiyat>`

Bu davranis kullanicinin hangi varyantin degistigini anlamasini saglar.

### 7.5 Varyant stok metni

Mevcut stok bildirimi daha acik Turkce metinle uretilecektir:

- title: `<varyant etiketi> varyanti stok disi oldu`
- body: `Stokta -> Stokta degil`

veya

- title: `<varyant etiketi> varyanti yeniden stokta`
- body: `Stokta degil -> Stokta`

### 7.6 Baslik degisimi metni

- title: `Urun basligi degisti`
- body: `"<eski baslik>" -> "<yeni baslik>"`

Metin cok uzunsa her iki taraf da sinirli uzunlukta kisaltilir. Onerilen ust sinir: 80 karakter.

### 7.7 Aciklama degisimi metni

Aciklama uzun olabilecegi icin tam metin basilmamalidir.

- title: `Urun aciklamasi guncellendi`
- body: `"<eski onizleme>" -> "<yeni onizleme>"`

Onerilen kurallar:

- bosluk normalize edilir
- her taraf en fazla 120 karaktere dusurulur
- kesilen metin `...` ile biter
- tamamen bos bir degerden dolu degere gecis veya tersi de gosterilir

Ornek:

`"Aciklama yok" -> "Pamuklu, yumusak dokulu yeni sezon hoodie..."`

### 7.8 Gorsel degisimi metni

Gorseller icin kullaniciya ham JSON gostermek yerine ozet davranis uygulanir.

Onerilen karar mantigi:

- once eski ve yeni gorsel listesi parse edilir
- sayi degismisse body: `Gorsel sayisi X -> Y`
- sayi ayni ama ilk gorsel degismisse body: `Kapak gorseli degisti`
- aksi halde body: `Gorsel listesi guncellendi`

Title her durumda:

- `Urun gorselleri guncellendi`

Bu yaklasim kullaniciya anlamli bilgi verir, ama uzun URL listesi tasimaz.

---

## 8. Veri modeli ve API etkisi

### 8.1 Veritabani

Bu iterasyonda `notifications` tablosu degismeyecektir.

Kullanilacak mevcut alanlar:

- `type`
- `severity`
- `title`
- `body`
- `created_at`

Bu karar, migration ihtiyacini ortadan kaldirir.

### 8.2 API sozlesmesi

`NotificationItem` yapisi da degismeyecektir.

Bu nedenle:

- `apps/web/src/app/api.ts` icindeki interface korunur
- `/owners/:ownerKey/notifications` endpoint cevabi sekil degistirmez
- frontend degisiklikleri daha cok gosterim odakli olur

### 8.3 Geriye donuk uyumluluk

Eski notification kayitlari halen ayni sekilde okunabilir. Yalnizca yeni uretilen kayitlar daha zengin metin tasir.

Bu, migration'siz gecis saglar ve eski kayitlari bozmaz.

---

## 9. Implementasyon parcasi

### 9.1 Backend degisiklikleri

Ana degisiklikler su dosyada toplanir:

- `apps/api/src/modules/sync/diffProductState.ts`

Beklenen backend calismalari:

1. mevcut fiyat ve stok notification builder fonksiyonlari Turkce ve detayli metne cekilir
2. varyant fiyat degisimleri icin ayri notification uretimi eklenir
3. `TITLE`, `DESCRIPTION`, `IMAGES` content history olustugu anda ilgili notification'lar da uretilir
4. fiyat formatlama, metin kisaltma, varyant etiketleme ve gorsel ozeti icin yardimci fonksiyonlar eklenir

### 9.2 Frontend degisiklikleri

Ana dosya:

- `apps/web/src/features/notifications/components/NotificationList.tsx`

Muhtemel iyilestirmeler:

- uzun `body` metinlerinin daha rahat okunmasi
- bos liste varsa uygun bos durum mesaji eklenmesi
- gerekirse `type` rozetinin daha kullanici dostu karsilikla gosterilmesi

### 9.3 Kapsam disi

Bu iterasyonda yapilmayacaklar:

- read/unread davranisi eklemek
- bildirime tiklayinca urun detayina gitme davranisi eklemek
- bildirimlerde filtreleme veya arama eklemek
- structured `before/after` alanlari icin schema migration yazmak
- timeline ve notification ekranlarini birlestirmek

---

## 10. Hata yontemi ve kenar durumlari

### 10.1 Null ve bos degerler

Degisim metinlerinde `null` veya bos string kullaniciya ham sekilde gosturulmayacaktir.

Onerilen gorunumler:

- bos / null metin -> `Bos`
- bos / null aciklama -> `Aciklama yok`
- parse edilemeyen gorsel listesi -> `Gorsel listesi guncellendi`

### 10.2 Uzun metinler

Aciklama ve baslik gibi alanlar notification kartini cok buyutmemelidir. Bu nedenle truncation zorunludur.

Kurallar:

- baslik preview: max 80 karakter
- aciklama preview: max 120 karakter
- tum preview'lar tek satirlik mantiksal ozet uretir; satir sonu ve fazla bosluk normalize edilir

### 10.3 Gorsel parse hatalari

Eski veya yeni `imagesRaw` verisi parse edilemezse sistem hata vermemelidir.

Beklenen fallback:

- notification title yine `Urun gorselleri guncellendi`
- body ise `Gorsel listesi guncellendi`

### 10.4 Bir yenilemede birden fazla degisim

Ayni yenilemede hem baslik hem fiyat hem de stok degisebilir. Bu durumda sistem bir ozet notification'a inmek yerine her anlamli degisiklik icin ayri notification uretmeye devam edecektir.

Gerekce:

- bildirim merkezi zaten liste yapisinda
- ayri kayitlar okunurlugu arttirir
- mevcut notification insert davranisi ile uyumludur

---

## 11. Test stratejisi

### 11.1 Unit testler

`apps/api/tests/unit/diffProductState.test.ts` genisletilecektir.

Eklenecek dogrulamalar:

- baslik degisiminde `TITLE_CHANGED` notification olusur
- aciklama degisiminde kisaltilmis `body` olusur
- gorsel sayisi degisiminde `IMAGES_CHANGED` notification olusur
- varyant fiyat degisiminde ilgili varyant adini iceren notification olusur
- fiyat bildirimleri `eski -> yeni` formatinda gelir
- stok bildirimleri Turkce `Stokta / Stokta degil` formatinda gelir

### 11.2 Integration testler

`apps/api/tests/integration/processRefreshJob.test.ts` icinde su davranislar dogrulanacaktir:

- content degisimleri notification tablosuna da yazilir
- bir yenilemede birden fazla fark varsa birden fazla notification yazilir
- parse error notification davranisi bozulmaz
- no-change senaryosunda hala notification yazilmaz

### 11.3 Web testi

Gerekirse `NotificationList` icin basit render testi eklenebilir; ancak ana risk backend notification metni oldugu icin test odagi once API tarafidir.

---

## 12. Basari kriterleri

Bu is tamamlandiginda basarili kabul edilmesi icin su sonuc beklenir:

- kullanici bir urunu yenilediginde fiyat, stok, baslik, aciklama ve gorsel degisimleri bildirim merkezinde gorur
- ilgili bildirimlerde degisiklik `eski -> yeni` mantigiyla okunabilir olur
- mevcut notification endpoint'i ve tablo yapisi bozulmaz
- parse error ve no-change akislari mevcut davranisini korur
- testler yeni notification davranisini dogrular

---

## 13. Ozet secim

Bu tasarim, mevcut bildirim altyapisini koruyup anlamli sekilde zenginlestiren dar kapsamli bir iyilestirmedir.

Temel secim sudur:

- bildirim modelini yapisal olarak buyutmek yerine
- mevcut `title/body` alanlarini daha akilli ve fark gosterir sekilde uretmek
- history'de zaten tespit edilen icerik degisimlerini notification'a da yansitmak

Boylece kullanici, "yenilemede ne degisti" sorusunun cevabini bildirim merkezinde dogrudan gorebilir.
