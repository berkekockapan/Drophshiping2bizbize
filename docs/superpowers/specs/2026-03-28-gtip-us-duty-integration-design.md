# GTIP / ABD Vergi Analizi ve Etsy Maliyet Hesaplayici Entegrasyonu Tasarimi

**Tarih:** 2026-03-28  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/api`, `apps/web`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, kaydedilen urunler icin otomatik **GTIP/HS kodu tavsiye akisi** kurmak, bu tavsiyeleri urun detayinda kullaniciya secilebilir olarak gostermek ve kullanicinin onayladigi secimi **Etsy Maliyet Hesaplayici** icinde opsiyonel ABD ithalat vergi etkisi olarak kullanabilmektir.

Beklenen urun davranisi sunlardir:

- urun detayinda sistem urun verisini analiz ederek **en iyi 2 GTIP tavsiyesi** uretir
- her tavsiye icin **kisa gerekce** ve **ABD toplam vergi etkisi** gosterilir
- son secim kullaniciya aittir; sistem tavsiyeyi otomatik uygulamaz
- AI baglantisi yoksa akisin calismasi durmaz; kural, katalog ve mevcut eslesmelerle devam eder
- kullanicinin sectigi GTIP urune kalici kaydedilir
- Etsy Maliyet Hesaplayici, urun baglaminda acildiginda bu secimi okuyup **istege bagli** vergi etkisi uygulayabilir
- kullanici hicbir secim yapmazsa mevcut maliyet hesaplayici davranisi degismez
- kullanici onaylari ortak bilgiye dogrudan yazilmaz; ayri bir onay akisi gerekir

Bu tasarim bir gumruk beyan sistemi degildir. Uygulama, kullaniciya planlama ve karar destegi verir; baglayici gumruk siniflandirmasi veya broker yerine gecen beyan yonlendirmesi yapmaz.

---

## 2. Mevcut durum ve problem

Kod tabani incelendiginde su durum goruluyor:

- `apps/web/src/features/product/routes/ProductDetailPage.tsx` urun detayinda `ProductSummary`, varyasyon tablosu ve Etsy hazirlik alanini gostermektedir.
- `apps/web/src/features/product/components/ProductSummary.tsx` urun ozetini ve temel aksiyonlari sunmaktadir.
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx` owner-scope disi, tek ortak maliyet hesaplayici ekranidir.
- hesaplayicinin kalici taslagi `app_settings.etsy_cost_calculator_json` icinde saklanmaktadir.
- `apps/api/src/routes/products.ts` ve `apps/api/src/modules/tracking/buildProductDetailView.ts` urun detay API akislarini saglamaktadir.
- veritabaninda bugun GTIP tavsiyesi, urun bazli GTIP secimi, tarife katalogu veya ortak bilgi kuyru icin ayri bir model bulunmamaktadir.

Bugunki durumda kullanici su problemleri yasamaktadir:

- urunden ABD'ye gonderim icin GTIP kodunu harici arastirmayla bulmak zorundadir
- hangi kodun daha uygun oldugu, neden onerildigi ve vergi etkisinin ne oldugu tek yerde gorulemez
- yeni urunlerde onceki deneyimlerden faydalanan ortak bir bilgi katmani yoktur
- AI baglantisi olmadiginda siniflandirma yardimi tamamen kaybolur
- Etsy maliyet hesaplayici ABD ithalat vergi etkisini urune bagli sekilde hesaba katamaz
- kullanici secim yapmazsa mevcut akisin bozulmamasi gerekirken bugun bunun icin yapisal bir opsiyonellik modeli yoktur

Temel problem, urun siniflandirma bilgisi ile maliyet hesaplama bilgisinin kopuk olmasi ve GTIP secim surecinin aciklanabilir, tekrar kullanilabilir ve denetlenebilir sekilde urune baglanmamis olmasidir.

---

## 3. Dis kaynaklar ve tasarimi etkileyen kilit gozlemler

Bu tasarim 2026-03-28 tarihinde asagidaki resmi kaynak mantigina gore sekillendirilmistir:

- USITC HTS sistemi ABD tarife cizelgesinin resmi yayim noktasidir ve HTS'i surumlu sekilde yayinlar.
- USITC HTS API ve export imkanlari, tarife verisini uygulama veri setine kontrollu sekilde aktarmaya uygundur.
- USITC, HTS'i yayimlar; CBP ise yorumu ve uygulamayi yapar.
- HTS duyurulari, revizyonlarin sik yayinlandigini gostermektedir; bu nedenle vergi oranlari ve ek tarifeler sabit koda gomulmemelidir.
- CBP'nin 2026 tarihli rulings yorumu, genel planlama amacli siniflandirma verisi ile fiili giris beyani icin kullanilacak daha spesifik siniflandirma arasinda dikkatli bir sinir cizilmesi gerektigini gostermektedir.

Bu nedenle tasarim su ilkelere dayanir:

1. **Kanonsal urun kaydi 6-digit HS/GTIP seviyesinde tutulur.**  
2. **ABD'ye ozel vergi etkisi ayri bir tarife profili olarak baglanir.**  
3. **Ekranda planlama/disclaimer dili zorunlu olur.**  
4. **Tarife verisi versiyonlu ve guncellenebilir olur.**

Bu kisim, resmi kaynaklardan cikarim yapilarak tasarlanmistir; dogrudan beyan yonlendirmesi degil, planlama amacli siniflandirma destegi hedeflenmektedir.

---

## 4. Onaylanan urun kararlari

Bu tasarim icin netlesen urun kararlari sunlardir:

- ana deneyim urun detayinda baslar; ilk siniflandirma orada uretilir
- tavsiye modeli **AI + onayli bilgi tabani + kural katalogu** hibrit yapidadir
- GTIP sonucu kullaniciya **oneriler** olarak gelir; otomatik secilmez
- AI yoksa sistem hata vermez; AI'siz fallback zorunludur
- urun detayinda **en iyi 2 tavsiye** gosterilir
- her tavsiyede **kisa gerekce + ABD toplam vergi etkisi** gosterilir
- ABD vergi etkisi temel gumruk vergisi + varsa ek tarifeler mantigiyla ozetlenir
- kullanicinin sectigi GTIP urune kalici kaydedilir
- Etsy Maliyet Hesaplayici bu secimi urun baglaminda kullanabilir
- sistem tamamen **istege bagli** olur; secim yoksa hicbir sey etkilenmez
- yeni urunler de mevcut katalog disinda AI/kural motoruyla analiz edilebilir
- ortak bilgi tabani bulunur, ancak kullanici secimleri ortak bilgiye **ayri onay olmadan** yazilmaz
- kullanici urun detayinda **manuel GTIP arama/secim** de yapabilir
- ortak bilgi katkisi, ayri bir aday/onay akisiyla ilerler
- ABD vergi sonucu **oran + kisa aciklama** olarak sunulur

---

## 5. Degerlendirilen yaklasimlar

### Yaklasim A - Kural tablosu agirlikli

Kategori, etiket ve anahtar kelime eslesmeleri temel motor olur; AI yalnizca yardimci sinyal saglar.

**Artilari**
- ongorulebilir ve deterministik davranis
- AI yokken iyi calisir
- operasyonel risk dusuktur

**Eksileri**
- yeni ve karmasik urunlerde hizla zayiflar
- tum urun tipleri hedefinde bakim maliyeti artar

### Yaklasim B - AI agirlikli

AI urun verisini yorumlar, aday kodlari siralar, katalog yalnizca vergi profili baglamak icin kullanilir.

**Artilari**
- yeni urunlerde esnektir
- tablo bakim ihtiyaci daha azdir

**Eksileri**
- aciklanabilirlik zayiflar
- AI yoksa kalite ciddi duser
- hukuki/operasyonel risk daha yuksektir

### Yaklasim C - Hibrit siniflandirma + tarife katalogu + onay kuyrugu (**secilen**)

AI urun sinyallerini okur; bilgi tabani ve kural katalogu ile birlikte skorlanmis tavsiyeler uretir; kullanici secer; ortak bilgiye katkilar ayri onaydan gecer.

**Artilari**
- yeni urunlerde de calisir
- AI bagimli degildir
- aciklanabilir tavsiye uretebilir
- zamanla ortak bilgi tabaniyla guclenir
- urun detayi ve hesaplayici arasinda temiz veri akisi kurar

**Eksileri**
- veri modeli ve servis akisi daha genistir
- ortak bilgi onay sureci ek kapsama girer

Secilen yaklasim: **Yaklasim C**.

---

## 6. Hedef yuksek seviye mimari

Tasarim 4 ana parcaya ayrilir:

1. **Tarife bilgi katmani**  
   GTIP/HS kodlari, ABD'ye ozel vergi profilleri, tarifeler, revizyon tarihleri ve veri kaynagi bilgisini tutar.

2. **Urun siniflandirma motoru**  
   Urun basligi, aciklamasi, kategori, attribute'lari, gorselleri ve gecmis eslesmelerden sinyal alip en iyi 2 tavsiyeyi uretir.

3. **Urun detayi secim deneyimi**  
   Tavsiyeler gosterilir, kullanici secim yapar veya manuel arama kullanir, secim urune yazilir.

4. **Etsy Maliyet Hesaplayici entegrasyonu**  
   Hesaplayici urun baglaminda acildiginda secilen GTIP'e bagli ABD vergi etkisini opsiyonel breakdown kalemi olarak kullanir.

Bu ayrim su nedenlerle secilmistir:

- urun yorumlama ile resmi/veri tabanli tarife bilgisini ayirir
- hesaplayiciyi GTIP sistemine baglar ama ona bagimli hale getirmez
- AI yoklugunda fallback kurallarini temiz tutar
- denetlenebilirlik ve test edilebilirligi artirir

---

## 7. Terminoloji ve hukuki guvenlik sinirlari

Bu ozellikte kullanilacak temel kavramlar:

- **Kanonsal kod:** urun icin kaydedilen 6-digit HS/GTIP kodu
- **ABD vergi profili:** kanonsal koda bagli, HTSUS revizyonundan turetilen duty/tarife profili
- **Tavsiye:** sistemin secmedigi, sadece kullaniciya sundugu aday siniflandirma
- **Onayli secim:** kullanicinin urun uzerinde secip kaydettigi kod
- **Ortak bilgi adayi:** bilgi tabanina eklenmek uzere ayri onaya giden kullanici sinyali

Hukuki guvenlik icin urunde zorunlu olacak kurallar:

- tavsiye metinleri **planlama ve analiz amacli** oldugunu acikca belirtir
- sistem otomatik beyan veya broker yonlendirmesi yapmaz
- ekran dili, kullanicinin nihai siniflandirma sorumlulugunu saklamaz
- daha ileri seviyede giris/beyan entegrasyonu istenirse bu tasarimin disinda, ayri bir lisans/uyumluluk degerlendirmesi gerekir

---

## 8. Veri modeli

### 8.1 Yeni tablolar

Veri modeli mevcut `products`, `app_settings` ve Etsy taslak tablolarini bozmadan genisletilir.

#### A. `tariff_classification_catalog`
Kanonsal GTIP/HS katalogu.

Alan onerisi:
- `id`
- `canonicalHs6`
- `title`
- `description`
- `keywordsJson`
- `sourceType` (`seed`, `external_sync`, `approved_knowledge`)
- `sourceVersion`
- `effectiveFrom`
- `effectiveTo`
- `createdAt`
- `updatedAt`

#### B. `tariff_classification_us_profiles`
ABD'ye ozel duty/tarife profilleri.

Alan onerisi:
- `id`
- `catalogId`
- `htsusCode`
- `generalDutyRate`
- `additionalDutyRate`
- `combinedDutyRate`
- `summaryText`
- `revisionLabel`
- `effectiveFrom`
- `effectiveTo`
- `sourceMetaJson`
- `createdAt`
- `updatedAt`

Not: Bir kanonsal 6-digit koda birden fazla ABD profili baglanabilir. V1'de kullaniciya tek ozet gosterilir; veri modeli gelecekte daha detayli ayrimlara acik kalir.

#### C. `product_tariff_analysis_runs`
Urun icin uretilen analiz calismalari.

Alan onerisi:
- `id`
- `productId`
- `ownerKey`
- `status`
- `usedAi`
- `inputSnapshotJson`
- `resultSnapshotJson`
- `engineVersion`
- `createdAt`
- `completedAt`

`resultSnapshotJson` icinde en iyi 2 tavsiye, skorlar, gerekceler ve ABD vergi ozetleri tutulur.

#### D. `product_tariff_selection`
Urun icin gecerli kullanici secimi.

Alan onerisi:
- `productId` (unique)
- `ownerKey`
- `catalogId`
- `usProfileId`
- `selectionSource` (`recommended`, `manual`)
- `selectedBy`
- `selectedAt`
- `analysisRunId`
- `notes`
- `createdAt`
- `updatedAt`

Bu tablo urun bazli tek aktif secimi temsil eder.
Kullaniciya gosteren kanonsal secim 6-digit GTIP/HS kodudur; `usProfileId` yalnizca buna bagli planlama/tax snapshot profilini isaret eder.

#### E. `tariff_knowledge_candidates`
Ortak bilgiye aday katkilar.

Alan onerisi:
- `id`
- `productId`
- `ownerKey`
- `catalogId`
- `usProfileId`
- `candidateSource` (`recommended_accept`, `manual_pick`)
- `payloadJson`
- `status` (`pending`, `approved`, `rejected`)
- `submittedBy`
- `submittedAt`
- `reviewedBy`
- `reviewedAt`
- `reviewNotes`

### 8.2 Neden yeni tablo yaklasimi secildi?

- `products` tablosuna cok sayida bagimsiz alan eklemek yerine audit ve versiyonlama korunur
- analiz sonucu ile nihai secim ayrilir
- ortak bilgi ve urun secimi birbirine karismaz
- ileride birden fazla pazar/ulke tarife profili eklemek kolaylasir

---

## 9. Tarife veri kaynagi stratejisi

### 9.1 Ana kaynak modeli

Onaylanan karar geregi veri kaynagi hibrid olur:

- **ana kaynak:** uygulamanin versiyonlu dahili veri seti
- **guncelleme kanali:** USITC HTS revizyonlari ve gerekli ek resmi/verified kaynaklardan senkronize edilebilen harici veri

Bu nedenle sistemde her duty kaydi icin su alanlar zorunludur:

- hangi resmi revizyondan geldigi
- hangi tarihte cekildigi
- hangi kural setiyle birlestirildigi
- ne zaman gecersiz sayilacagi

### 9.2 Neden sabit oran gomulmuyor?

USITC duyuru arsivi, HTS revizyonlarinin sik yayinlandigini gostermektedir. Bu nedenle V1'de bile vergi orani saklarken asagidaki ilke uygulanir:

- UI'de gosterilen oran bir **tarife snapshot'i** olur
- snapshot hangi revizyondan geldigini tasir
- uygulama bu veriyi dogrudan is kuralina gommez; katalog kaydindan okur

### 9.3 Ortak bilgi ile resmi veri farki

- resmi veri: kod aciklamalari, duty oranlari, revizyon bilgisi
- ortak bilgi: urun sinyalleri ile hangi katalog kaydinin daha uygun goruldugu

Ortak bilgi tabani resmi tarife verisini degistirmez; yalnizca tavsiye motorunun urun -> kod eslesme kalitesini artirir.

---

## 10. Siniflandirma motoru tasarimi

### 10.1 Girdi sinyalleri

Motor su sinyalleri kullanir:

- urun basligi
- marka
- kaynak kategori
- kullanici kategorisi
- ham aciklama
- attribute listesi
- varyasyon bilgisi
- gorsel varliklarin metaverisi veya AI destekli ozet sinyali
- ortak bilgi tabanindaki benzer eslesmeler
- seed katalog anahtar kelimeleri ve es anlamli listeleri
- AI profili varsa modelden gelen siniflandirma sinyali

### 10.2 Cikis modeli

Motor daima su ciktiyi uretir:

- en iyi 2 aday katalog kaydi
- her aday icin
  - `canonicalHs6`
  - kisa baslik/aciklama
  - kisa gerekce
  - skor/siralama bilgisi
  - ABD vergi ozeti
  - vergi aciklama metni
- tavsiye kaynaklari
  - `matchedRules`
  - `matchedKnowledge`
  - `usedAi`

### 10.3 Fallback davranisi

#### AI var
1. kural ve bilgi tabani adaylari cikarilir
2. AI bu adaylari siralamak veya yeni aday cikarmak icin kullanilir
3. son skorlayici en iyi 2 sonucu secer

#### AI yok
1. kural ve bilgi tabani adaylari cikarilir
2. deterministic skorlayici calisir
3. sonuc var ise oneriler sunulur
4. sonuc yoksa kullanici manuel aramaya yonlendirilir

AI yokken sistem hata vermez; sadece acikca `AI destekli derin analiz kullanilmadi` notu gosterilir.

### 10.4 Ozet gerekce uretimi

Her tavsiyedeki gerekce uzun serbest metin yerine yapilandirilmis sinyallerden uretilir. Ornek gerekce tipleri:

- `urun basligi ve materyal sinyalleri bu kodla uyumlu`
- `benzer onayli urunlerde ayni katalog kaydi kullanildi`
- `AI siniflandirma ozetinde aksesuar/jewelry sinifi yuksek guvenle eslesti`

Bu yapi, serbest model metni yerine denetlenebilir aciklama uretir.

### 10.5 Analiz tetikleme kurallari

Kullanici beklentisi dogrultusunda analiz akisi manuel baslatmaya bagli kalmaz.

- kaydedilen/izlenen urun ilk kez detay ekraninda acildiginda sistem son gecerli analiz yoksa otomatik analiz baslatir
- urunun baslik, aciklama, kategori veya attribute sinyallerinde anlamli degisiklik varsa sonraki detay ziyaretinde yeniden analiz tetiklenebilir
- kullanici ayrica `yeniden analiz` aksiyonuyla manuel rerun baslatabilir
- otomatik analiz basarisiz olursa kullaniciya gorunur hata ve `tekrar dene` aksiyonu sunulur
- otomatik analiz sonuc gelene kadar manuel arama yine kullanilabilir

---

## 11. API ve servis mimarisi

### 11.1 Yeni API yuzeyleri

Mevcut `products` router desenine uyumlu olarak su endpoint ailesi eklenir:

- `GET /owners/:ownerKey/products/:productId/tariff-analysis`
  - son analiz ve aktif secimi dondurur
- `POST /owners/:ownerKey/products/:productId/tariff-analysis/run`
  - yeni analiz calistirir
- `PUT /owners/:ownerKey/products/:productId/tariff-selection`
  - kullanici secimini kaydeder
- `GET /owners/:ownerKey/products/:productId/tariff-search?q=`
  - manuel arama icin katalog sonuc dondurur
- `POST /owners/:ownerKey/products/:productId/tariff-knowledge-candidates`
  - secimi ortak bilgi adayi olarak gonderir

Gerektiginde ileride ayri bir admin/onay router'i eklenebilir; V1'de son kullanici yonetim ekranina gerek yoktur.

### 11.2 API response modeli

`ProductDetailResponse` genisletilir ve urun detayina yeni bir blok eklenir:

- `tariffAnalysis`
  - `selection`
  - `latestRun`
  - `recommendations`
  - `manualSearchEnabled`
  - `disclaimer`

Bu sayede `buildProductDetailView` urun detayini tek payload icinde uretmeye devam eder.

### 11.3 Servis sinirlari

Yeni moduller onerisi:

- `modules/tariff/catalog/*`
- `modules/tariff/analysis/*`
- `modules/tariff/selection/*`
- `modules/tariff/knowledge/*`
- `db/repositories/tariff*Repo.ts`

Neden:
- Etsy prep ile tracking kodu ayrilir
- hesaplayici ve urun detay akisi ayni servisleri reuse eder
- test scope'lari kuculur

---

## 12. Urun detayi deneyimi

### 12.1 Yeni panel

`ProductSummary` altinda veya hemen sonraki grid alaninda yeni bir kart yer alir:

**Baslik:** `GTIP / ABD Vergi Analizi`

Kart su durumlari destekler:

1. **Ilk otomatik analiz durumu**
   - detay sayfasi ilk acilista otomatik analiz baslatir
   - kart yukleniyor/analiz ediliyor durumu ile acilir
   - analiz basarisiz olursa `tekrar dene` aksiyonu gorunur

2. **Yukleniyor / analiz suruyor**
   - kullaniciya durum metni verilir
   - mevcut sayfa kullanilabilir kalir

3. **Tavsiyeler hazir**
   - en iyi 2 aday kart halinde gosterilir

4. **Onayli secim var**
   - secilen GTIP ustte ozet olarak sabitlenir
   - `Secimi degistir` veya `yeniden analiz` aksiyonu sunulur

5. **Manuel arama modu**
   - kullanici katalogda arama yapip secim yapabilir

### 12.2 Tavsiye karti icerigi

Her tavsiye kartinda su alanlar bulunur:

- GTIP / HS kodu (6-digit kanonsal gosterim)
- kisa ad/aciklama
- kisa gerekce
- ABD vergi ozeti
  - `x% temel vergi + y% ek tarife = toplam z%`
- kullanilan kaynak rozetleri
  - `AI`
  - `Bilgi tabani`
  - `Kural eslesmesi`
- aksiyonlar
  - `Bu kodu sec`
  - `Ortak bilgiye aday yap`

### 12.3 Manuel arama

Manuel arama akisi zorunludur. Kullanici:

- anahtar kelimeyle arama yapabilir
- kodla arama yapabilir
- bir sonucu secip urune kaydedebilir

Manuel secim sonrasi:

- urun secimi hemen yazilir
- ortak bilgiye otomatik eklenmez
- kullanici isterse ayri aksiyonla aday olusturur

### 12.4 Disclaimer davranisi

Kartta kalici bir planlama notu bulunur:

- sonuc baglayici gumruk beyani degildir
- nihai beyan/entry karari icin lisansli broker veya resmi siniflandirma sureci gerekebilir

Bu metin urun guvenligini arttiran zorunlu bir UX parcasidir.

---

## 13. Etsy Maliyet Hesaplayici entegrasyonu

### 13.1 Genel ilke

Mevcut maliyet hesaplayici owner-scope disi tek ortak ekran olmaya devam eder. GTIP sistemi bu ekranin ustune **opsiyonel** bir katman olarak eklenir; ana hizli form bozulmaz.

### 13.2 Urun baglamiyla acilis

Hesaplayici urun baglaminda acildiginda query param veya esdeger state ile su baglam aktarilir:

- `ownerKey`
- `productId`

Onerilen route davranisi:

- mevcut route korunur: `/etsy-cost-calculator`
- opsiyonel query: `/etsy-cost-calculator?ownerKey=berke&productId=...`

Bu yapi global ekran davranisini korur, ama urun detayindan gelen baglantiya da izin verir.

### 13.3 Hesaplayici icindeki yeni blok

Hizli fiyat formunda veya sonuc paneline yakin bir bolumde yeni blok yer alir:

**Baslik:** `ABD Ithalat Vergisi`

Alanlar:
- bagli urun ozeti
- secili GTIP kodu varsa ozet satiri
- ABD vergi ozeti
- `ABD ithalat vergisini dahil et` toggle
- `urun detayinda GTIP sec` yardim linki (secim yoksa)

### 13.4 Davranis kurallari

- urunde onayli GTIP secimi yoksa hicbir vergi otomatik uygulanmaz
- secim yoksa kullaniciya bilgi mesaji gosterilir; akisi kilitlemez
- secim varsa ama toggle kapaliysa hesap degismez
- secim varsa ve toggle aciksa vergi etkisi breakdown'a eklenir
- breakdown satiri diger satirlar gibi acik sekilde etiketlenir

### 13.5 Hesap motoru etkisi

Maliyet motoruna yeni opsiyonel alanlar eklenir:

- bagli urun referansi
- `selectedTariffProfile`
- `importDutyEnabled`
- `importDutyRate`
- `importDutyLabel`

Bu yeni alanlar mevcut draft modelini bozmaz; varsayilanlari `null`/`false` olur.

---

## 14. Kalicilik ve ayar modeli

### 14.1 Urun secimi nerede saklanir?

GTIP secimi `app_settings` icinde tutulmaz; urune ozgudur ve ayri tabloda saklanir.

### 14.2 Hesaplayici taslagi nerede saklanir?

Mevcut `etsy_cost_calculator_json` yapisi korunur. Ancak taslak icinde yalnizca sunlar gecici olarak tutulur:

- bagli urun referansi
- vergi toggle durumu
- son okunan GTIP secimine ait gosterim ozeti

Kanonsal secim her zaman urun secim tablosundan okunur.

### 14.3 Neden bu ayrim gerekli?

- hesaplayici draft'i globaldir, urun secimi ise urune ozgudur
- ayni urun farkli cihazlarda acildiginda ayni GTIP secimi gorulmelidir
- kullanicinin eski drafti, urun kaydindaki gercek secimi ezmemelidir

---

## 15. Hata yonetimi ve fallback tasarimi

### 15.1 AI yoklugu

- analiz endpoint'i hata vermez
- response icinde `usedAi: false` doner
- UI `AI baglantisi olmadan katalog/kural analizi kullanildi` notu gosterir

### 15.2 Tarife profili bulunamadi

- kod tavsiyesi bulunabilir ama ABD vergi profili eksik olabilir
- bu durumda tavsiye karti gosterilir, vergi alaninda `vergi profili eksik` mesaji yer alir
- maliyet hesaplayici bu kaydi vergi hesabina dahil etmez

### 15.3 Analiz sonuc cikmadi

- sistem `uygun tavsiye bulunamadi` durumu verir
- manuel arama on plana cikarilir
- sayfa geri kalaninda hata yikici etki olmaz

### 15.4 Guncel revizyon ile yerel veri uyusmazligi

- tarife profili kaydinda versiyon farki varsa kullaniciya bilgi rozeti gosterilir
- V1'de engelleme yapilmaz, ama stale veri fark edilir kilinir

---

## 16. Test stratejisi

### 16.1 Unit testler

- kural tabanli aday cikarma
- hibrit skorlayici
- AI yok fallback akisi
- duty summary formatter
- hesaplayiciya duty satiri ekleme mantigi

### 16.2 Repository/API testleri

- analiz run kaydi olusturma
- urun secimi guncelleme
- ortak bilgi adayi olusturma
- manuel arama sonuclari
- `ProductDetailResponse` icine yeni tariff blokunu ekleme

### 16.3 UI testleri

- urun detayinda bos/yukleniyor/oneriler/onayli secim durumlari
- manuel arama ve secim akisi
- ortak bilgiye aday gonderme aksiyonu
- hesaplayicida GTIP secimi yokken bilgi mesaji
- hesaplayicida toggle ile duty satiri ac/kapa davranisi

### 16.4 End-to-end senaryolar

1. yeni urun + AI yok + tavsiye uret + secim kaydet
2. yeni urun + AI var + en iyi 2 tavsiye goster
3. secilen GTIP ile hesaplayiciyi urun baglaminda ac + vergi toggle ac
4. secim yokken hesaplayici kullan + mevcut akisin bozulmadigini dogrula

---

## 17. V1 kapsam sinirlari

V1'de bilerek kapsama alinmayanlar:

- otomatik gumruk beyani veya broker entegrasyonu
- entry filing icin 10-digit zorunlu siniflandirma tavsiyesi veren yonlendirici akim
- tum ortak bilgi adaylari icin tam yonetim paneli
- hesaplayici icinden bagimsiz manuel GTIP secim akisi
- ABD disi ulkeler icin vergi modulu

V1'in hedefi, urun detayinda denetlenebilir GTIP secimi ve bunun maliyet hesabina opsiyonel yansitilmasidir.

---

## 18. Uygulama adimlari icin onerilen parcalama

Bu tasarim tek buyuk degisiklik olarak degil, su sira ile uygulanmalidir:

1. veritabani modeli + repo katmani
2. seed katalog + ABD duty profili veri yukleme mekanizmasi
3. urun analiz servisi ve urun detay API response genisletmesi
4. urun detayinda GTIP paneli + manuel arama + secim kaydetme
5. ortak bilgi aday kuyrugu
6. Etsy Maliyet Hesaplayici'na urun baglami + duty toggle entegrasyonu
7. testler ve stale-data/guncel-veri rozetleri

Bu parcali ilerleyis, riski dusurur ve her asamada geri besleme almayi kolaylastirir.

---

## 19. Sonuc

Secilen tasarim, GTIP/HS kodu tavsiyesini urun detayinda aciklanabilir ve kullanici kontrollu bir akisla sunar; urun uzerindeki onayli secimi kalici hale getirir; ortak bilgiye kontrollu aday sistemi ekler; ve Etsy Maliyet Hesaplayici icinde ABD ithalat vergi etkisini opsiyonel bir kalem olarak tekrar kullanir.

Bu yaklasim sayesinde:

- yeni urunler de analiz edilebilir
- AI yoklugu sistemi durdurmaz
- kullanici secimden once son kontrolu elinde tutar
- ortak bilgi tabani zamanla iyilesir
- mevcut maliyet hesaplayici akisi bozulmaz
- hukuki/operasyonel risk, planlama-disclaimer modeliyle sinirlanir

---

## 20. Referanslar

- [About Harmonized Tariff Schedule (HTS) - USITC](https://www.usitc.gov/tariff_affairs/about_hts.htm)
- [How do I find the appropriate HTS number for a product? - USITC FAQ](https://www.usitc.gov/faq/question/how_do_i_find_harmonized_tariff_schedule_hts.htm)
- [Harmonized Tariff Schedule System User Guide - USITC](https://www.usitc.gov/documents/hts_external_guide.pdf)
- [HTS Announcements - USITC](https://www.usitc.gov/harmonized_tariff_information/announcement_archive)
- [CBP Ruling H350722](https://rulings.cbp.gov/api/getdoc/hq/2026/H350722.pdf)
