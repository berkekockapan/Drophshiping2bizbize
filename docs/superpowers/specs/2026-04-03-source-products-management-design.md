# Source Products Kategori, Cop Kutusu ve Siralama Tasarimi

**Tarih:** 2026-04-03  
**Durum:** Tasarim onaylandi, planlama oncesi kullanici review bekleniyor  
**Kapsam:** `apps/web`, `apps/api`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, `Kaynak Urunler` alanindaki kartlar icin urunler sayfasindaki kategori mantigina benzeyen ama veri olarak tamamen ayrik bir yonetim modeli kurmaktir.

Hedef davranis sunlardir:

- kaynak urun kartlari cop kutusuna tasinabilmelidir
- kaynak urunler icin ayri bir kategori havuzu olmalidir
- kategori olusturma, yeniden adlandirma, silme ve filtreleme davranisi urunler sayfasiyla ayni hissetmelidir
- kaynak urunler ayni kategori icinde surukle-birak ile yeniden siralanabilmelidir
- surukle-birak baska kategoriye tasima amaciyla kullanilmayacaktir
- mevcut `Urunler` ekrani ve onun kategori yapisi hicbir sekilde bozulmayacaktir

Bu tasarim, `source-products` alanini urun takibinden bagimsiz bir yonetim havuzu haline getirirken mevcut takip akisina regresyon tasimama hedefini merkezde tutar.

---

## 2. Onaylanan urun kararlari

Bu tasarim icin asagidaki kararlar kullanici tarafindan onaylandi:

- kategori havuzu `Urunler` sayfasindaki kategori havuzundan ayri olacak
- davranis mantigi `Urunler` sayfasindaki kategori deneyimi ile ayni olacak
- silme davranisi kalici silme degil, cop kutusuna tasima olacak
- surukle-birak sadece urunun bulundugu kategori icindeki siralamayi degistirecek
- surukle-birak ile kategori degistirme olmayacak
- kategori degisikligi acik secim alani ile yapilacak
- `Kaynak Urunler` listesi kategori bazli bolumler halinde gosterilecek
- bu is mevcut `products`, `product_categories` ve takip ekraninin davranisini bozmadan uygulanacak

Kapsam disinda kalanlar:

- coklu kategori atama
- ic ice kategori yapisi
- kategoriler arasi drag ile tasima
- source-products icin ortak kategori havuzu kullanimi
- source-products ile tracking urunlerini ayni listeye birlestirme

---

## 3. Mevcut durum ve tespitler

Calisan deploy uzerindeki `source-products` akisi incelendiginde su yapilar tespit edilmistir:

- ayri bir route vardir: `/owners/:ownerKey/source-products`
- ayri bir detay route'u vardir: `/owners/:ownerKey/source-products/:sourceProductId`
- liste ekraninda kaynak baslik, kaynak link, platform ve not alanlariyla ayri bir ekleme formu bulunur
- liste ekraninda arama davranisi vardir
- detay ekraninda kaynak link, platform, not ve bagli Etsy linkleri yonetilmektedir
- source-products query key'leri tracking query key'lerinden ayridir

Mevcut urun takip sistemi ise baska bir veri modeline baglidir:

- `products.user_category_id` alani tracking urunlerinin kategori baglantisini tutar
- `product_categories` tablosu tracking urunleri icin owner-scoped kategori havuzu saglar
- `DELETE /owners/:ownerKey/products/:productId` davranisi urunu cop kutusuna tasir
- tracking listesi otomatik siralanir; kullanici tarafli manuel siralama yoktur

Buradaki kritik sonuc sunlardir:

- `source-products` alanina yeni kategori veya siralama davranisini mevcut `products` alanlarina yazarak eklemek dogru degildir
- source-products icin ayri kategori ve siralama modeli gerekir
- mevcut tracking kategori yapisina dokunmak bu kapsam icin gereksiz ve risklidir

Ek tespit:

- calisan deploy bundle'inda `source-products` feature acik sekilde gorunmektedir
- buna karsin ilgili source dosyalari mevcut checkout icinde gorunmemektedir
- bu nedenle tasarim, calisan davranis ve deploy bundle incelemesine dayanarak hazirlanmistir
- implementasyon asamasinda once ilgili source branch veya dosyalarin bu checkout ile hizalanmasi gerekebilir

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Source-products alanini tracking veri modeli uzerine baglamak

Kaynak urun kategorilerini ve cop kutusu davranisini mevcut `product_categories`, `products.user_category_id` ve tracking servis akislari uzerinden cozmeye calismak.

**Artilari**

- ilk bakista mevcut yapiyi yeniden kullanir gibi gorunur
- benzer davranislar icin daha az yeni tablo hissi yaratir

**Eksileri**

- tracking sistemi ile source-products sistemi birbirine gereksiz baglanir
- mevcut calisan urunler ekrani icin regresyon riski tasir
- source-products tarafinin kendi kavramlari urun takip modeli icinde sikisir
- ileride iki alanin farkli evrilmesini zorlastirir

### Yaklasim B - Source-products icin tamamen ayrik kategori, siralama ve cop kutusu modeli kurmak (**secilen**)

Kaynak urunlere ait kategori, siralama ve silme davranisini ayri tablo/alan ve ayri endpointler uzerinden tasimak.

**Artilari**

- mevcut tracking ekranina dokunmadan source-products davranisini genisletir
- kullanicinin istedigi "ayri kategori havuzu" kararina dogrudan uyar
- siralama ve cop kutusu davranisi source-products ihtiyacina gore ozellesebilir
- ileride source-products icin ek metadata eklemek kolaylasir

**Eksileri**

- yeni migration ve yeni endpointler gerektirir
- urunler sayfasindaki mantigin kontrollu bicimde ikinci kez kurulmasi gerekir

### Yaklasim C - Siralama ve kategoriyi istemci tarafinda gecici olarak tutmak

Kategori ve siralama bilgisini local state veya local storage ile yonetmek; backend tarafina minimum degisiklik yapmak.

**Artilari**

- hizli bir gorunur prototip uretebilir
- backend degisikligi az olur

**Eksileri**

- kalici veri butunlugu saglanmaz
- sayfa yenilemede veya farkli cihazda durum kaybolur
- cop kutusu ve detay akislariyla tutarsizlik olusur
- kullanicinin yonetim beklentisini gercekten karsilamaz

Secilen yaklasim: **Yaklasim B**.

---

## 5. Hedef veri modeli

### 5.1 Source products tablosuna yeni alanlar

Source-products kayitlari uzerinde asagidaki yonetim alanlari bulunmalidir:

- `source_category_id` nullable
- `sort_order` nullable veya integer
- `deleted_at` nullable timestamp
- `deleted_reason` nullable text
- `updated_at` mevcut degilse eklenmeli

Kurallar:

- `source_category_id = null` ise urun kategorisizdir
- `sort_order` ayni kategori icindeki kalici gorunum sirasini temsil eder
- `deleted_at != null` ise urun aktif listede gosterilmez, source-products cop kutusunda gorunur

### 5.2 Yeni source kategori tablosu

Tracking kategorilerinden ayri bir tablo gereklidir.

Onerilen tablo: `source_product_categories`

Alanlar:

- `id`
- `owner_key`
- `name`
- `created_at`
- `updated_at`

Kurallar:

- kategori owner-scoped calisir
- ayni owner altinda duplicate kategori adi kabul edilmez
- farkli owner'larda ayni isim kullanilabilir
- kategori silindiginde bagli source-products kayitlari silinmez; `source_category_id = null` olur

### 5.3 Siralama kurali

`sort_order` sadece ayni kategori icinde anlamlidir.

Davranis:

- yeni eklenen urun kategorisiz listenin sonuna eklenir
- kategori degistirilen urun hedef kategorinin sonuna eklenir
- drag ile birakma sonrasi ayni kategori icindeki tum kartlarin `sort_order` degerleri yeniden yazilir
- kategoriler arasi global tek sira tutulmaz

### 5.4 Cop kutusu davranisi

Source-products icin silme davranisi soft-delete olacaktir.

Kurallar:

- liste ekranindaki `Sil` aksiyonu urunu kalici silmez
- kayit `deleted_at` ile isaretlenir
- geri yukleme aksiyonu `deleted_at` alanini temizler
- kategori silinmisse geri yuklenen urun `Kategorisiz` olarak doner
- kalici silme ayri bir source-products trash aksiyonundan yapilir

---

## 6. API ve backend tasarimi

### 6.1 Listeleme

Source-products liste endpoint'i mevcut yapisini koruyarak asagidaki filtreleri desteklemelidir:

- `search`
- `categoryId`
- gerekirse `categoryId=uncategorized`

Varsayilan davranis:

- sadece `deleted_at is null` kayitlar doner
- sonuc seti kategori bazli render edilmese bile istemci kategori alanina gore bolumleyebilir
- backend varsayilan olarak `category`, sonra `sort_order`, sonra `created_at` mantigiyla stabil veri dondurmelidir

### 6.2 Source kategori endpointleri

Tracking kategorilerine benzer ama ayrik endpoint seti gerekir.

Onerilen yon:

- `GET /owners/:ownerKey/source-product-categories`
- `POST /owners/:ownerKey/source-product-categories`
- `PATCH /owners/:ownerKey/source-product-categories/:categoryId`
- `DELETE /owners/:ownerKey/source-product-categories/:categoryId`

Davranis:

- gecersiz owner veya kategori -> `404`
- bos isim -> `400`
- duplicate isim -> `409`
- silme oncesi bagli source-products kayitlarinin `source_category_id` alani `null` yapilir

### 6.3 Source urune kategori atama

Acik kategori degisimi icin ayri bir endpoint gerekir.

Onerilen sozlesme:

- `PATCH /owners/:ownerKey/source-products/:sourceProductId/category`

Body:

- `{ "categoryId": "<id>" }`
- veya kategorisiz yapmak icin `{ "categoryId": null }`

Davranis:

- hedef kategori ayni owner'a ait olmalidir
- kategori degistiginde source urun hedef kategorinin son sirasina tasinir

### 6.4 Siralama endpoint'i

Kategori ici drag davranisi icin ayri bir reorder endpoint gerekir.

Onerilen sozlesme:

- `PATCH /owners/:ownerKey/source-products/reorder`

Body:

- `categoryId`
- `orderedIds: string[]`

Kurallar:

- istek yalnizca ayni kategoriye ait aktif kayitlari kabul eder
- baska kategoriye ait ya da soft-deleted kayitlar gelirse istek reddedilir
- backend verilen siraya gore ilgili kayitlarin `sort_order` alanlarini transaction icinde gunceller

Bu endpoint bilincli olarak kategoriler arasi tasimayi desteklemez.

### 6.5 Cop kutusu endpointleri

Source-products icin ayri trash davranisi gereklidir.

Onerilen yon:

- `GET /owners/:ownerKey/source-products/trash`
- `POST /owners/:ownerKey/source-products/:sourceProductId/restore`
- `DELETE /owners/:ownerKey/source-products/:sourceProductId/permanent`

Ayrica liste ekranindaki silme icin:

- `DELETE /owners/:ownerKey/source-products/:sourceProductId`

Davranis:

- `DELETE` aktif listeden trash'e tasir
- `restore` kaydi geri getirir
- `permanent` kaydi kalici olarak siler

### 6.6 Detay ekranina etkisi

Mevcut source-product detail endpoint'i yeni alanlari da donmelidir:

- `sourceCategory`
- `sortOrder`
- `deletedAt`

Ama detay ekranindaki bagli Etsy link yonetimi davranisi aynen korunmalidir.

---

## 7. Web arayuzu tasarimi

### 7.1 Liste yapisi

`Kaynak Urunler` ekraninin ana liste alani kategori bazli bolumlere donusturulecektir.

Davranis:

- secili filtre yoksa tum kategoriler kendi bolum basliklariyla alt alta gorunur
- `Kategorisiz` her zaman acik bir bolum olarak bulunur
- kategori filtresi secilirse yalnizca ilgili bolum gosterilir
- arama aktifken sadece eslesen kartlar ilgili bolumler icinde kalir; bos kalan bolumler gizlenir

### 7.2 Kart aksiyonlari

Her kaynak urun kartinda asagidaki temel aksiyonlar bulunur:

- `Kategori sec`
- `Sil`
- `Detaya git`

Ek olarak kartta bir `drag handle` yer alir.

Kurallar:

- sadece handle uzerinden surukleme baslar
- tum karti draggable yapmak tercih edilmez
- kartin ana tiklama/detay gecisi davranisi korunur

### 7.3 Kategori deneyimi

Kategori davranisi `Urunler` sayfasiyla ayni kalipta olur:

- ust alanda kategori filtresi bulunur
- `Kategori yonet` aksiyonu ayrik bir modal acar
- modal icinde kategori olusturma, yeniden adlandirma ve silme aksiyonlari vardir
- source-products kategorileri tracking kategorilerinden ayri listelenir

### 7.4 Surukle-birak davranisi

Drag and drop yalnizca ayni kategori icinde calisir.

Davranis:

- kullanici bir karti kendi kategori bolumu icinde tasir
- birakildiginda yeni sira aninda ekrana yansir
- sonra reorder istegi gonderilir
- baska kategori bolumune tasima desteklenmez
- baska bolume suruklenirse birakma hedefi gecersiz gorunur ve tasima tamamlanmaz

### 7.5 Cop kutusu gorunumu

Source-products icin ayri bir trash gorunumu bulunmalidir.

Onerilen UX:

- ya ayri route: `/owners/:ownerKey/source-products/trash`
- ya da source-products sayfasi icinde ayrik bir gorunum sekmesi

Benim onerim ayri route'dur; cunku mevcut tracking trash mantigina daha yakin, zihinsel modeli daha temizdir.

Cop kutusunda su aksiyonlar olur:

- `Geri Yukle`
- `Kalici Sil`

### 7.6 Mobil ve responsive davranis

- kategori bolumleri mobilde alt alta devam eder
- kart aksiyonlari ikinci satira dusebilir
- drag handle mobilde de gorunur ama yanlis dokunuslari azaltmak icin alan yeterince buyuk tutulur

---

## 8. Akis davranislari

### 8.1 Yeni kaynak urun ekleme

- yeni urun varsayilan olarak `Kategorisiz` bolumune eklenir
- `sort_order` hedef listenin sonuna verilir
- aktif filtre bir kategoriye kilitliyse yeni urun filtreye uymuyorsa ana listede hemen gorunmeyebilir

### 8.2 Kategori degistirme

- dropdown ile kategori degisikligi acikca yapilir
- urun hedef kategori bolumunun sonuna dusurulur
- eski kategorideki sira kalan urunler icin yeniden normalize edilir

### 8.3 Silme

- `Sil` aksiyonu once onay ister
- onay sonrasi urun trash'e tasinir
- aktif listeden hemen kalkar
- trash listesinde gorunur

### 8.4 Geri yukleme

- urun silinmeden onceki kategorisine geri donmeye calisir
- ilgili kategori artik yoksa `Kategorisiz` olur
- onceki `sort_order` mutlak olarak korunmak zorunda degildir; hedef listenin sonuna eklenmesi kabul edilebilir

### 8.5 Kategori silme

- kategori kaydi silinir
- o kategoriye bagli source urunler `Kategorisiz` bolumune dusurulur
- urunler yasamaya devam eder

---

## 9. Hata yonetimi ve veri butunlugu

### 9.1 Optimistic update siniri

UI tarafinda asagidaki davranis uygundur:

- drag sonrasi sira degisikligi optimistik gosterilebilir
- kategori degisikligi ve silme aksiyonu da optimistik gosterilebilir

Ancak:

- backend hata verirse liste son dogrulanmis duruma geri alinmalidir
- kullaniciya acik hata mesaji gosterilmelidir

### 9.2 Hata mesajlari

Onerilen mesaj siniflari:

- `Kaynak urunler yuklenemedi`
- `Kategori kaydedilemedi`
- `Kategori silinemedi`
- `Kaynak urun cop kutusuna tasinamadi`
- `Siralama kaydedilemedi`
- `Kaynak urun geri yuklenemedi`

### 9.3 Veri butunlugu kurallari

- reorder istegi ayni kategori disindaki kayitlari kabul etmez
- silinmis kayitlar aktif liste reorder akisina dahil edilmez
- kategori silme ve bagli kayit temizleme islemi transaction icinde calismalidir
- restore akisi gecersiz kategori referansi birakmamalidir

---

## 10. Test kapsami

### 10.1 API / integration testleri

- source kategori olusturma, rename ve silme
- kategori silinince bagli source urunlerin kategorisiz kalmasi
- source urun silme -> trash'e tasima
- restore davranisi
- kalici silme davranisi
- reorder endpoint'inin yalnizca ayni kategori icindeki kayitlari kabul etmesi
- kategori degisince urunun hedef kategorinin sonuna gitmesi

### 10.2 Web testleri

- kategori bolumlerinin dogru render edilmesi
- filtre secimlerinin dogru bolumu gostermesi
- arama sonucunda bos bolumlerin gizlenmesi
- kategori secimi ile urunun baska kategoriye alinmasi
- silme onayi ve listeden kaybolma
- drag handle ile ayni kategori icinde sira degisimi
- reorder hatasinda rollback davranisi

### 10.3 Regresyon testleri

Asagidaki alanlarin kirilmadigi dogrulanmalidir:

- `Urunler` ekranindaki mevcut kategori davranisi
- tracking trash davranisi
- source-products detay ekranindaki Etsy link yonetimi
- mevcut source-products ekleme ve arama davranisi

---

## 11. Riskler ve uygulama notlari

- En buyuk teknik risk, calisan `source-products` feature source dosyalarinin mevcut checkout'ta gorunmemesidir.
- Bu nedenle implementasyon oncesi ilgili branch veya dosya setinin bu checkout ile eslenmesi gerekebilir.
- Kod bulunmadan tracking feature icinden kopyala-yapistir tarzinda uygulama yapmak dogru degildir; once gercek source-products source modulu bulunmalidir.
- Bu tasarim, veri modeli ve davranis sinirlarini netlestirir; implementasyon plani bu on kosulu acikca icermelidir.

---

## 12. Sonuc

Onaylanan tasarim sunu hedefler:

- `Kaynak Urunler` icin tracking ekranina benzeyen ama veri olarak tamamen ayrik bir kategori ve cop kutusu modeli
- kategori bazli bolumlenmis liste
- ayni kategori icinde kalici drag-and-drop siralama
- acik kategori atama aksiyonu
- mevcut `Urunler` sistemine sifir davranis regresyonu

Bu tasarim, kullanicinin istedigi yonetim kabiliyetlerini source-products alanina tasirken mevcut tracking sistemini bozmadan ilerlemek icin en guvenli sinirlari cizer.
