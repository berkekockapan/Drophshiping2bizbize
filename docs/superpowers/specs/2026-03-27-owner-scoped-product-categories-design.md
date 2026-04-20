# Owner-Scoped Urun Kategorileri Tasarimi

**Tarih:** 2026-03-27  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, `apps/api`, `packages/shared`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, owner-scoped urun yapisini koruyarak `berke` ve `kaan` tarafinda birbirinden tamamen bagimsiz urun kategori havuzlari olusturmaktir.

Hedef urun davranisi sunlardir:

- `berke` ve `kaan` kendi kategori listelerini ayri ayri yonetebilir
- ayni kategori adi iki farkli owner altinda kullanilabilir
- bir urun en fazla bir kategoriye atanabilir
- urun kategori secmeden de kaydedilebilir
- kategori olusturma, yeniden adlandirma, silme ve filtreleme owner-scoped calisir
- bir kategori silindiginde urunler silinmez; yalnizca kategorisiz kalir
- `berke` tarafindaki kategori islemleri `kaan` verisini hicbir sekilde etkilemez

Bu tasarim, mevcut owner-scoped urun izolasyonunu bozmadan urunleri daha esnek sekilde siniflandirmayi hedefler.

---

## 2. Mevcut durum ve tespitler

Kod tabani incelendiginde mevcut owner-scoped urun modeli bulunuyor, ancak kullanicinin elle yonettigi kategori kavrami henuz yok:

- `apps/api/src/db/schema.ts` icindeki `products` tablosunda `category` alani bulunuyor; bu alan kaynak urun verisinden gelen kategori bilgisini temsil ediyor gibi davraniyor.
- `apps/web/src/app/api.ts` icinde `ProductDetailResponse["product"].category` alani mevcut; bu da alanin halihazirda kaynak veri parcasi olarak kullanildigini gosteriyor.
- `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx` tarafinda arama ve favori gorunumu var, ancak owner-scoped kategori filtresi yok.
- `apps/web/src/features/tracking/components/TrackingFilters.tsx` su an yalnizca arama girisi sunuyor.
- owner-scoped urun listesi, cop kutusu, detay, favori ve silme akislari `apps/api/src/routes/owners.ts` altinda oturmus durumda; kategori davranisinin da bu baglama paralel eklenmesi gerekiyor.

Bu nedenle kullanici tanimli kategori ihtiyacini mevcut `products.category` alanina yikmak dogru degildir. Kaynak kategori ile kullanici kategorisini ayirmak gerekir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin asagidaki urun kararlari onaylandi:

- kategori listeleri owner-scoped olacak; `berke` ve `kaan` birbirinden bagimsiz calisacak
- kullanici istedigi kadar kategori olusturabilecek
- bir urun ayni anda yalnizca tek kategoriye atanabilecek
- urunler kategorisiz olarak da var olabilecek
- ilk iterasyonda kategori yalnizca duzenleme ve filtreleme amaciyla kullanilacak
- kategori silindiginde urunler sistemde kalacak, ancak ilgili kategori baglantisi temizlenecek
- kategori davranisi mevcut owner-scoped urun yapisini ihlal etmeyecek

Bu kapsamda kategori bazli raporlama, coklu kategori, ic ice kategori ve toplu kategori otomasyonu ilk iterasyona dahil degildir.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Mevcut `products.category` alanini kullanici kategorisi yapmak

Mevcut `products.category` alanini kaynak veri yerine elle yonetilen kategori alani gibi kullanmak.

**Artilari**
- ilk bakista hizli uygulanir
- ek tablo gerektirmez gibi gorunur

**Eksileri**
- kaynak kategori ile kullanici kategorisi birbirine karisir
- ileride iki ayri kategori bilgisini ayni anda gostermek zorlasir
- silme, yeniden adlandirma ve veri butunlugu davranislari kirilgan olur

### Yaklasim B - Ayrica `product_categories` tablosu ve urunde nullable kategori referansi (**secilen**)

Owner-scoped kategori listesi icin ayri tablo kullanmak ve urune opsiyonel bir kategori referansi eklemek.

**Artilari**
- owner izolasyonunu temiz sekilde korur
- kaynak kategori ile kullanici kategorisini ayirir
- kategori silme, yeniden adlandirma ve filtreleme davranisini guvenilir yapar
- gelecekte kategoriye yeni alanlar eklemeyi kolaylastirir

**Eksileri**
- migration, endpoint ve UI degisikligi gerektirir

### Yaklasim C - Owner bazli kategori listesini settings/JSON icinde tutmak

Kategori listesini ayri bir iliskisel tablo yerine owner bazli JSON yapilarinda saklamak ve urun uzerinde kategori adini text olarak tutmak.

**Artilari**
- orta hizda uygulanabilir
- ilk iterasyonda az sayida alanla calisabilir

**Eksileri**
- kategori adi degisince tum urun baglantilarini tutarli guncellemek zorlasir
- duplicate engeli ve iliski butunlugu zayif kalir
- silme ve yeniden adlandirma daha cok hata riski tasir

Secilen yaklasim: **Yaklasim B**.

---

## 5. Hedef veri modeli

### 5.1 Yeni kategori tablosu

Owner-scoped urun kategorileri icin yeni bir `product_categories` tablosu eklenecektir.

Onerilen alanlar:

- `id`
- `owner_key`
- `name`
- `created_at`
- `updated_at`

Temel kurallar:

- `owner_key` yalnizca mevcut owner contract'indaki degerlerden biri olabilir (`berke`, `kaan`)
- ayni kategori adi farkli owner'larda tekrar kullanilabilir
- ayni kategori adi ayni owner altinda yalnizca bir kez bulunabilir
- kategori adlari trimlenerek saklanir; bos veya yalnizca bosluklardan olusan adlar kabul edilmez

Bu tablo, owner-scoped urun izolasyonunun kategori seviyesinde de korunmasini saglar.

### 5.2 Products tablosuna kategori referansi

`products` tablosuna yeni bir opsiyonel alan eklenecektir:

- `user_category_id`

Kurallar:

- alan nullable olacak
- null ise urun kategorisiz kabul edilir
- dolu ise ilgili owner'a ait gecerli bir kategoriye isaret eder
- bir urun ayni anda yalnizca bir kategoriye baglanabilir

Bu yaklasimla mevcut `products.category` alani korunur; kaynak urun kategorisi ve kullanici kategorisi birbirinden ayrilmis olur.

### 5.3 Referential davranis

Kategori silindiginde urunlerin silinmemesi gerektigi icin asil davranis uygulama katmaninda kontrollu yurutulecektir:

- kategori silme islemi once ilgili owner ve kategori kaydini dogrular
- bu kategoriye bagli tum urunlerin `user_category_id` alani `null` yapilir
- sonra kategori kaydi silinir

Bu akisin tek transaction icinde calismasi gerekir. Boylece yari guncellenmis veri birakilmaz.

---

## 6. API ve backend sozlesmesi

Kategori islemleri de mevcut urun akislari gibi owner-scoped olacaktir.

### 6.1 Onerilen endpoint yonu

Kategori yonetimi:

- `GET /owners/:ownerKey/categories`
- `POST /owners/:ownerKey/categories`
- `PATCH /owners/:ownerKey/categories/:categoryId`
- `DELETE /owners/:ownerKey/categories/:categoryId`

Urune kategori atama:

- `PATCH /owners/:ownerKey/products/:productId/category`

Bu endpointler owner-scoped urun router yapisina uyumlu olacak sekilde `apps/api/src/routes/owners.ts` altina eklenmelidir.

### 6.2 Davranis kurallari

Tum endpointler su korumalara uymak zorundadir:

- gecersiz `ownerKey` -> `404 / Kayit bulunamadi`
- kategori yoksa -> `404 / Kayit bulunamadi`
- urun yoksa -> `404 / Kayit bulunamadi`
- kategori veya urun farkli owner'a aitse -> yine `404 / Kayit bulunamadi`
- bos kategori adi -> `400 / Kategori adi gerekli`
- ayni owner icinde duplicate kategori adi -> `409 / Bu kategori zaten mevcut`

### 6.3 Urune kategori atama davranisi

`PATCH /owners/:ownerKey/products/:productId/category` endpoint'i su davranisi saglar:

- gecerli `categoryId` verilirse urun ilgili kategoriye atanir
- `null` verilirse urun kategorisiz hale getirilir
- farkli owner'a ait kategori verilirse islem basarisiz olur

Bu endpoint yalnizca owner ile uyumlu urun + kategori eslesmelerine izin verir.

### 6.4 Urun listeleme filtresi

Mevcut `GET /owners/:ownerKey/products` akisi kategori filtresi de destekleyecek sekilde genisletilecektir.

Onerilen query davranisi:

- `categoryId=<id>` -> yalnizca ilgili kategorideki urunler
- `categoryId=uncategorized` -> yalnizca kategorisiz urunler
- parametre yok -> tum owner urunleri

Bu filtre mevcut arama, parse durumu ve favori filtreleriyle ayni owner baglami icinde birlikte calisabilir.

---

## 7. Web arayuzu tasarimi

Ilk iterasyonda ayri bir kategori sayfasi acmak yerine mevcut tracking akisi icinde dogal bir kategori deneyimi kurulacaktir.

### 7.1 Tracking ekraninda kategori filtresi

`apps/web/src/features/tracking/components/TrackingFilters.tsx` yalnizca arama alani sunuyor. Bu bilesen owner-scoped kategori filtresini de gosterecek sekilde genisletilecektir.

Onerilen filtre secenekleri:

- `Tumu`
- owner'a ait mevcut kategori listesi
- `Kategorisiz`

Kurallar:

- `berke` gorunumunde yalnizca `berke` kategorileri gosterilir
- `kaan` gorunumunde yalnizca `kaan` kategorileri gosterilir
- kategori secimi liste sorgusuna `categoryId` parametresi olarak yansitilir

### 7.2 Kategori yonetimi

Tracking ekraninda kategori filtresinin yakininda bir `Kategori Yonet` veya `Kategori Ekle` aksiyonu bulunur.

Bu aksiyon modal veya drawer gibi sayfadan kopmayan bir yonetim paneli acar. Ilk iterasyonda bu panel:

- kategori olusturma
- kategori yeniden adlandirma
- kategori silme

islemlerini destekler.

Ayrica ayri bir route acilmamasi, owner-scoped urun akisina hizli entegrasyon saglar.

### 7.3 Urune kategori atama

Kategori atama iki noktadan yapilabilir:

- urun karti uzerinden hizli atama
- urun detay ekranindan duzenleme

Ilk iterasyonda minimum kullanisli deneyim su sekilde kurulmalidir:

- urun kartinda mevcut kategori chip/badge olarak gorunur
- kullanici kart seviyesinde kategori secebilir veya kategoriyi kaldirabilir
- detay ekraninda da ayni kategori bilgisinin duzenlenebilir karsiligi bulunur

Bu sayede kullanici hem listeden hizli calisabilir hem detay sayfasinda kontrolu surdurebilir.

### 7.4 Gorsel prensipler

- kategori varsa urun uzerinde kucuk bir chip/badge ile gosterilir
- kategori yoksa ya `Kategorisiz` etiketi ya da sakin bir bos durum gosterilir
- kategori secme bileseni owner baglamini gizlice degil, dogrudan route'taki owner'a gore yukler

Bu yaklasim owner baglamini kullanicidan saklamaz ve yanlis owner verisini gostermeyi engeller.

---

## 8. Silme, guncelleme ve owner izolasyonu

### 8.1 Kategori silme

Kategori silme akisinin anlami sunlardir:

- kategori kaydi silinir
- kategoriye bagli urunler sistemde kalir
- bu urunler otomatik olarak kategorisiz olur

Bu davranis acikca onaylanmistir ve kategori silmenin veri kaybi dogurmamasi gerekir.

### 8.2 Kategori yeniden adlandirma

Kategori adi degistiginde:

- yalnizca ilgili kategori kaydi guncellenir
- bu kategoriye bagli urunlerde ek toplu text guncellemesi gerekmez
- urunler yeni adi dolayli olarak gormeye devam eder

Bu, iliskisel tasarimin JSON/text tabanli yaklasima gore buyuk avantajidir.

### 8.3 Owner izolasyonu

Temel kural sunlardir:

- `berke` kategorileri `kaan` urunlerine atanamaz
- `kaan` kategorileri `berke` filtrelerinde gorunemez
- kategori ID'si bilinse bile farkli owner baglaminda erisilemez

Bu nedenle kategoriye dair tum repository ve route sorgulari owner filtresi olmadan calistirilmamalidir.

---

## 9. Hata davranislari

Bu ozellikte hata mesaji dili teknik degil, sade urun diliyle kurulmalidir.

Beklenen davranislar:

- gecersiz owner -> `Kayit bulunamadi`
- owner ile uyusmayan kategori/product -> `Kayit bulunamadi`
- bos kategori adi -> `Kategori adi gerekli`
- duplicate kategori adi -> `Bu kategori zaten mevcut`
- silinmis veya bulunamayan kategori -> `Kayit bulunamadi`

Guvenlik ve veri izolasyonu acisindan en onemli kural sunlardir:

- farkli owner'a ait veri `yetki yok` gibi ayristirici hata yerine `bulunamadi` davranisiyla kapatilir
- kategori ve urun ID'leri owner filtresi olmadan asla tek basina anlamli kabul edilmez

---

## 10. Test stratejisi

### 10.1 Backend / repository testleri

Asagidaki senaryolar zorunlu kabul edilmelidir:

- ayni kategori adinin `berke` ve `kaan` altinda ayri ayri olusabilmesi
- ayni owner altinda duplicate kategori adinin engellenmesi
- urunun kategoriye atanabilmesi
- urunun kategorisiz hale getirilebilmesi
- kategori silindiginde bagli urunlerin `user_category_id` alaninin `null` olmasi
- bir owner kategorisinin diger owner urunune atanamamasi

### 10.2 API testleri

- owner mismatch durumunda `404`
- bos kategori adi icin `400`
- duplicate kategori adi icin `409`
- `categoryId=uncategorized` filtresinin dogru sonucu donmesi
- kategori filtresinin yalnizca secili owner urunlerini etkilemesi

### 10.3 Web / UI testleri

- `berke` ekraninda yalnizca `berke` kategorilerinin listelenmesi
- `kaan` ekraninda yalnizca `kaan` kategorilerinin listelenmesi
- kategori olusturma / yeniden adlandirma / silme akislarinin calismasi
- urun karti veya detay ekranindan kategori atamanin calismasi
- kategori filtresi degistiginde listenin dogru daralmasi
- kategori silindiginde urunun kaybolmayip kategorisiz gorunmesi

### 10.4 Regresyon testleri

- mevcut owner-scoped urun liste akisinin bozulmamasi
- urun detay ve cop kutusu akislarinin kategori eklenince calismaya devam etmesi
- mevcut `products.category` kaynak alaninin davranisinin bozulmamasi

---

## 11. Kapsam disi notlar

Bu iterasyonda asagidakiler dahil degildir:

- coklu kategori atama
- kategori bazli sayac/istatistik panosu
- kategori rengi, ikonu veya siralama meta verisi
- ic ice kategori hiyerarsisi
- toplu kategori duzenleme
- global ortak kategori havuzu

Bu iterasyonun hedefi, owner-scoped urun yapisini bozmadan basit, guvenilir ve genisleyebilir bir kategori altyapisi kurmaktir.

---

## 12. Nihai tasarim ozeti

Secilen tasarim su sekildedir:

- owner-scoped yeni `product_categories` tablosu eklenecek
- `products` tablosuna nullable `user_category_id` alani gelecek
- urun en fazla bir kategoriye atanabilecek
- kategori atamasi opsiyonel olacak
- kategori silindiginde urunler silinmeyecek, kategorisiz kalacak
- kategori listeleme ve yonetimi tamamen owner-scoped calisacak
- tracking ekranina kategori filtresi, kategori yonetimi ve urune kategori atama deneyimi eklenecek
- mevcut kaynak `products.category` alani ile kullanici tanimli kategori birbirinden ayrilacak

Bu tasarim, mevcut owner-scoped urun modeline en az kavramsal surtunmeyle oturur ve ileride kategori davranisini buyutmek icin temiz bir temel saglar.
