# Sahip Bazli Urun Alanlari ve Ortak AI Saglayicilari Tasarimi

**Tarih:** 2026-03-27  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, `apps/api`, `packages/shared`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, mevcut tek kullanicili urun takip panelini iki sabit kisi (`berke` ve `kaan`) icin karismayan, veri kaybi riskini azaltan ve ayni Trendyol linkini iki tarafta da bagimsiz yasatabilen bir yapiya donusturmektir.

Ayni iterasyonda `AI Baglantilari` ekrani da masaustu OpenAI oturum yonetimi odagindan cikarilip, ortak kullanilan ve API anahtari bazli calisan bir saglayici yonetim ekranina donusturulecektir.

Bu tasarimin hedef urun davranisi sunlardir:

- sol menude `Urunler` altinda `Berke` ve `Kaan` alt basliklari gorunur
- hangi alt basliga tiklanirsa sadece o kisinin urun alani acilir
- ayni Trendyol linki hem Berke hem Kaan tarafinda bulunabilir
- iki tarafin urunleri, stoklari, gecmisleri, bildirimleri ve cop kutulari tamamen bagimsiz calisir
- bir tarafta silinen kayit diger tarafta etkilenmez
- ilk silme cop kutusuna tasir, cop kutusundan ikinci silme kalici siler
- cop kutusundan geri yukleme kaydi silindigi kisinin alanina geri koyar
- `AI Baglantilari` ekraninda OpenAI, OpenRouter ve Google icin API bilgileri kaydedilebilir
- birden fazla saglayici kayitli durabilir ama ayni anda yalnizca bir saglayici aktif olur
- baslik ve kritik alanlarin yaninda kisa aciklayici soru isareti popup'lari bulunur

---

## 2. Mevcut durum ve tespitler

Kod tabani incelendiginde mevcut sistemin tek kullanici varsayimiyla calistigi goruluyor:

- `apps/web/src/app/shell/AppShell.tsx` sol menude yalnizca tek bir `Urunler` girisi tasiyor; kisi veya workspace alt ayrimi yok.
- `apps/web/src/app/router.tsx` urun, detay ve bildirim akislarini sahip baglamindan bagimsiz rotalarla aciyor.
- `apps/api/src/db/schema.ts` icindeki `products` tablosu `trendyol_url` alanini global olarak unique kabul ediyor; bu nedenle ayni linkin iki farkli kisi icin ayri kayit olmasi bugunku modelde mumkun degil.
- `products`, `product_variants`, `product_current_state`, `notifications`, `etsy_drafts` ve ilgili gecmis tablolari tek urun havuzu varsayimina dayaniyor.
- `apps/api/src/routes/tracking.ts` ve bagli tracking modulleri urun sorgularini kisi baglami olmadan calistiriyor.
- `apps/web/src/features/connections/routes/AIConnectionsPage.tsx` ve ilgili hook/bilesenler, ortak API anahtari girisi yerine desktop OpenAI oturumu/OAuth akisi odakli calisiyor.
- `apps/api/src/db/repositories/settingsRepo.ts` ve `apps/api/src/routes/settings.ts` su an yalnizca hedef URL ve benzeri teknik alanlari sakliyor; coklu saglayici ve tek aktif saglayici modeli yok.

Bu nedenle ihtiyac yalnizca menude iki isim gostermek degildir. Veri modeli, backend sorgulari, rotalama, silme/geri yukleme davranisi ve AI ayar depolama modeli birlikte ele alinmalidir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin asagidaki urun kararlari onaylandi:

- Kullanici hesabi, sifre veya giris sistemi eklenmeyecek.
- Uygulamada sabit iki kisi/workspace olacak: `berke` ve `kaan`.
- Sol menude `Urunler` altinda child baslik olarak `Berke` ve `Kaan` gosterilecek.
- Ayni Trendyol linki iki tarafta da bulunabilecek.
- Ayni link Berke ve Kaan tarafinda bulunsa bile iki kayit birbirinden tamamen bagimsiz davranacak.
- Bir tarafta yapilan silme, favori, detay, bildirim veya gecmis islemi diger tarafi etkilemeyecek.
- Ilk silme aksiyonu her zaman onay soracak ve kalici silme yerine cop kutusuna tasiyacak.
- Cop kutusundan ikinci silme kalici silme olacak.
- Geri yuklenen kayit, silindigi workspace'e otomatik donecek.
- Urunle ilgili her alan sahip bazli olacak: liste, detay, bildirimler, cop kutusu, gecmis ve ilgili veri gorunumleri.
- Mevcut veriler kritik degil; gecis sirasinda temizlenebilmeleri kabul edildi.
- `AI Baglantilari` ortak olacak; kisiye ozel olmayacak.
- OpenAI, OpenRouter ve Google saglayicilari kaydedilebilir olacak.
- Birden fazla saglayici kaydi tutulabilecek, ancak ayni anda yalnizca bir saglayici aktif secilecek.
- Ekrandaki basliklarin ve kritik alanlarin yaninda kolay anlasilir yardim popup'lari bulunacak.

Ek netlestirme:

- Ayni link ayni workspace icinde ayni anda ikinci aktif kayit olarak olusturulmayacak.
- Kullanici ayni linki ayni workspace icinde yeniden eklemeye calisirsa sistem ya "zaten mevcut" diyecek ya da kayit cop kutusundaysa geri yukleme onerecek.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Yalnizca arayuz filtreleme

Sol menude `Berke` ve `Kaan` gostermek, ama altta veri tabanini buyuk olcude ortak birakmak.

**Artilari**
- hizli gorunen cozum
- sinirli UI degisikligi

**Eksileri**
- veri karisma riski yuksek kalir
- ayni linkin iki tarafta bagimsiz yasamasi kirilgan olur
- silme, cop kutusu ve gecmis izolasyonu guvenilir kurulamaz

### Yaklasim B - Sabit iki workspace ve sahip bazli urun modeli (**secilen**)

Urun tarafini `berke` ve `kaan` olmak uzere iki sabit workspace'e ayirmak; urunle ilgili her akisi bu baglamda calistirmak; AI baglantilarini ise ortak provider registry olarak yeniden tasarlamak.

**Artilari**
- ihtiyaci dogrudan karsilar
- ayni linkin iki tarafta bagimsiz olmasini temiz sekilde cozer
- cop kutusu, restore ve bildirim izolasyonu netlesir
- bugunku uygulama boyutuna uygun kalir

**Eksileri**
- veri modeli ve route katmaninda kapsamli degisiklik gerektirir

### Yaklasim C - Genel amacli tam multi-tenant mimari

Sinirsiz sayida kullanici/workspace destekleyen genel bir tenant altyapisi kurmak.

**Artilari**
- gelecege en acik cozum

**Eksileri**
- mevcut ihtiyac icin fazla buyuk
- gereksiz mimari ve uygulama maliyeti getirir

Secilen yaklasim: **Yaklasim B**.

---

## 5. Hedef urun modeli

Urun tarafi uygulama genelinde iki sabit workspace ile calisacaktir:

- `berke`
- `kaan`

Bu workspace'ler bir kullanici hesabina degil, uygulama icindeki secili sahip baglamina karsilik gelir. Uygulamadaki urunle ilgili her islem once bir workspace secimi gerektirir; sorgular, detay ekranlari, silme ve geri yukleme davranisi bu secili baglam uzerinden yurutulur.

Temel kural sunlardir:

- urunun asil kimligi yalnizca link degil, `workspace + urun kaydi` birlesimidir
- ayni Trendyol linki iki farkli workspace'te ayri kayit olarak bulunabilir
- her kaydin kendi `productId` degeri, kendi stok ozeti, kendi bildirimleri ve kendi gecmisi olur
- bir workspace'te silinen urun, diger workspace'teki es kaydi etkilemez

Bu model "iki ayri filtre" degil, "iki ayri sahip alani" mantigidir.

---

## 6. Gezinme ve route tasarimi

### 6.1 Sol menu

`Urunler` artik tiklanan tek baglanti degil, acilabilir bir ust baslik olacaktir.

Altinda iki sabit child oge bulunur:

- `Berke`
- `Kaan`

`AI Baglantilari` ve `Ayarlar` uygulama seviyesinde ortak kalir.

`Bildirimler` urunle ilgili oldugu icin sahip baglamindan bagimsiz global bir havuz olarak calismayacaktir. Bunun yerine bildirim gorunumu de owner-scoped route ile acilacak ve menu davranisi mevcut/son secili owner baglamina gore yonlendirilecektir.

### 6.2 Owner-scoped route deseni

Urunle ilgili sayfalar owner bilgisi tasiyan rotalara alinacaktir. Onerilen desen:

- `/owners/:ownerKey/products`
- `/owners/:ownerKey/products/:productId`
- `/owners/:ownerKey/products/:productId/seo`
- `/owners/:ownerKey/notifications`
- `/owners/:ownerKey/trash`

Burada `ownerKey` yalnizca `berke` veya `kaan` olabilir.

`AI Baglantilari` ve `Ayarlar` owner-scoped degildir:

- `/connections`
- `/settings`

### 6.3 Baglam koruma kurali

Bir urun detayi veya ilgili alt akis acildiginda, route uzerindeki `ownerKey` her zaman korunur. Sistem:

- URL'deki owner ile urunun gercek sahibi uyusmuyorsa `404 / bulunamadi` davranisi verir
- farkli owner altindaki ayni linke yanlislikla gecis yapmaz
- geri donuste kullaniciyi dogru owner listesinin icine tasir

Bu sayede kullanici her zaman hangi tarafa baktigini net bicimde gorur.

---

## 7. Veri modeli tasarimi

### 7.1 Owner sozlugu

Tam multi-tenant yapi yerine sabit owner sozlugu kullanilacaktir.

Uygulama seviyesinde bir ortak owner contract'i tanimlanir:

- `berke` -> `Berke`
- `kaan` -> `Kaan`

Bu bilgi `packages/shared` altinda ortak schema/contract olarak tutulur. Gerekirse DB tarafinda da kucuk bir sabit `owners` tablosu veya ayni etkiyi veren seeded referans yapisi kullanilarak yazim hatalari ve gecersiz owner degerleri engellenir.

### 7.2 Products tablosu

`products` tablosu owner-scoped hale getirilecektir. Onerilen yeni alanlar:

- `owner_key` (`berke` | `kaan`) - zorunlu
- `deleted_at` - null ise aktif, dolu ise cop kutusunda
- `deleted_reason` - istege bagli sistem/aciklama alani

Mevcut global unique `trendyol_url` kuralinin yerine owner-scoped unique kural gelir:

- `unique(owner_key, trendyol_url)` kurali yalnizca `deleted_at is null` olan aktif kayitlara uygulanir

Boylece:

- ayni link `berke` ve `kaan` tarafinda ayri ayri bulunabilir
- ayni link ayni owner altinda ikinci aktif kayit olarak acilamaz

### 7.3 Iliskili tablolar

Asagidaki urun bagimli veriler product kaydi uzerinden owner'a baglanmaya devam eder:

- `product_variants`
- `product_current_state`
- `price_history`
- `stock_history`
- `product_refresh_audits`
- `product_content_history`
- `etsy_drafts`

Asagidaki owner-scoped sorgular icin owner bilgisi ya dogrudan tabloya eklenir ya da sorgu her zaman `products` ile join edilerek owner'a sabitlenir:

- `notifications`
- `manual_refresh_runs`
- `manual_refresh_run_items`

Tercih edilen kural sunlardir:

- urunle iliskili her kritik sorgu owner filtresi olmadan calistirilmaz
- owner bilgisi kayit olusturma aninda belirlenir ve sonradan degistirilmez
- urun id'si global unique kalsa bile sorgu kontrati owner + productId uyumu arar

### 7.4 Cop kutusu modeli

Ayrica ayri bir "trash products" tablosu yerine ilk iterasyonda soft-delete tercih edilir.

Yani:

- aktif urun -> `deleted_at = null`
- cop kutusundaki urun -> `deleted_at != null`

Bu secim sunlari saglar:

- geri yukleme kolay olur
- urune bagli varyant/gecmis/bildirim kayitlari kaybolmaz
- silindigi owner bilgisi dogal olarak korunur

### 7.5 Kalici silme

Cop kutusundan ikinci silmede urun ve ona bagli tum iliskili kayitlar tek transaction icinde fiziksel olarak silinir.

Bu davranisin anlami:

- cop kutusu bir guvenlik katmanidir
- kalici silme ise gercekten yok etme davranisidir

---

## 8. Urun akislarinin davranisi

### 8.1 Liste ekranlari

`Berke` veya `Kaan` listesini actiginda kullanici yalnizca secili owner'a ait aktif urunleri gorur.

Liste ozeti, filtreler, favoriler ve toplu yenileme gibi davranislar da owner-scoped calisir. Ornegin:

- Berke tarafinda "Tum urunleri yenile" denirse yalnizca Berke urunleri yenilenir
- Kaan tarafindaki favori degisikligi sadece Kaan kaydina uygulanir

### 8.2 Urun ekleme

Bir urun eklenirken istek owner baglami ile gelir.

Kurallar:

- ayni link diger owner'da varsa eklemeye engel degildir
- ayni link ayni owner'da aktif kayit olarak varsa ikinci kez eklenemez
- ayni link ayni owner'da cop kutusundaysa sistem yeni kayit acmak yerine geri yukleme onerir

### 8.3 Detay ekranlari

Detay sayfasi secili owner baglamiyla acilir ve:

- yalnizca o kaydin stok/fiyat/gecmis verisini gosterir
- diger owner'daki es link kaydi varsa bile onu gostermez
- route mismatch durumunda veriyi "yanlis owner'da" acmaz

### 8.4 Bildirimler

Bildirimler de owner-scoped olacaktir.

Bu nedenle:

- Berke'nin bildirimleri yalnizca Berke urunlerinden uretilir
- Kaan'in bildirimleri yalnizca Kaan urunlerinden uretilir
- ayni link iki tarafta da olsa bildirimler iki ayri kayit zinciri olarak yasar

### 8.5 Gecmis ve degisim zamani

Fiyat/stok/content timeline kayitlari product kaydina bagli kalir. Bu sayede ayni link iki tarafta olsa bile:

- Berke'nin timeline'i sadece Berke kaydindan dogar
- Kaan'in timeline'i sadece Kaan kaydindan dogar

---

## 9. Silme, cop kutusu ve geri yukleme akisi

### 9.1 Ilk silme

Liste veya detay ekraninda `Sil` aksiyonu secildiginde sistem acik bir onay sorar.

Onay verilirse:

- kayit fiziksel olarak silinmez
- `deleted_at` doldurulur
- kayit ilgili owner'in cop kutusuna tasinir

### 9.2 Cop kutusu gorunumu

Her owner icin ayri bir cop kutusu vardir.

Kurallar:

- Berke cop kutusu sadece Berke'den silinenleri gosterir
- Kaan cop kutusu sadece Kaan'dan silinenleri gosterir
- cop kutusundaki urunler normal listede gorunmez

### 9.3 Geri yukleme

`Geri Yukle` aksiyonu:

- `deleted_at` alanini temizler
- urunu eski owner alanina geri getirir
- farkli owner secimini kullaniciya sormaz

Bu kural ozellikle onaylandi: kayit hangi taraftan silindiyse yine o tarafa doner.

### 9.4 Kalici silme

Cop kutusunda ikinci kez silme aksiyonu secildiginde tekrar guclu bir onay gosterilir.

Onay sonrasi:

- urun kaydi fiziksel olarak silinir
- iliskili varyant, gecmis, bildirim, draft ve audit kayitlari transaction icinde temizlenir

Bu asama geri alinamaz olarak kabul edilir.

---

## 10. API ve backend sozlesmesi

### 10.1 Owner zorunlulugu

Tracking ve urunle ilgili tum endpoint'ler owner baglami tasiyacaktir. Onerilen endpoint yonu:

- `GET /owners/:ownerKey/products`
- `POST /owners/:ownerKey/products`
- `POST /owners/:ownerKey/products/refresh-runs`
- `POST /owners/:ownerKey/products/:productId/favorite`
- `DELETE /owners/:ownerKey/products/:productId` -> cop kutusuna tasima
- `GET /owners/:ownerKey/products/:productId`
- `GET /owners/:ownerKey/notifications`
- `GET /owners/:ownerKey/trash`
- `POST /owners/:ownerKey/trash/products/:productId/restore`
- `DELETE /owners/:ownerKey/trash/products/:productId` -> kalici silme

### 10.2 Owner-product uyum kontrolu

Her product bazli endpoint asagidaki kuralla calisir:

- product bulunamiyorsa `404`
- product var ama path owner'i ile kaydin `owner_key` degeri uyusmuyorsa yine `404`

Bu kural, baska owner'a ait kaydi URL degistirerek acma gibi yanlis davranislari engeller.

### 10.3 Transaction sinirlari

Asagidaki islemler transaction ile yurutulur:

- urun olusturma
- cop kutusuna tasima
- geri yukleme
- kalici silme
- owner-scoped refresh run baslatma

Boylece kismi yazma veya yari temizlenmis iliski kayitlari riski azaltilir.

---

## 11. AI Baglantilari yeniden tasarimi

### 11.1 Yeni urun modeli

`AI Baglantilari` sayfasi artik "masaustu OpenAI hesabina baglan" ekranindan cikacak ve ortak bir saglayici ayarlari merkezi olacaktir.

Bu ekran uygulama genelinde tektir; owner bazli degildir.

Sayfada su saglayici kartlari yer alir:

- `OpenAI`
- `OpenRouter`
- `Google`

### 11.2 Kayit modeli

Saglayici ayarlari `app_settings` icine sikistirilmis tekil alanlar olarak tutulmayacaktir. Bunun yerine ayri bir provider config modeli kullanilacaktir.

Onerilen tablo:

`ai_provider_configs`

Alanlar:

- `id`
- `provider` (`openai`, `openrouter`, `google`)
- `display_label`
- `api_key_encrypted`
- `base_url`
- `default_model`
- `extra_config_json`
- `is_active`
- `last_validated_at`
- `last_validation_error`
- `created_at`
- `updated_at`

Kurallar:

- birden fazla provider kaydi bulunabilir
- ilk iterasyonda provider basina tek config tutulur
- uygulama genelinde ayni anda yalnizca bir config `is_active = true` olabilir
- API anahtarlari sifrelenmis olarak saklanir; duz metin olarak geri donulmez

### 11.3 Provider bazli form alanlari

Ilk iterasyonda minimum kullanici ihtiyacini karsilayan alanlar acik ve anlasilir basliklarla sunulur:

**OpenAI**
- API Key
- Varsayilan Model
- Gelismis Ayarlar altinda opsiyonel Base URL

**OpenRouter**
- API Key
- Varsayilan Model
- Gelismis Ayarlar altinda opsiyonel uygulama/site bilgileri veya adapter'in ihtiyac duydugu ek alanlar

**Google**
- API Key
- Varsayilan Model

Buradaki prensip sunlardir:

- yalnizca uygulamanin gercekten kullandigi alanlar gosterilir
- zorunlu alanlar acik metinle belirtilir
- ek teknik alanlar gelismis kisimda tutulur

### 11.4 Aktif saglayici secimi

Kullanici:

- birden fazla saglayiciyi kaydedebilir
- kaydedilen saglayicilardan birini `Aktif Saglayici` olarak secebilir

AI uretim akislarinda backend her zaman aktif config'i cozer. Aktif saglayici yoksa AI kullanan ozellikler kontrollu hata verir ve kullaniciyi `AI Baglantilari` sayfasina yonlendirir.

### 11.5 Yardim popup'lari

Her provider basliginda ve kritik alanlarda kucuk `?` yardim ikonu bulunur.

Popup icerikleri sade urun diliyle su sorulara cevap verir:

- bu alan ne ise yarar
- bu bilgi nereden alinir
- bos birakilirsa ne olur
- yanlis girilirse ne olur

Amac, teknik belge okumadan ekranin anlasilmasidir.

### 11.6 Mevcut desktop OpenAI akisi ile iliski

Bu iterasyonda varsayilan AI baglanti modeli API anahtari bazli provider config olacaktir.

Mevcut desktop OpenAI OAuth/connector akisi:

- ya ikinci plana alinacak
- ya da bu kapsamda tamamen devre disi birakilacaktir

Nihai implementasyon, aktif AI uretim yolunun tek ve anlasilir olmasini saglamalidir; ayni anda hem OAuth profili hem API key registry uzerinden karar veren belirsiz bir sistem birakilmayacaktir.

---

## 12. Veri kaybi riskini azaltan onlemler

Kullanici beklentisi "kayitlar kolayca kaybolmasin" oldugu icin asagidaki korumalar tasarima dahil edilmelidir:

1. **Cop kutusu zorunlulugu**  
   Normal silme dogrudan kalici silme yapmaz.

2. **Owner zorunlulugu**  
   Owner bilgisi olmayan urun kaydi olusturulmaz.

3. **Owner + product uyum kontrolu**  
   Yanlis URL veya stale state ile diger workspace kaydi acilamaz.

4. **Transaction tabanli veri yazma**  
   Silme, geri yukleme ve kritik olusturma akislari yari durumda kalmaz.

5. **Migration oncesi yerel backup/export**  
   Schema gecisi veya mevcut veriyi sifirlama adimindan once mevcut local DB snapshot/export alinmalidir.

6. **Ayni owner icinde duplicate onleme**  
   Yanlislikla ayni linkin ayni workspace'e tekrar tekrar eklenmesi engellenir.

Bu iterasyonda tam kullanici-auth guvenligi yapilmayacaktir; ancak veri davranisi tarafinda guvenlik ve izolasyon uygulanacaktir.

---

## 13. Gecis ve migration yaklasimi

Mevcut kayitlar kritik olmadigi icin bu degisiklikte karmaasik veri tasima sihirbazi zorunlu degildir.

Onerilen gecis:

1. owner-scoped yeni schema migration'lari hazirlanir
2. local DB icin backup/export alinir
3. gerekirse mevcut urun verisi temizlenir
4. seeded owner bilgisi (`berke`, `kaan`) aktif edilir
5. uygulama yeni route ve sorgu modeliyle acilir

Bu secim, yarim tasinmis legacy veriler yerine temiz ve tahmin edilebilir bir baslangic saglar.

---

## 14. Hata davranislari

Asagidaki hata durumlari urun dilinde acik ve sade sekilde ele alinmalidir:

- gecersiz owner -> sayfa bulunamadi
- owner/product uyusmazligi -> kayit bulunamadi
- ayni owner icinde duplicate link -> zaten ekli / cop kutusundan geri yukle onerisi
- cop kutusunda olmayan kaydi restore etme denemesi -> kayit bulunamadi
- aktif AI saglayicisi yok -> once AI baglantisi yapin
- provider ayari eksik/hatali -> eksik alan veya gecersiz API anahtari aciklamasi

Hata dili teknik degil, kullanici odakli olmalidir.

---

## 15. Test stratejisi

Bu tasarimin implementasyonunda asagidaki testler zorunlu kabul edilmelidir:

### 15.1 Backend / repository testleri

- ayni linkin `berke` ve `kaan` altinda ayri kayit olarak olusabilmesi
- ayni linkin ayni owner altinda duplicate engeline takilmasi
- bir owner'dan silinen kaydin diger owner kaydini etkilememesi
- restore isleminin dogru owner'a donmesi
- kalici silmede iliskili kayitlarin birlikte temizlenmesi

### 15.2 Route / API testleri

- owner mismatch durumunda `404`
- owner-scoped listelerin birbirine karismamasi
- owner-scoped bildirim endpoint'lerinin dogru veriyi donmesi
- soft delete ve hard delete endpoint davranislari

### 15.3 Web / UI testleri

- sol menude `Urunler > Berke / Kaan` gorunumu
- owner route degistiginde dogru liste ve detayin acilmasi
- silme onayi -> cop kutusuna tasima akisi
- cop kutusu -> geri yukle / kalici sil akisi
- `AI Baglantilari` kartlari, aktif saglayici secimi ve yardim popup'lari

### 15.4 Regresyon testleri

- mevcut urun detay akisinin owner baglami altinda bozulmamasi
- bildirim, draft/SEO ve refresh akislari owner-scoped hale geldikten sonra da calismasi

---

## 16. Kapsam disi notlar

Bu tasarim asagidakileri bu iterasyona dahil etmez:

- gercek kullanici hesabi / giris sistemi
- sinirsiz sayida yeni owner ekleme arayuzu
- rol/izin yonetimi
- owner bazli ayri AI saglayici ayarlari

Bu iterasyonun hedefi, sabit iki kisiyle karismayan urun yonetimi ve ortak, anlasilir AI saglayici ayarlari kurmaktir.
