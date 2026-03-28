# Merkezi Bulut Kaliciligi ve Ortak Canli Veri Tasarimi

**Tarih:** 2026-03-28  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/api`, `apps/web`, `docs/deploy`, `docs/runbooks`

---

## 1. Amac

Bu degisikligin amaci, projedeki kalici calisma verisinin cihazlara bagli olmaktan cikarilip merkezi bulut veritabaninda yasatilmasidir. Boylece uygulama guncellense, farkli bilgisayardan baglanilsa veya bir cihaz devre disi kalsa bile kaydedilen linkler ve onlarla birlikte yasayan tum calisma verisi kaybolmamalidir.

Bu tasarimin hedef urun davranisi sunlardir:

- canli kullanimda tek dogruluk kaynagi Cloudflare production D1 olur
- Berke ve Kaan hangi bilgisayardan baglanirsa baglansin ayni merkezi veriye ulasir
- kaydedilen Trendyol linkleri, favoriler, kategoriler, fiyat/stok gecmisi, bildirimler, draft/SEO verileri ve ilgili calisma kayitlari ayni merkezi veride kalir
- her urunun sahibi (`owner`) korunur, ancak gorunurluk ortak kalir; iki kisi de tum owner gorunumlerine erisebilir
- veri ancak sunucu production D1 yazimini basariyla tamamladiginda "kaydedildi" sayilir
- bulut tarafina erisilemiyorsa islem sessizce kaybolmaz; net hata gosterilir ve tekrar denenir

Bu tasarim, mevcut Cloudflare Worker + D1 altyapisini koruyup minimum degisiklikle veri kaybi riskini dusurmeyi hedefler.

---

## 2. Mevcut durum ve problem

Kod tabani ve mevcut dokumanlar incelendiginde su durum goruluyor:

- `apps/api/wrangler.toml` zaten `trendyol-etsy-prod` ve `trendyol-etsy-dev` D1 veritabanlarini tanimliyor.
- `apps/web/src/app/api.ts` icinde `VITE_API_BASE_URL` destegi var; yani web istemcisi deploy edilmis API'ye yonlenebiliyor.
- API, Worker uzerinden D1, queue ve cron akislarini tek backend altinda topluyor.
- owner-scoped route ve veri modeli halihazirda mevcut; bu nedenle owner bilgisini korumak icin sifirdan yeni bir model gerekmiyor.

Buna karsin bugunku riskler sunlardir:

- canli kullanimin her zaman production API + production D1 uzerinden gittigi operasyonel olarak garanti edilmezse veri iki farkli yerde dagilabilir
- lokal gelistirme verisi ile production verisi karisabilir; bu da "bir cihazda var, digerinde yok" hissi yaratir
- ayni anda iki kisi kullanirken ekranlarin otomatik tazelenme davranisi acik tanimli degilse diger cihazdaki degisiklik gec gorulebilir
- yazma islemleri icin basari/hatali kayit semantigi yeterince keskin olmazsa kullanici verinin kaydedildigini sanip aslinda kaybetme riski yasayabilir
- ayni urun veya ayni draft ustunde ardisik duzenlemelerde cakisma kurali acik tanimlanmazsa beklenmedik ustune yazmalar olabilir

Temel problem, sistemin teknik olarak buluta deploy edilebilir olmasi degil; canli kullanimda **tek resmi veri kaynaginin production D1** oldugunun urun ve operasyon seviyesinde netlestirilmesidir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin netlestirilen kararlar sunlardir:

- minimum degisiklikle ilerlenir; baska bir veritabani servisine gecilmez
- canli verinin tek dogruluk kaynagi Cloudflare production D1 olur
- kalici lokal fallback veya offline-first senaryosu eklenmez
- kalici olarak korunacak veri kapsami en genis haliyle ele alinir:
  - linkler
  - kullanici kararlari (favori, kategori ve benzeri)
  - fiyat/stok/gecmis verileri
  - bildirimler
  - draft ve SEO ile ilgili calisma verileri
- Berke ve Kaan ayni sistemi kullanir; iki kisi de tum urunleri gorebilir
- her urunun owner bilgisi korunur
- bulut erisilemezse islem reddedilir ve net hata gosterilir
- ayni anda iki kisi yazma yapabilir; bu iterasyonda cakisma kuralinin temeli `last write wins` olur
- "anlik guncellik" ihtiyaci, bu iterasyonda WebSocket/SSE yerine mutation sonrasi yeniden fetch + aktif sayfalarda otomatik polling + pencere odaga gelince refetch olarak yorumlanir

Bu kararlarla birlikte hedef sistem "cihaz temelli uygulama verisi" degil, "bulutta yasayan veri + cihazin sadece istemci olmasi" mantigina doner.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Lokal veri + sonradan senkronizasyon

Her bilgisayar lokal veriyi de tutar, bulut arka planda senkronize edilir.

**Artilari**
- gecici baglanti kopukluklarinda cihaz uzerinde calisma hissi verir

**Eksileri**
- veri cakismasi ve split-brain riski yuksektir
- minimum degisiklik hedefine uymaz
- iki kisi ve birden fazla cihaz senaryosunda kurtarma zorlasir

### Yaklasim B - Merkezi bulut veri, fakat yalnizca manuel yenileme

Tum kalici veri bulutta tutulur, ancak diger cihazdaki degisiklikleri gormek icin kullanici manuel yenileme yapar.

**Artilari**
- uygulama maliyeti dusuktur
- merkezi veri hedefini karsilar

**Eksileri**
- "her degisiklikte otomatik guncel" beklentisini tam karsilamaz
- iki kisi kullaniminda veri var ama gorunurluk gecikir

### Yaklasim C - Merkezi bulut veri + hedefli otomatik yeniden dogrulama (**secilen**)

Tum kalici veri production D1'e yazilir; yazma sonrasi ilgili sorgular hemen yenilenir; acik ekranlar odak degisiminde ve belirli araliklarda veriyi tekrar ceker.

**Artilari**
- minimum degisiklikle merkezi veri hedefini karsilar
- farkli cihazdan yapilan degisiklikler otomatik olarak gorulebilir
- mevcut Cloudflare Worker + D1 yapisiyla uyumludur
- lokal veriyle production veri karismasi urun seviyesinde daha net engellenir

**Eksileri**
- gercek push tabanli realtime degildir; saniye bazli polling kullanir
- ayni anda ayni alan degistirilirse ileri seviye merge yerine `last write wins` gecerli olur

Secilen yaklasim: **Yaklasim C**.

---

## 5. Hedef mimari

### 5.1 Tek dogruluk kaynagi

Canli kullanimdaki tum kalici veri yalnizca `trendyol-etsy-prod` D1 veritabaninda tutulacaktir. Production kullanicisi olarak sisteme giren herhangi bir cihaz, deploy edilmis web istemcisi ve deploy edilmis Worker API uzerinden ayni veriye erisecektir.

Lokal gelistirme ortami ve `trendyol-etsy-dev` ya da lokal D1 depolamasi yalnizca gelistirme/test icin kullanilacaktir. Bunlar canli is akislarinin resmi parcasi olmayacaktir.

### 5.2 Bilesenler

- **Deploy edilmis web istemcisi:** kullanicinin farkli bilgisayarlardan acacagi ortak giris noktasi
- **Cloudflare Worker API:** tum okuma/yazma operasyonlarinin tek backend kapisi
- **Production D1 (`trendyol-etsy-prod`):** kalici veri katmani
- **Queue + cron akislari:** manuel refresh ve zamanlanmis refresh islemlerini ayni production D1 uzerinde calistiran arka plan parcalari
- **Lokal gelistirme ortami:** yalnizca test ve gelistirme icin izole ortam

### 5.3 Temel veri kapsami

Production D1 tarafinda kalici yasamasi gereken veriler sunlardir:

- `products` ve owner bilgisi
- urun anlik durum tablolari
- fiyat/stok/icerik history tablolari
- bildirimler
- manual refresh run kayitlari
- draft / Etsy-prep / SEO ile iliskili kayitlar
- gerekli oldugu kadariyla uygulama ayarlari ve ortak konfigurasyon kayitlari

Bu tasarimda "cihaz degisse bile kaybolmama" ilkesi bu tablo ailesinin tamami icin gecerli kabul edilir.

---

## 6. Gorunurluk, sahiplik ve erisim modeli

Bu iterasyonda kullanici hesabi veya yetkilendirme sistemi eklenmeyecektir. Dolayisiyla owner bilgisi bir erisim bariyeri degil, veri sahipligi metadatasi olarak korunacaktir.

Temel kurallar sunlardir:

- her urunun bir `ownerKey` alani vardir ve korunur
- Berke ve Kaan tum owner route'larini acabilir
- owner bilgisi liste, detay ve ilgili ekranlarda okunur sekilde gorunebilir
- owner bazli veri modeli bozulmaz; ancak gorunurluk ortaktir

Bu karar, mevcut owner-scoped veri semasini atmadan ortak calisma ihtiyacini karsilar. Ileride gercek kimlik dogrulama eklenirse owner yine hazir bir alan olarak kalir.

---

## 7. Veri akis tasarimi

### 7.1 Yazma akisi

Her mutation icin ortak kural sunlardir:

1. Web istemcisi istegi deploy edilmis Worker API'ye gonderir.
2. API giris dogrulamasini ve owner baglamini kontrol eder.
3. Veri production D1'e yazilir.
4. API basarili yanit vermeden UI "kaydedildi" demeyecektir.
5. Basarili mutation sonrasinda ilgili query'ler invalid edilir ve ekran tekrar veriyi ceker.

Bu akisa dahil mutation turleri sunlardir:

- yeni link ekleme
- favori degistirme
- kategori atama/duzenleme
- soft delete / restore / hard delete
- draft / SEO kaydetme
- ayar guncellemeleri
- refresh sonucu olusan kalici kayitlar

Bu tasarimda kalici optimistic write yoktur. Kullanici basariyi ancak sunucudan geldikten sonra gorur.

### 7.2 Okuma ve otomatik guncellik akisi

"Baska bilgisayardan link ekledigim anda diger tarafta da guncel olsun" beklentisini minimum degisiklikle karsilamak icin su davranis secilmistir:

- mutation sonrasi ayni istemcide ilgili ekranlar hemen refetch edilir
- takip listesi, urun detay, bildirimler, cop kutusu ve aktif refresh ekranlari **sayfa acikken her 10 saniyede bir** otomatik yeniden sorgulanir
- tarayici penceresi yeniden odaga geldiginde ilgili aktif sorgular hemen yeniden cagrilir
- route degisiminde ekran ilk yuke geldiginde her zaman taze veri cekilir

Bu iterasyonda WebSocket, SSE veya push tabanli altyapi eklenmeyecektir. `10 saniyelik polling + focus refetch + mutation invalidate` kombinasyonu, minimum degisiklikle "otomatik ve yeterince hizli guncellik" davranisi saglayacaktir.

### 7.3 Arka plan isleri

Cron ve queue ile calisan refresh akislari da ayni production D1 uzerinde calisacaktir. Boylece:

- bir cihazdan baslatilan manual refresh'in urettigi veriler diger cihazlarda da ayni kaynaktan okunur
- zamanlanmis refresh sonucunda olusan bildirimler ve history kayitlari merkezi olarak kalir
- "arka plan farkli yerde, uygulama farkli yerde" gibi ikili veri sorunu olusmaz

---

## 8. Tutarlilik ve eszamanli kullanim

### 8.1 Tutarlilik modeli

Mevcut minimum degisiklik hedefi nedeniyle, bu iterasyonda okuma/yazma modeli su sekilde kalacaktir:

- Worker API D1'e dogrudan mevcut binding uzerinden erisir
- read replication'i aktif kullanmaya yonelik ek Session/bookmark akisi bu iterasyonda zorunlu hale getirilmez
- dolayisiyla okuma davranisi sade tutulur ve production D1 uzerindeki tek merkezi kaynaga odaklanilir

Cloudflare D1 dokumanina gore read replication kullanilmak istenirse Sessions API ile ardiskil tutarlilik guclendirilebilir; ancak bu, minimum degisiklik hedefi icin ilk teslimata alinmaz.

### 8.2 Cakisma kurali

Iki kisi ayni veride ayni anda islem yapabilecegi icin acik kural gerekir. Bu tasarimda:

- temel kural `last write wins` olur
- tam nesneyi bastan sona tekrar yazan genis guncellemeler yerine hedefli endpoint'ler tercih edilir
- favori, kategori, draft, ayar ve benzeri alanlar ayri mutation olarak kalir

Bu sayede iki farkli alanin degisikligi birbirini gereksiz yere ezmez. Ancak ayni alan iki farkli cihazda ardisik guncellenirse son basarili yazim gecerli olur.

### 8.3 Veritabani korumalari

Veri kaybini ve karismayi azaltmak icin veritabani seviyesindeki mevcut benzersizlik ve owner kurallari korunacaktir. Owner-scoped duplicate engelleri urun ekleme akisinda son savunma hatti olmaya devam eder.

---

## 9. Hata yonetimi ve retry davranisi

### 9.1 Yazma hatalari

Bulut yazimi basarisiz olursa:

- UI islem basariliymis gibi davranmaz
- net hata mesaji gosterir
- kullanicinin girdigi form verisi mumkunse ekranda tutulur ki tekrar deneyebilsin
- verinin kaydedildigi izlenimi yaratilmaz

### 9.2 Okuma hatalari

Okuma yenilemesi basarisiz olursa:

- varsa son basarili gorunum ekranda kalabilir
- ancak ekranin guncellenemedigini belirten acik bir uyari gosterilir
- kullaniciya verinin en son hali garanti edilmis gibi davranilmaz

### 9.3 Retry

Cloudflare D1 dokumanina uygun sekilde, retry edilebilir gecici yazma hatalari icin API tarafinda kontrollu retry mantigi eklenmesi tasarimin parcasidir. Onerilen davranis:

- yalnizca retry edilebilir gecici D1/network hatalarinda devreye girsin
- en fazla 3 deneme yapilsin
- denemeler kucuk artan bekleme ile ilerlesin

Bu davranis kullanicinin ayni islem icin rastgele veri kaybi yasama ihtimalini azaltir; ancak kalici hata durumunda yine net hata mesaji esastir.

---

## 10. Yedekleme ve geri donus

Bu iterasyonda ek bir farkli veritabani ya da karma bir backup mimarisi kurulmayacaktir. Ana guvenlik katmani su iki unsur olur:

- Cloudflare D1 `Time Travel` ile gecmise donus
- acik ve test edilmis operasyon runbook'u

Bu kapsamdaki kararlar sunlardir:

- production veritabani geri donus proseduru belgeye baglanir
- migration ya da toplu veri degisikligi oncesi gerekli bookmark/geri donus adimlari tanimlanir
- rollback gerektiginde once kod rollback'i, gerekiyorsa sonra D1 Time Travel degerlendirilir

Harici uzun sureli export backup'i yararli bir sonraki sertlestirme adimidir; ancak minimum degisiklik hedefi nedeniyle bu ilk teslimatin zorunlu parcasi yapilmaz.

---

## 11. Rollout ve operasyon kurallari

### 11.1 Canli kullanim kurali

Canli kullanimda yalnizca su kombinasyon kabul edilir:

- deploy edilmis web istemcisi
- deploy edilmis Worker API
- production D1

Lokal `wrangler dev`, lokal D1 veya dev D1 uzerinden yapilan calisma canli veri davranisi olarak kabul edilmez.

### 11.2 Tek seferlik gecis

Halihazirda lokal veya daginik ortamda duran veriler varsa, merkezi modele gecis icin tek seferlik bir bootstrap gerekir:

1. mevcut veri kaynaginin neresi oldugu netlestirilir
2. production D1 migration durumu dogrulanir
3. gerekiyorsa mevcut veri export edilip production D1'e tasinir
4. tasinan tablo sayilari ve kritik kayitlar dogrulanir
5. canli istemciler production API'ye sabitlenir

Bu adim tamamlanmadan "artik veri bulutta" varsayimi tam sayilmaz.

### 11.3 Runbook ve deploy dogrulamasi

Dokumantasyon tarafinda su operasyon bilgileri netlestirilmelidir:

- production ve dev D1 ayrimi
- migration uygulama sirasi
- deploy sonrasi health check
- smoke test adimlari
- rollback akisi
- Time Travel komutlari ve kullanim zamani

Opsiyonel ama guclu bir koruma olarak production arayuzunde ortam bilgisinin gorunur sekilde belirtilmesi de degerlidir; boylece kullanici yanlislikle lokal/dev ortami canli sanmaz.

---

## 12. Test ve kabul kriterleri

### 12.1 API ve web dogrulamalari

Asagidaki akislarda production-benzeri merkezi veri davranisi korunmalidir:

- yeni urun linki ekleme
- listeleme
- favori degistirme
- kategori atama
- silme / geri yukleme / kalici silme
- manual refresh baslatma ve sonucunu gorme
- bildirimler
- draft / SEO verisi kaydetme ve tekrar acma

### 12.2 Cok cihazli smoke test

Asagidaki manuel smoke test bu tasarimin cekirdek basari testidir:

1. Birinci cihazda owner listesine yeni link eklenir.
2. Ikinci cihazda ayni owner listesi acik halde bekler.
3. En gec polling araligi ve odak degisimi sonrasinda yeni kayit gorulur.
4. Birinci cihazda urun favori/kategori/draft verisi guncellenir.
5. Ikinci cihazda ayni veri yeniden cekildiginde degisiklikler gorulur.
6. Bir cihazdan silinen urun diger cihazda cop kutusu veya ilgili gorunumde tutarli sekilde gorulur.

### 12.3 Basari kriterleri

Bu tasarim basarili sayilacaksa:

- uygulama guncellemesi veriyi etkilemez
- farkli bilgisayardan baglaninca ayni kalici veri gorulur
- owner bilgisi korunur
- Berke ve Kaan tum urunleri gorebilir
- kalici calisma verisinin hicbiri cihaza bagli kalmaz
- bulut hatasinda veri sessizce kaybolmaz
- canli kullanimda tek resmi veri kaynagi production D1 olur

---

## 13. Kapsam disi birakilanlar

Bu iterasyonda su konular tasarimin parcasi degildir:

- tam kimlik dogrulama / yetkilendirme sistemi
- offline-first veya lokal-first senkronizasyon
- WebSocket / SSE tabanli gercek push realtime
- gelismis field-level merge veya operational transform
- baska bir managed veritabanina gecis
- zorunlu harici uzun sureli export backup otomasyonu

---

## 14. Sonuc

Onaylanan yonde en mantikli cozum, mevcut Cloudflare Worker + D1 altyapisini koruyup production D1'i canli kullanimin tek dogruluk kaynagi yapmaktir. Web istemcisi ve arka plan isleri ayni merkezi veriye baglanacak; basarili yazma sonrasi ekranlar otomatik tazelenecek; iki kisi ve cok cihazli kullanim minimum degisiklikle ayni veriyi paylasacaktir.

Bu tasarimla birlikte "uygulama guncellendi, diger bilgisayardan girildi, veri kayboldu" problemi uygulama dosyasi seviyesinde degil, merkezi veri modeli seviyesinde ele alinmis olur. Veri cihazda degil bulutta yasadigi icin, asil guvenlik artik deployment disiplini, D1 Time Travel ve net hata yonetimi ile saglanir.

