# Tarayici Ici Gorsel Metadata Temizleme Tasarimi

**Tarih:** 2026-03-27  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, kullanicinin yukledigi gorsellerdeki metadata bilgisini tamamen kullanici cihazinda temizleyebilen, toplu isleyebilen ve sonucu tek ZIP dosyasi olarak indirebilen ayri bir ekran tasarlamaktir.

Hedef urun davranisi sunlardir:

- islem tamamen tarayicida / kullanici cihazinda calisir
- ekran Ayarlar altinda ayri bir route olarak konumlanir
- kullanici dosya veya klasorleri surukle-birak ile ekleyebilir
- alt klasor yapisi korunur
- JPG, PNG, WebP, HEIC ve AVIF uzantilari hedef kapsamdadir
- basarili dosyalarda piksel olculeri korunur
- basarili dosyalarda gorsel veri yeniden encode edilmez; kalite kaybi olusturulmaz
- metadata temizligi mumkun olan dosyalar orijinal formatlarinda geri verilir
- uygun olmayan veya guvenli sekilde temizlenemeyen dosyalar toplu islemi durdurmaz; ZIP icindeki `hatali/` klasorune orijinal halleriyle konur
- tek tikla tum sonuc tek ZIP halinde indirilebilir

Bu tasarim bir gizlilik ve dosya hijyeni aracidir. Metadata temizligi saglar; bir dosyanin kokenini gizledigini veya belirli bir uretim aracini tespit edilemez hale getirdigini garanti etmez.

---

## 2. Mevcut durum ve tespitler

Kod tabani incelendiginde bu ihtiyacin su anki web uygulamasinda henuz karsilanmadigi goruldu:

- `apps/web/src/app/router.tsx` icinde su an `settings` icin yalnizca `/settings` route'u bulunuyor; Ayarlar altinda ikinci bir arac ekrani yok.
- `apps/web/src/features/settings/routes/SettingsPage.tsx` mevcut ayarlari yukleyip bir form gosteriyor, ancak dosya isleme veya yerel arac deneyimi sunmuyor.
- `apps/web/src/features/settings/components/SettingsForm.tsx` su an sadece senkronizasyon tercihlerini yonetiyor; arac linki veya ikincil aksiyon karti bulunmuyor.
- `apps/web/src/app/shell/AppShell.tsx` ana navigasyonda Ayarlar baglantisini destekliyor; bu nedenle yeni ozelligi ust navigasyona yeni bir ana madde eklemeden Ayarlar altinda acmak mevcut bilgi mimarisiyle uyumlu.
- Mevcut istemci tarafinda dosya kuyrugu, worker tabanli toplu binary isleme veya ZIP paketleme akisina ait hazir bir feature modulu bulunmuyor.

Bu nedenle cozumun yalnizca yeni bir bilesen degil, Ayarlar altinda konumlanan bagimsiz bir feature olarak tasarlanmasi gerekir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin asagidaki urun kararlari netlestirildi ve onaylandi:

- islem tamamen cihazda calisacak; sunucu fallback olmayacak
- ozellik Ayarlar altinda ayri bir sayfa / ekran olacak
- sonuc ciktisi tek bir ZIP dosyasi olacak
- basarili dosyalar ZIP'e dahil edilecek
- islenemeyen dosyalar ZIP icinde `hatali/` klasorune orijinal halleriyle eklenecek
- metadata temizligi agresif olacak; ICC profili dahil metadata tasiyan yardimci bloklar da kaldirilacak
- kaliteyi korumak icin cikti format donusumu yapilmayacak; basarili dosyalar orijinal formatlarinda geri verilecek
- klasor surukle-birak desteklenecek ve alt klasor yapisi korunacak
- ortalama 50-60 gorsel ayni anda islenebilmeli
- Chrome ve Edge odakli destek kabul edilebilir
- guvenli kayipsiz metadata temizligi mumkun degilse dosya basarisiz sayilacak; decode + yeniden encode fallback yapilmayacak

Bu kararlar sonucunda ilk iterasyonun odagi, cok formatli lossless metadata stripping ve saglam toplu indirme deneyimidir.

---

## 4. Degerlendirilen yaklasimlar

### Yaklasim A - Tarayici ici parser-first lossless metadata temizleme (**secilen**)

Her format icin dosya yapisi parse edilir, gorsel veri bloklarina dokunmadan yalnizca metadata tasiyan segment/chunk/box yapilari temizlenir.

**Artilari**
- kalite kaybi olusturmadan calisir
- piksel olculerini korur
- format donusumu gerektirmez
- tamamen cihazda calisabilir
- toplu islemde kismi basari / kismi hata modeline uygundur

**Eksileri**
- format bazli parser mantigi gerektirir
- HEIC/AVIF tarafinda guvenli destek daha zor olabilir
- ICC'nin silinmesi bazi goruntuleyicilerde renk yorumunu etkileyebilir

### Yaklasim B - Decode edip yeniden encode etmek

Dosya piksel olarak decode edilir, metadata'siz yeni bir cikti dosyasi encode edilir.

**Artilari**
- uygulamasi gorece kolaydir
- format davranisi teklesebilir

**Eksileri**
- kalite kaybi riski vardir
- sikistirma farklari olusabilir
- seffaflik ve renk yonetimi kirilgan hale gelebilir
- kullanicinin "kalite ayni kalsin" beklentisiyle uyusmaz

### Yaklasim C - Sadece guvenli formatlarda tam destek, digerlerinde sert fallback

JPEG/PNG/WebP icin derin destek verilir; HEIC/AVIF icin daha fazla dosya dogrudan basarisiz kabul edilir.

**Artilari**
- ilk teslimde risk azalir
- parser karmasikligi dusurulebilir

**Eksileri**
- format kapsami daha zayif hissedilir
- kullanici beklentisini tum formatlarda esit karsilamaz

Secilen yaklasim: **Yaklasim A**.

---

## 5. Mimari tasarim

### 5.1 Route ve ekran yerlesimi

Ozellik, Ayarlar altinda ayri bir route olarak acilacaktir.

Onerilen route:

- `/settings/image-metadata-cleaner`

Mevcut `/settings` sayfasi kaldirilmaz. Bunun yerine Ayarlar ekraninda mevcut formun altina veya yanina yeni bir kart / buton eklenir:

- baslik: `Gorsel metadata temizleme`
- aciklama: `Toplu dosya yukle, cihazinda isle, tek ZIP indir`

Bu yapi mevcut bilgi mimarisini bozmaz; ana sidebar'da yeni bir ana nav maddesi acmadan Ayarlar altinda arac mantigi kurulur.

### 5.2 Feature sinirlari

Bu ozellik sadece `apps/web` icinde yasamalidir. Backend, API veya connector tarafinda yeni endpoint ihtiyaci yoktur.

Onerilen dosya gruplari:

- `apps/web/src/features/mediaMetadataCleaner/routes/ImageMetadataCleanerPage.tsx`
- `apps/web/src/features/mediaMetadataCleaner/components/...`
- `apps/web/src/features/mediaMetadataCleaner/lib/...`
- `apps/web/src/features/mediaMetadataCleaner/workers/...`
- ilgili test dosyalari

Bu ayrim, Ayarlar ekranini yalnizca giris noktasi yapan; asil is mantigini ise bagimsiz bir feature modulu icinde tutan temiz bir sinir cizer.

### 5.3 Ekran bolumleri

Yeni sayfa asagidaki bolumlerden olusur:

1. **Bilgilendirme karti**
   - islemin tamamen cihazda yapildigini belirtir
   - desteklenen formatlari listeler
   - kalite / piksel / format koruma prensibini aciklar
   - ICC dahil metadata temizlenecegi icin renk yonetimi uyarisi verir

2. **Surukle-birak alani**
   - dosya ve klasor kabul eder
   - tiklayarak secme fallback'i sunar
   - bos durumda net CTA gosterir

3. **Kuyruk / dosya listesi**
   - dosya adi
   - goreli yol
   - uzanti / format
   - boyut
   - durum
   - hata nedeni

4. **Aksiyon cubugu**
   - `Temizlemeyi Baslat`
   - `Iptal Et`
   - `ZIP Indir`
   - `Listeyi Temizle`

5. **Sonuc ozeti**
   - toplam dosya sayisi
   - desteklenen sayisi
   - basarili sayisi
   - hatali sayisi
   - islem suresi veya ilerleme ozeti

### 5.4 Durum modeli

Her dosya icin UI katmaninda asagidaki bilgi tutulur:

- `id`
- `file`
- `relativePath`
- `extension`
- `size`
- `status` (`queued`, `processing`, `success`, `error`, `unsupported`, `cancelled`)
- `errorCode` / `errorMessage`
- `outputBlob` veya ciktinin referansi
- `zipTargetPath`

Bu model hem tablo gorunumu, hem ilerleme sayaclari, hem de ZIP paketleme icin tek kaynak olur.

---

## 6. Islem akisi ve veri akisi

### 6.1 Dosya toplama

Kullanici dosya veya klasor surukledikten sonra istemci once manifest olusturur.

Kurallar:

- klasor surukle-birakta alt klasor agaci taranir
- her girdi icin goreli yol hesaplanir
- desteklenen uzantilar manifest'e `queued` olarak girer
- desteklenmeyenler aninda `unsupported` / `error` durumuna alinabilir
- liste hizli acilmalidir; agir parse islemleri daha sonra worker kuyruguna birakilmalidir

Chrome / Edge odakli kabul edildigi icin klasor destegi icin `DataTransferItem.webkitGetAsEntry()` ve secmeli fallback icin `input[webkitdirectory]` tabanli yontem uygundur.

### 6.2 Kuyruk ve worker havuzu

Asil binary islem ana thread disinda calismalidir.

Onerilen model:

- ana thread dosya manifest'ini ve UI durumunu yonetir
- bir worker havuzu metadata temizligini yapar
- paralellik seviyesi cihaz kapasitesine gore sinirlanir (ornegin 2-4 eszamanli is)
- yeni dosyalar kuyruğa alinip sirayla dagitilir
- iptal durumunda yeni is dagitimi durdurulur; devam eden isler tamamlanabilir veya kontrollu iptal mekanizmasi kurulur

Bu yapi 50-60 dosyada UI'nin donmasini engeller ve bellek kullanimini daha ongorulebilir hale getirir.

### 6.3 Basarili / hatali sonuc uretimi

Her dosya icin worker sonucu su sekilde normalize edilir:

- **basarili**: metadata'siz ciktinin binary verisi + cikti yolu doner
- **hatali**: hata kodu + hata mesaji + orijinal dosyayi ZIP'te nereye koyacagimiz bilgisi doner

Toplu islem tamamlandiginda ZIP paketleme yalnizca bu normalize edilmis sonuc listesi uzerinden calisir.

---

## 7. Format bazli metadata temizleme stratejisi

Bu ozelligin temel ilkesi, gorsel veriyi yeniden encode etmeden yalnizca metadata katmanini temizlemektir.

### 7.1 JPEG

JPEG dosyalarinda metadata genellikle APP segmentleri ve yorum bloklari icinde tasinir.

Hedef davranis:

- EXIF tasiyan APP segmentlerini cikarmak
- XMP tasiyan segmentleri cikarmak
- IPTC / yorum benzeri metadata segmentlerini cikarmak
- gorsel veri akisini korumak

Bu islem scan data'ya dokunmadan segment bazli yeniden paketleme olarak dusunulmelidir.

### 7.2 PNG

PNG tarafinda kritik goruntu chunk'lari korunur; metadata amacli yardimci chunk'lar kaldirilir.

Hedef davranis:

- `tEXt`, `iTXt`, `zTXt` gibi metin tabanli metadata chunk'larini silmek
- metadata tasiyan yardimci chunk'lari kaldirmak
- `IHDR`, `IDAT`, `IEND` gibi goruntu icin kritik chunk'lara dokunmamak

### 7.3 WebP

WebP konteynerinde metadata tasiyan bolumler ayiklanir.

Hedef davranis:

- EXIF ve XMP iceren alt bolumleri silmek
- VP8/VP8L/VP8X gorsel verisini korumak

### 7.4 HEIC / AVIF

Bu formatlarda container box yapisi daha hassastir. Bu nedenle davranis "guvenli lossless temizleme mumkunse uygula, degilse hataliya al" seklinde tanimlanmalidir.

Hedef davranis:

- metadata tasiyan box'lari guvenli sekilde ayiklayabilen dosyalari basarili saymak
- yapisal risk veya parser belirsizligi olan dosyalari decode + re-encode etmeden hataliya almak

Bu kararla kalite hedefi korunur; fakat destek kapsami tum dosyalarda esit olmak zorunda degildir.

### 7.5 ICC ve renk yonetimi

Kullanici karari geregi ICC profili de temizlenecektir.

Bunun anlami:

- encoder kalitesi degismez
- piksel olculeri degismez
- fakat bazi goruntuleyiciler ICC yoklugunda renkleri farkli yorumlayabilir

UI ve sonuc aciklamalarinda bu nokta acikca belirtilmelidir.

---

## 8. ZIP paketleme tasarimi

Sonuc ciktisi tek bir ZIP olacaktir.

Onerilen yerlesim kurallari:

- basarili dosyalar, yukleme sirasinda gelen goreli klasor yapilarini koruyarak ZIP'e yazilir
- islenemeyen dosyalar `hatali/` klasorunun altina yerlestirilir
- `hatali/` altinda da mumkun oldugunca orijinal goreli yol korunur
- ad cakismasi olursa deterministic guvenli adlandirma uygulanir

Olası yardimci dosya:

- `islem-raporu.json` veya `islem-raporu.txt`

Bu rapor su bilgileri icerebilir:

- dosya adi
- orijinal goreli yol
- durum
- hata nedeni
- ZIP icindeki sonuc yolu

Rapor zorunlu degildir; ancak destek ve debug kolayligi icin tavsiye edilir.

---

## 9. Hata yonetimi ve dayaniklilik

Toplu islem tek bir dosya yuzunden tamamen basarisiz olmamalidir.

Beklenen davranislar:

- desteklenmeyen uzanti -> dosya hatali sayilir, islem devam eder
- parse hatasi -> dosya hatali sayilir, islem devam eder
- guvenli lossless temizleme mumkun degil -> dosya hatali sayilir, islem devam eder
- worker exception -> yalnizca ilgili dosya hatali olur
- ZIP uretim hatasi -> kullaniciya net hata gosterilir, mevcut sonuc durumu ekranda korunur

Kullaniciya gosterecek dil sade ve operasyonel olmalidir:

- `58 dosya alindi`
- `46 dosya temizlendi`
- `12 dosya guvenli sekilde islenemedi; ZIP icinde hatali/ klasorune eklendi`

Bu ton, toplu islemlerde kismi basari modelini anlasilir kilar.

---

## 10. Performans ve tarayici stratejisi

### 10.1 Performans hedefleri

Ilk iterasyonun performans hedefleri sunlardir:

- 50-60 gorselin ayni anda kuyruga alinabilmesi
- drag-drop sonrasi dosya listesinin hizli gorunmesi
- ana arayuzun islem boyunca akici kalmasi
- buyuk dosyalarda bellek kullaniminin tum dosyalari ayni anda acarak zirve yapmamasi

### 10.2 Performans kararlarimiz

Bu hedefleri saglamak icin:

- once hizli manifest, sonra agir islem modeli kullanilacak
- tum dosyalar ayni anda decode edilmeyecek
- worker havuzu ile kontrollu paralellik uygulanacak
- ZIP biriktirme mantigi sonucu parca parca hazirlayacak
- gereksiz kopyalari azaltmak icin `ArrayBuffer` / `Uint8Array` tabanli is akisi tercih edilecek

### 10.3 Tarayici destegi

Ilk iterasyon:

- Chrome odakli
- Edge uyumlu
- klasor surukle-birak icin WebKit tabanli dosya agaci API'lerine izin veren davranis

Diger tarayicilar icin bu iterasyonda tam uyum zorunlu degildir.

---

## 11. Test stratejisi

### 11.1 Unit testler

Asagidaki parcalar birim seviyede dogrulanmalidir:

- uzanti / format tespiti
- goreli yol koruma kurallari
- kuyruk durum gecisleri
- basarili ve hatali ZIP yol kurallari
- hata mesajlarinin normalize edilmesi

### 11.2 Parser testleri

Format bazli metadata temizleme mantigi fixture dosyalarla test edilmelidir:

- JPEG segment temizligi
- PNG metadata chunk temizligi
- WebP metadata temizligi
- HEIC / AVIF icin basarili parse, parse hatasi ve guvenli degil senaryolari

### 11.3 UI testleri

Sayfa seviyesinde su davranislar test edilmelidir:

- surukle-birak sonrasi listenin olusmasi
- sayaçlarin guncellenmesi
- baslat / iptal / indir buton durumlari
- hatali dosyalar listesinin gosterimi
- Ayarlar ekranindan yeni araca gecis

### 11.4 Entegrasyon testi

Karışik fixture setleriyle su senaryolar dogrulanmalidir:

- coklu klasor yapisi
- 50+ dosya senaryosu
- kismi basari + kismi hata cikisi
- ZIP icinde basarili dosyalarin ve `hatali/` klasorunun birlikte uretilmesi

---

## 12. Kapsam disi

Ilk iterasyonda asagidakiler bu tasarimin disindadir:

- sunucu tarafinda dosya isleme
- API veya connector entegrasyonu
- format donusumu (ornegin tum ciktinin JPG olmasi)
- gorsel optimizasyonu veya yeniden sikistirma
- AI tespiti, AI izi analizi veya "AI gorunmesin" garantisi
- toplu batch gecmisi saklama
- kullanici hesabina bagli kalici job kayitlari

Bu sinir, ilk iterasyonu dosya metadata temizleme ve toplu ZIP indirme isine odakli tutar.

---

## 13. Onerilen uygulama sinirlari

Uygulama tarafinda beklenen degisim yonu soyledir:

- `apps/web/src/app/router.tsx`
  - yeni route eklenmesi
- `apps/web/src/features/settings/routes/SettingsPage.tsx`
  - yeni arac karti / yonlendirme alani eklenmesi
- `apps/web/src/features/settings/components/SettingsForm.tsx`
  - ayarlar formu ile arac baglantisinin ayni sayfada uyumlu yerlesmesi veya bu sayfadan ayrismasi
- `apps/web/src/features/mediaMetadataCleaner/...`
  - route, bilesenler, queue mantigi, worker orkestrasiyonu, ZIP olusturma ve testler

Bu dosya sinirlari mevcut kod tabanindaki feature-bazli organizasyona uyar.

---

## 14. Kabul kriterleri

Bu tasarim uygulanmis sayilabilmesi icin asagidaki kosullar saglanmalidir:

- kullanici Ayarlar altindaki ayri ekrana gidebilmeli
- dosya ve klasor surukle-birak desteklenmeli
- alt klasor yapisi korunmali
- desteklenen dosyalar kuyruga alinmali
- toplu islem UI'yi dondurmamali
- basarili dosyalarda kaliteyi degistiren yeniden encode yapilmamali
- basarili dosyalar orijinal formatlarinda geri verilmeli
- islenemeyen dosyalar toplu sureci durdurmamali
- sonuc tek ZIP halinde indirilebilmeli
- ZIP icinde `hatali/` klasoru bulunmali ve basarisiz dosyalar burada yer almali

---

## 15. Sonuc

Bu tasarim, mevcut uygulamanin Ayarlar alani altinda yeni bir istemci-tarafli arac acarak gorsel metadata temizleme ihtiyacini karsilar. Secilen yon; kaliteyi korumak icin parser-first, format-bazli ve lossless metadata temizligi uygulayan, kismi basari modelini destekleyen, worker havuzuyla performansi koruyan ve sonucu tek ZIP dosyasinda toplayan bir cozumdur.

Bu yon, kullanicinin cihazda calisma, toplu isleme, klasor koruma, tek tikla indirme ve kaliteyi bozmama beklentileriyle en yuksek uyumu saglar.
