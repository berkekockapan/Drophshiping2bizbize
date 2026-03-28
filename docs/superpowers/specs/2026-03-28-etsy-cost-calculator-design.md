# Etsy Maliyet Hesaplayici Tasarimi

**Tarih:** 2026-03-28  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, `apps/api`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, uygulamaya Etsy satis kararlarini guvenilir, denetlenebilir ve hizli sekilde verebilecegimiz tek ortak bir **Etsy Maliyet Hesaplayici** eklemektir.

Hedef urun davranisi sunlardir:

- sidebar icinde `Cop Kutusu` altinda ve `AI Baglantilari` ustunde yeni bir `Etsy Maliyet Hesaplayici` giris noktasi olur
- ekran owner bazli degil, tum uygulama icin tek ortak hesaplayici olarak calisir
- kullanici Etsy satis fiyatini, kampanya kurgularini ve tum operasyonel giderlerini tek ekranda girebilir
- sistem Etsy'nin Turkiye icin gecerli resmi fee kurallarini 2026-03-28 tarihi itibariyla varsayilan profil olarak uygular
- kullanici urun maliyeti, gercek kargo, ShipEntegra operasyonu ve diger ozel giderlerini serbestce ekleyebilir
- hedef kar `%`, `USD` veya `TRY` olarak tanimlanabilir
- kampanya acikken sistem, hedef kari **kampanya uygulanmis senaryoda** koruyacak gerekli liste fiyatini hesaplayabilir
- resmi fee alanlari varsayilan olarak kilitli gelir, ancak gelismis modda override edilebilir; tek tikla varsayilanlara donulebilir
- son aktif calisma durumu ve kaydedilen preset'ler kalici olarak saklanir
- sonuc ekrani sadece tek bir rakam vermez; tum fee ve gider kalemlerini kalem kalem aciklar

Bu tasarim, kullaniciya "kesin gorunen ama varsayimlari saklayan" bir arac degil; resmi Etsy fee kurallarini acikca uygulayan, degisken kalemleri ise kullaniciya gorunur sekilde soran bir karar destek araci sunmayi hedefler.

---

## 2. Mevcut durum ve problem

Kod tabani incelendiginde su durum goruluyor:

- `apps/web/src/app/shell/AppShell.tsx` icindeki sidebar yapisi su an `Bildirimler`, `Cop Kutusu`, `AI Baglantilari`, `Ayarlar` akisini sunuyor.
- `apps/web/src/app/router.tsx` icinde maliyet hesaplayiciya ait bir route yok.
- `apps/web/src/app/api.ts`, `apps/api/src/routes/settings.ts` ve `apps/api/src/db/repositories/settingsRepo.ts` tarafinda genel uygulama ayarlari icin halihazirda kalici bir `settings` akisi bulunuyor.
- `apps/api/src/db/schema.ts` icindeki `app_settings` tablosu, ek JSON tabanli konfigurasyon alanlarini tasimaya uygun bir yapiya sahip.

Buna karsin bugunku kullanimda su problemler var:

- Etsy icin fiyat belirleme su an manuel veya harici araclarla yapilmak zorunda
- Etsy fee kurallari, kampanya kurgulari ve kullanicinin kendi giderleri ayni yerde toplanmis degil
- `musteriden alinan kargo` ile `gercek gonderim maliyeti` birbirine karisabiliyor
- ShipEntegra gibi Turkiye'den gonderim operasyonlari Etsy'nin resmi fee yapisindan farkli olmasina ragmen, toplam kar hesabinda birlikte gorulmesi gerekiyor
- `20 USD kar istiyorum`, `%10 kar istiyorum`, `200 TRY kar istiyorum` gibi hedefler arasinda hizli gecis yok
- indirim, kupon ve ucretsiz kargo kurgulari aktifken hedef karin korunup korunmadigi acik gorulemiyor
- Etsy'nin bazi fee kalemleri resmi ve deterministik olsa da bazi kalemleri baglamsal; bugun bu ayrim urunde acik sekilde yansitilmiyor

Temel problem, kullanicinin Etsy fiyatlandirmasini tek bakista dogrulayamamasi ve hangi sonucun resmi fee, hangisinin varsayim, hangisinin kendi gideri oldugunu ayirt edememesidir.

---

## 3. Onaylanan urun kararlari

Bu tasarim icin netlesen urun kararlari sunlardir:

- hesaplayici **tek ortak ekran** olur; owner bazli ayri kopyalari olmaz
- hesaplayici **ayri tam sayfa** olarak acilir; modal/drawer secilmez
- sidebar menu ogesi `Cop Kutusu` altinda ve `AI Baglantilari` ustunde yer alir
- hedef kar modu uc secenekli olur:
  - `%` net kar
  - `USD` net kar
  - `TRY` net kar
- kampanya aktifse, hedef kar **kampanya uygulanmis durumda** korunacak sekilde fiyat onerilir
- kampanya kurgulari su basliklari kapsar:
  - yuzdesel indirim
  - kupon
  - ucretsiz kargo
- `musteriden alinan kargo` ile `gercek kargo maliyeti` ayri alanlardir
- genel giderler icin mod secilebilir:
  - kapali
  - siparis basi sabit gider
  - toplam gideri siparis adedine bolerek paylastirma
- gider girisi su yapiyi destekler:
  - sabit alanlar
  - sinirsiz ozel gider satiri
  - kaydedilebilir preset'ler
- kur modeli tek alanlidir: **manuel USD/TRY kuru**
- resmi Etsy varsayilanlari gelir, ancak gelismis modda override edilebilir
- override edilen fee profili icin **Varsayilan ayarlara don** butonu bulunur
- sistem `VAT ID var` ve `VAT ID yok` senaryolarini destekler
- kullanici gonderimi ShipEntegra ile yaptigi icin ShipEntegra maliyeti ayri ve kullanici kontrollu bir gider olarak modele dahil edilir

---

## 4. Resmi arastirma ozeti ve fee matrisi

Asagidaki resmi Etsy kaynaklari 2026-03-28 tarihinde kontrol edildi:

- [What are the Fees and Taxes for Selling on Etsy?](https://help.etsy.com/hc/en-in/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy)
- [What are Payment Processing Fees for Selling on Etsy?](https://help.etsy.com/hc/en-in/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy)
- [Currency Conversion Fees](https://help.etsy.com/hc/en-us/articles/360000344668-Currency-Conversion-Fees)
- [What is a Regulatory Operating Fee?](https://help.etsy.com/hc/en-us/articles/1500011073202-What-is-a-Regulatory-Operating-Fee)
- [How Etsy's Offsite Ads Work](https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work)
- [How VAT Is Collected on Seller Fees](https://help.etsy.com/hc/en-in/articles/360040584433-How-VAT-Is-Collected-on-Seller-Fees)
- [Fees and Listing Multiple Quantities](https://help.etsy.com/hc/en-us/articles/360000344908-Fees-and-Listing-Multiple-Quantities)
- [How to Use a Third-Party Provider to Ship Your Order](https://help.etsy.com/hc/en-us/articles/26654295371031-How-to-Use-a-Third-Party-Provider-to-Ship-Your-Order)
- [Guncel KDV Oranlari - GIB](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf)

Ayrica shop setup fee ve diger ozel basliklar icin Etsy'nin yardim icerigi incelendi; setup fee icin resmi sayfa yalnizca **tek seferlik, iadesiz ve lokasyona gore degisen** bir ucret oldugunu soyluyor, kamuya acik sabit bir Turkiye rakami vermiyor. Bu nedenle bu kalem otomatik fee degil, manuel genel gider olarak ele alinacaktir.

### 4.1 Fee matrisi

| Kalem | Resmi kural / bulgu | Hesaplayici davranisi | Not |
| --- | --- | --- | --- |
| Shop setup fee | Tek seferlik, iadesiz, lokasyona gore degisir | Manuel genel gider | Siparis basi deterministik degil |
| Listing fee | `$0.20 USD` | Varsayilan resmi alan, override edilebilir | Gercek tetikleme listing omrune bagli oldugu icin per-order varsayim olarak kullanilir |
| Auto-renew / multi-quantity | Ek miktarlar ve belirli satistan sonra ek `$0.20 USD` olabilir | Manuel/override | V1 tam listing lifecycle simulasyonu yapmaz |
| Transaction fee | Siparis toplaminda `%6.5` | Resmi ve deterministik | Urun + kargo + gift wrap vb. tabanina dayanir |
| Payment processing fee (TR) | `%6.5 + 14 TRY` | Resmi ve deterministik | Tabanina buyer tax dahil olabilir |
| Regulatory operating fee (TR) | `%2.27` | Resmi ve deterministik | Urun + kargo + gift wrap tabani |
| Currency conversion fee | Gerekirse `%2.5` | Toggle ile acik/kapali | Satis para birimi ile payment account para birimi farkliysa |
| Offsite Ads | `<$10,000` ciro ise `%15`, `>= $10,000` ise `%12`, ust limit `$100` | Mod secimli | Siparisin ad'e atfedilmis olmasi gerekir |
| VAT on seller fees | VAT ID yoksa seller fee'ler ve processing fee icin KDV uygulanabilir | Desteklenir | Oran varsayilani `%20`; fee tabani gelismis profilde gorunur |
| Deposit fee (TR) | `50 TRY` min, `600 TRY` fee threshold, `42 TRY` deposit fee | Gelismis opsiyonel kalem | Payout bazli oldugu icin varsayilan kapali |
| Etsy Ads CPC | Klik bazli, dinamik | Manuel gider / genel gider | Resmi ama siparis bazli deterministik degil |
| Pattern | Ayrica ucretlenir | Manuel genel gider | Bu ekran Pattern'a ozel model kurmaz |
| Postage labels | Etsy Postage Labels belli ulkelerde | Manuel gider | Turkiye senaryosunda ShipEntegra ucuncu taraf entegrasyonu esas alinir |
| Payoneer vb. dis finansal fee | Harici servis kurallarina bagli | Manuel gider | Etsy resmi per-order fee profiline dahil edilmez |

### 4.2 Dogruluk siniri

Bu tasarimda "dogruluk" su sekilde yorumlanir:

- **resmi ve herkese acik Etsy fee kurallari**: motorun varsayilan profiline kodlanir
- **baglama, listing omrune, payout zamanina veya reklam performansina bagli kalemler**: kullaniciya gorunur secenek/toggle/manuel alan olarak sunulur

Bu yaklasimla urun, dogrulanamayan bir kalemi sessizce otomatiklestirmek yerine varsayimi acikca kullaniciya gosterir.

---

## 5. Degerlendirilen yaklasimlar

### Yaklasim A - Ayrica tam sayfa, reusable hesap motoru (**secilen**)

Sidebar'da yeni bir route acilir; hesap mantigi ayri bir `lib` katmaninda yazilir.

**Artilari**
- bu kadar cok alan ve senaryo icin en okunur cozumdur
- preset, fee breakdown ve sonuc paneli icin yeterli alan sunar
- gelecekte urun detay ekranindan da ayni motor tekrar kullanilabilir
- test edilebilirlik yuksektir

**Eksileri**
- yeni route ve yeni feature modulu ekler

### Yaklasim B - Modal / drawer hesaplayici

Sidebar'dan tiklaninca tek bir overlay icinde acilir.

**Artilari**
- hizli ac/kapa hissi verir

**Eksileri**
- kampanya, ozel gider, preset, fee breakdown ve hedef kar solver'i icin fazla sikisiktir
- buyuk form ve detayli sonuc paneli icin kullanisli degildir

### Yaklasim C - Sadece urun detayina gomulu hesaplayici

Ayrica menu ekranina gerek olmadan belirli urunlerin detay sayfasina hesaplayici eklenir.

**Artilari**
- urun baglami ile dogrudan iliskilidir

**Eksileri**
- kullanicinin istedigi global tek ortak arac davranisini karsilamaz
- preset ve genel gider mantigi icin yapay kisitlar olusturur

Secilen yaklasim: **Yaklasim A**. Ancak hesap motoru ve veri modeli, ileride urun detayinda yeniden kullanilabilecek sekilde ayri katmanlanacaktir.

---

## 6. Hedef bilgi mimarisi ve ekran davranisi

### 6.1 Route ve sidebar

Yeni route:

- `/etsy-cost-calculator`

Sidebar sirasi:

1. `Urunler / ...`
2. `Bildirimler`
3. `Cop Kutusu`
4. `Etsy Maliyet Hesaplayici`
5. `AI Baglantilari`
6. `Ayarlar`

Bu ekran owner bagli olmayacagi icin `/owners/:ownerKey/...` route yapisina sokulmayacaktir.

### 6.2 Ana ekran bolumleri

Sayfa alttaki ana kartlardan olusur:

1. **Ust baslik ve profil karti**
   - `Etsy Maliyet Hesaplayici`
   - aktif resmi profil etiketi: `Etsy Turkiye varsayilani (2026-03-28)`
   - manuel USD/TRY kuru
   - VAT modu secimi
   - currency conversion toggle
   - offsite ads modu
   - `Gelismis fee ayarlari`
   - `Varsayilan ayarlara don`

2. **Satis ve kampanya karti**
   - liste fiyati (USD)
   - musteriden alinan kargo (USD)
   - buyer-paid extras (opsiyonel gelismis alan)
   - yuzdesel indirim
   - kupon tipi ve degeri
   - ucretsiz kargo toggle
   - buyer tax collected by Etsy (opsiyonel gelismis alan)

3. **Maliyet karti**
   - urun maliyeti
   - gercek kargo maliyeti
   - paketleme maliyeti
   - ShipEntegra servis / operasyon maliyeti
   - sinirsiz ozel gider satiri

4. **Genel gider ve hedef kar karti**
   - hedef kar modu `% / USD / TRY`
   - hedef kar degeri
   - genel gider modu secimi
   - dogrudan siparis basi gider veya `toplam gider / beklenen siparis adedi` paylastirma alanlari

5. **Sonuc paneli**
   - net kar (USD)
   - net kar (TRY)
   - net marj
   - toplam Etsy fee
   - toplam operasyonel gider
   - basa bas fiyat
   - kampanyali minimum guvenli fiyat

6. **Fee breakdown tablosu**
   - her fee ve giderin acik satir bazli gostergesi
   - her satir icin `resmi varsayilan`, `override`, `kullanici girdisi` etiketi

7. **Preset araci**
   - preset kaydet
   - preset guncelle
   - preset yukle
   - preset sil

### 6.3 Gorsel ilke

Bu ekran, mevcut `Link Tracking Center` tasarim dili ile uyumlu olacak; ancak burada asiri yogun tablo hissi yerine iki kolonlu bir "girdi + sonuc" yerlesimi tercih edilecektir. Sonuc paneli sag tarafta veya ustte sabit okunur bir odak noktasi gibi davranir.

---

## 7. Hesap motoru tasarimi

### 7.1 Genel ilke

Hesap motoru frontend icinde ayri bir saf hesap katmani olarak yazilacaktir. UI bilesenleri bu motora `input -> result` cagrisi yapar.

Onerilen dosyalar:

- `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- `apps/web/src/features/etsyCostCalculator/lib/defaults.ts`
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- `apps/web/src/features/etsyCostCalculator/lib/solveTargetPrice.ts`
- `apps/web/src/features/etsyCostCalculator/lib/formatBreakdown.ts`

Bu ayrim sayesinde form state'i, hesap formulu ve render mantigi birbirine karismaz.

### 7.2 Para birimi modeli

Bu ekranin para modeli su sekilde sabitlenir:

- satisa iliskin ana Etsy alanlari **USD** kabul edilir
- tum maliyet ve ozel gider alanlari `USD` veya `TRY` olarak girilebilir
- tum hesaplar icerde once **USD normalize** edilerek yapilir
- sabit `TRY` fee kalemleri (ornegin `14 TRY`, `42 TRY`) manuel kur ile USD'ye cevrilerek net sonuca katilir
- sonuc paneli ayni anda hem `USD` hem `TRY` olarak gosterilir

Tek kur alaninin amaci budur: kullanici ister giderini TL, ister USD girsin; sistem bunu ayni hesap motorunda birlestirsin.

### 7.3 Girdi modeli

Onerilen ana input yapisi:

```ts
interface MoneyInput {
  amount: number;
  currency: "USD" | "TRY";
}

interface CouponInput {
  type: "none" | "percent" | "fixed_usd";
  value: number;
}

interface FeeProfileOverrides {
  listingRelatedFeeUsd?: number;
  transactionFeeRate?: number;
  processingFeeRate?: number;
  processingFixedTry?: number;
  regulatoryFeeRate?: number;
  currencyConversionFeeRate?: number;
  offsiteAdsRate?: number;
  vatRate?: number;
  depositFeeTry?: number;
  depositMinimumTry?: number;
  depositThresholdTry?: number;
  vatApplicableFeeKeys?: string[];
}

interface CalculatorDraft {
  usdTryRate: number;
  salePriceUsd: number;
  buyerPaidShippingUsd: number;
  buyerPaidExtrasUsd: number;
  buyerTaxCollectedByEtsyUsd: number;
  saleDiscountPercent: number;
  coupon: CouponInput;
  freeShipping: boolean;
  productCost: MoneyInput;
  actualShippingCost: MoneyInput;
  packagingCost: MoneyInput;
  shipentegraOperationCost: MoneyInput;
  customCosts: Array<{ id: string; label: string; value: MoneyInput; enabled: boolean }>;
  overheadMode: "off" | "per_order" | "allocated_total";
  overheadPerOrder?: MoneyInput;
  overheadTotalLines?: Array<{ id: string; label: string; value: MoneyInput; enabled: boolean }>;
  overheadExpectedOrderCount?: number;
  targetProfitMode: "margin_percent" | "net_profit_usd" | "net_profit_try";
  targetProfitValue: number;
  vatMode: "vat_id_provided" | "no_vat_id";
  currencyConversionEnabled: boolean;
  offsiteAdsMode: "off" | "rate_12" | "rate_15";
  includeDepositFee: boolean;
  feeProfileOverrides: FeeProfileOverrides | null;
}
```

Bu modelde iki kritik nokta vardir:

- maliyet alanlarinin para birimi secilebilir oldugu icin Turkiye'deki operasyonel gerceklik desteklenir
- resmi fee profil override'lari ayri tutuldugu icin `Varsayilan ayarlara don` aksiyonu sade kalir

### 7.4 Satis akisi kurali

Motor su sirayla hesap yapar:

1. Liste fiyati (`salePriceUsd`) baz alinir.
2. Yuzdesel indirim, **urun fiyatina** uygulanir.
3. Kupon, indirim sonrasi **urun alt toplamina** uygulanir.
4. `freeShipping` aciksa `buyerPaidShippingUsd = 0` gibi davranilir.
5. `buyerPaidExtrasUsd` siparis gelirine eklenir.
6. `buyerTaxCollectedByEtsyUsd` seller revenue'ya degil, yalnizca fee tabanina girebilecek gelismis bir alan olarak ele alinir.

Acik varsayim:

- V1'de yuzdesel indirim ve sabit/yuze kupon, Etsy'nin urun uzerindeki promosyon mantigini temsil eder; shipping uzerindeki etkileri yalnizca `freeShipping` toggle'i ile modellenir.

### 7.5 Fee tabani kurallari

#### Transaction fee tabani

Resmi yardim icerigine gore transaction fee tabani su alanlari kapsar:

- urun geliri
- musteriden alinan kargo
- buyer-paid extras / gift wrap benzeri alanlar

`buyerTaxCollectedByEtsyUsd` bu tabana varsayilan olarak girmez.

#### Processing fee tabani

Resmi yardim icerigine gore processing fee tabani su alanlari kapsar:

- urun geliri
- musteriden alinan kargo
- buyer-paid extras
- Etsy tarafindan tahsil edilen buyer tax

Bu nedenle `buyerTaxCollectedByEtsyUsd` sadece processing tabanina eklenir.

#### Regulatory operating fee tabani

Resmi yardim icerigine gore su alanlari kapsar:

- urun geliri
- musteriden alinan kargo
- buyer-paid extras

Etsy tarafindan tahsil edilen tax bu tabana varsayilan olarak girmez.

#### Offsite Ads tabani

Resmi yardim icerigine gore reklam fee'si, ad'e atfedilmis sipariste seller'in satis tutari uzerinden hesaplanir. V1'de bu taban, `buyerTaxCollectedByEtsyUsd` haric siparis geliri olarak kabul edilir.

Bu nokta resmi metinden uretilmis kontrollu bir yorumdur; gerekirse gelismis override ile duzeltilebilir.

### 7.6 Listing-related fee kurali

Resmi Etsy kaynaklari listing fee'nin tam olarak ne zaman yeniden dogacaginin listing omru ve quantity davranisina bagli oldugunu soyluyor. Bu nedenle V1 su yolu secer:

- hesaplayici, varsayilan resmi profil icinde **`listingRelatedFeeUsd = 0.20`** kullanir
- kullanici bu alani gelismis modda `0` veya farkli bir deger yapabilir
- breakdown ekraninda bu satir "varsayilan per-order listing varsayimi" olarak etiketlenir

Bu, tek urun fiyatlandirma ekraninda pratik faydayi korurken listing lifecycle gercegini de saklamaz.

### 7.7 VAT kurali

Resmi Etsy yardim icerigine gore:

- `VAT ID yoksa`, seller fee'ler ve processing fee icin VAT/KDV uygulanabilir
- `VAT ID varsa`, Etsy seller fee'leri icin charge etmeyebilir ve kullanici invoice seviyesinde farkli gorunum alir

V1 davranisi:

- `vatMode = vat_id_provided` ise fee VAT'i `0` kabul edilir
- `vatMode = no_vat_id` ise varsayilan KDV orani `%20` uygulanir
- varsayilan VAT uygulanacak fee seti:
  - listing-related fee
  - transaction fee
  - processing fee
  - regulatory operating fee
  - offsite ads fee
- `currency conversion fee` ve `deposit fee` VAT tabanina varsayilan olarak **dahil edilmeyecektir**
- gelismis fee profili icinde `vatApplicableFeeKeys` override edilebilir

Buradaki son iki satir bir **tasarim karari**dir; Etsy'nin herkese acik yardim metni tum fee alt kirilimlarini tek tek numaralamadigi icin urun, emin olmadigi kalemleri varsayilan olarak kapali getirir ve override imkani verir.

### 7.8 Deposit fee kurali

Resmi Etsy yardim icerigine gore Turkiye icin su esikler vardir:

- deposit minimum: `50 TRY`
- fee threshold: `600 TRY`
- deposit fee: `42 TRY`

Bu fee payout partisine bagli oldugu icin siparis bazli %100 otomatiklestirilemez. Bu nedenle:

- V1'de varsayilan olarak **kapali** gelir
- gelismis modda `Bu senaryoda deposit fee'yi dahil et` toggle'i ile acilir
- breakdown ekraninda `payout-bazli kosullu fee` etiketi gorunur

### 7.9 ShipEntegra kurali

Etsy yardim icerigi Turkiye'den gonderim icin ShipEntegra'yi desteklenen ucuncu taraf partner olarak gosteriyor. Ancak herkese acik resmi kaynaktan standart tek bir ucret cetveli alinmadigi icin V1 su ilkeyi benimser:

- ShipEntegra ucreti Etsy resmi fee'si gibi sabitlenmez
- `shipentegraOperationCost` ayri bir kullanici gideri olarak tutulur
- istenirse preset'ler ile `ABD kucuk paket`, `Almanya standart`, `ucretsiz kargo premium` gibi operasyon senaryolari kaydedilebilir

Bu karar, ShipEntegra fiyatini "kesin otomatik fee" gibi gostermeyip dogrulugu kullanicinin gercek operasyon verisine dayandirir.

### 7.10 Sonuc uretimi

Motor en az su ciktilari uretir:

```ts
interface ScenarioResult {
  normalizedRevenueUsd: number;
  normalizedRevenueTry: number;
  totalEtsyFeesUsd: number;
  totalEtsyFeesTry: number;
  totalOperationalCostsUsd: number;
  totalOperationalCostsTry: number;
  netProfitUsd: number;
  netProfitTry: number;
  netMarginPercent: number;
  breakEvenPriceUsd: number;
  targetSafeListPriceUsd: number | null;
  breakdown: Array<{
    key: string;
    label: string;
    amountUsd: number;
    amountTry: number;
    sourceType: "official_default" | "official_override" | "user_input" | "conditional";
    note?: string;
  }>;
}
```

### 7.11 Hedef fiyat cozumleyicisi

Indirim, kupon, yuzdesel fee, sabit TRY fee ve kosullu alanlar ayni anda oldugu icin kapali formullu bir matematik yerine **sayisal cozumleyici** tercih edilir.

Secilen yontem:

- `solveTargetPrice` fonksiyonu, liste fiyatini `USD` ekseninde artiran monotonic bir arama yapar
- once ust sinir dinamik olarak iki katina cikarilarak hedefe ulasilan bir aralik bulunur
- sonra binary search ile uygun fiyat bulunur
- cozum, kullanicinin secili aktif senaryosunda (`indirim + kupon + free shipping dahil`) hedef kari karsilayan minimum liste fiyatini verir

Bu yontem, ilerde fee kurallari genislese bile formulu yeniden yazmadan guvenli sekilde calisir.

---

## 8. UI bilesen sinirlari

Onerilen dosya yapisi:

- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- `apps/web/src/features/etsyCostCalculator/components/CalculatorHeader.tsx`
- `apps/web/src/features/etsyCostCalculator/components/FeeProfileCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/SalesCampaignCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/CostInputsCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ProfitTargetCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- `apps/web/src/features/etsyCostCalculator/components/PresetToolbar.tsx`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`

Bilesen sorumluluklari su sekilde ayrilir:

- **Page**: veri cekme, kaydetme, layout, top-level hata durumu
- **State hook**: draft state, preset islemleri, debounce / dirty state yonetimi
- **Cards**: yalnizca alanlari render etme ve kullanici etkileseimini alma
- **ResultsPanel**: hesap sonuclarini gostermek
- **FeeBreakdownTable**: acik denetlenebilir satir bazli gosterim
- **lib**: hesap formulleri ve default profil

Bu sinirlarla birlikte herhangi bir bilesen icerisine is mantigi gomulmez.

---

## 9. Kalicilik ve API tasarimi

### 9.1 Veri saklama karari

Bu ekran icin mevcut `promptPreferences` alanini tekrar kullanmak yerine, `app_settings` tablosuna yeni bir alan eklemek secilecektir.

Onerilen kolon:

- `etsy_cost_calculator_json TEXT NULL`

Gerekce:

- `promptPreferences` anlamsal olarak baska bir amaca ait
- hesaplayici state'i, preset'ler ve fee profile override'lari kendi surumlenmis blob'unda tutulmalidir
- ileride migration yapmak daha okunur olur

### 9.2 Saklanacak JSON yapisi

```ts
interface EtsyCostCalculatorStorage {
  version: 1;
  profileVersion: "etsy-tr-2026-03-28";
  draft: CalculatorDraft;
  presets: Array<{
    id: string;
    name: string;
    input: CalculatorDraft;
    createdAt: number;
    updatedAt: number;
  }>;
  updatedAt: number;
}
```

### 9.3 Backend etkisi

Degisecek backend dosyalari:

- `apps/api/src/db/schema.ts`
  - `app_settings` tablosuna `etsyCostCalculatorJson` eklenir
- `apps/api/src/db/repositories/settingsRepo.ts`
  - JSON parse/stringify eklenir
  - merge davranisi korunur
- `apps/api/src/routes/settings.ts`
  - `etsyCostCalculator?: object | null` payload validation'i eklenir

### 9.4 Frontend API etkisi

Degisecek frontend dosyalari:

- `apps/web/src/app/api.ts`
  - `AppSettingsResponse` genisletilir
  - `patchSettings` payload'ina `etsyCostCalculator` eklenir
- `apps/web/src/features/settings/...`
  - mevcut settings formlarini bozmadan merge davranisi korunur

### 9.5 Kaydetme davranisi

Kaydetme semantigi su sekilde olur:

- sayfa acildiginda mevcut storage `GET /settings` ile cekilir
- kullanici alanlari degistirdikce lokal state guncellenir
- kritik eylemlerde (`preset kaydet`, `preset sil`, `varsayilanlara don`) hemen `PATCH /settings` yapilir
- normal alan girislerinde surekli request yollamamak icin kisa debounce kullanilabilir
- save basarisiz olursa UI bunu net sekilde bildirir; lokal optimistic kalicilik "kaydedildi" gibi gosterilmez

---

## 10. Preset davranisi

### 10.1 Preset kapsami

Bir preset su alanlarin tamamini saklar:

- satis ve kampanya alanlari
- tum maliyet satirlari
- genel gider modu
- hedef kar modu ve degeri
- VAT modu
- offsite ads modu
- deposit fee toggle
- fee profile override'lari
- manuel USD/TRY kuru

### 10.2 Varsayilanlara don ile preset iliskisi

`Varsayilanlara don` butonu su anlama gelir:

- resmi Etsy fee override'lari silinir
- aktif draft icindeki fee profile override'lari `null` olur
- diger kullanici giderleri ve kampanya alanlari aynen kalir

Bu aksiyon tum draft'i sifirlamaz; yalnizca resmi fee profilini resetler.

Ayrica ayri bir `Formu temizle` aksiyonu bu iterasyona alinmaz. Cunku kullanici beklentisi fee profilinin guvenli sekilde geri alinmasidir; tum ekranin sifirlanmasi ek yanlislik riski olusturur.

### 10.3 Preset guncelleme kurali

Bir preset yuklendikten sonra kullanici degisiklik yaparsa iki secenek vardir:

- yeni preset olarak kaydet
- mevcut preset'i guncelle

Varsayilan davranis mevcut preset'i sessizce ezmemektir.

---

## 11. Hata durumlari ve kenar koseler

### 11.1 Form validasyonu

Su durumlar aktif olarak engellenecektir:

- negatif sayisal alanlar
- `usdTryRate <= 0`
- `%100` ve ustu indirim
- subtotal'i asan sabit kupon
- `allocated_total` modunda `expectedOrderCount <= 0`
- bos preset adi ile kaydetme

### 11.2 Is kurali uyarilari

Su durumlarda hesap yapilmaya devam edilir ama kullanici uyarilir:

- net kar negatif cikti
- deposit fee dahil edildi ve bu fee'nin payout bazli oldugu notu gostermelidir
- fee profile override aktif oldugu icin sonuc resmi varsayilani aynen temsil etmiyor
- currency conversion kapali oldugu halde liste para birimi / payment currency farki senaryosu varsayiliyorsa bilgi notu gosterilir

### 11.3 Cok belirsiz fee'ler

Deterministik olmayan veya herkese acik resmi tabani net sayfada yazmayan kalemler icin urun su yolu izler:

- sessiz otomatik hesap yapmaz
- ilgili kalemi manual/conditional/override olarak etiketler
- breakdown panelinde bunun neden boyle oldugunu not eder

Bu davranis, `%100 dogru` beklentisine en yakin guvenli urun davranisidir.

---

## 12. Test stratejisi

### 12.1 Unit testler

Yeni unit test kapsaminda en az su senaryolar olmalidir:

- transaction fee hesabi
- Turkiye processing fee `%6.5 + 14 TRY`
- regulatory fee `%2.27`
- currency conversion `%2.5`
- offsite ads `%12`, `%15`, `$100` cap
- VAT ID var / yok farki
- deposit fee toggle
- `%`, `USD`, `TRY` hedef kar modlari
- kupon + indirim + free shipping kombinasyonlari
- TRY girilen maliyetlerin USD normalize edilmesi
- genel gider paylastirma modlari
- binary search ile hedef fiyat cozumleme

### 12.2 Component testler

- `FeeProfileCard` override ve `Varsayilanlara don`
- `CostInputsCard` custom row ekle / sil / currency degistir
- `PresetToolbar` kaydet / guncelle / sil
- `ResultsPanel` sonucu hem USD hem TRY gosterme
- `FeeBreakdownTable` kaynak tipi etiketleri

### 12.3 E2E testler

- sidebar'da yeni menu ogesinin dogru yerde gorunmesi
- route'un acilmasi
- resmi varsayilan fee profiliyle ilk hesap
- kampanyali hedef fiyat bulma
- preset kaydedip sayfayi yenileyince geri gelmesi
- override yapip sonra varsayilanlara donunce sonucun geri degismesi

### 12.4 Fixture testleri

Gercek dunyaya yakin, sabitlenen ornek vakalar tutulmalidir:

- `20 USD kar, %25 indirim, free shipping`
- `200 TRY kar, kupon + ShipEntegra gideri`
- `VAT ID yok, currency conversion acik`
- `Offsite Ads %15 aktif`

Bu fixture'lar dokumante beklenen sonuc degerleri ile birlikte tutulursa, fee kural degisikliklerinde regression yakalamak kolaylasir.

---

## 13. Kabul kriterleri

Bu tasarim tamamlandiginda su davranislar gorulmelidir:

- kullanici sidebar'da `Etsy Maliyet Hesaplayici` menu ogesini `Cop Kutusu` ile `AI Baglantilari` arasinda gorur
- ekran tek ortak route olarak acilir
- resmi Etsy Turkiye fee profili ilk yuklemede otomatik gelir
- kullanici urun maliyeti, gercek kargo, ShipEntegra ve ozel giderleri hem TRY hem USD girebilir
- kullanici hedef kari `%`, `USD` veya `TRY` secerek ayni hesap motorunda cozdurebilir
- kampanya alanlari acikken hedef kar kampanyali senaryoda korunur
- fee breakdown ekrani her kalemi kaynagiyla birlikte gosterir
- override edilen resmi fee alanlari tek tikla varsayilana donebilir
- son aktif draft ve preset'ler uygulama yeniden acildiginda korunur
- unit/component/e2e testleri ana kritik senaryolari kapsar

---

## 14. Acik varsayimlar ve sinirlar

Bu tasarim su varsayimlari acikca kabul eder:

- V1 satis para birimini `USD` kabul eder; farkli liste para birimleri bu iterasyona alinmaz
- listing-related fee per-order hesapta varsayilan `0.20 USD` olarak temsil edilir; listing lifecycle'in tum varyasyonlari tam simulasyon edilmez
- Etsy Ads CPC, Pattern, shop setup fee ve harici finansal fee'ler otomatik Etsy resmi fee profiline degil, manual gider modeline girer
- ShipEntegra maliyeti otomatik dis servis fiyati olarak cekilmez; kullanicinin gercek operasyon verisiyle girilir
- VAT tabani icin herkese acik resmi metinde tek tek sayilmayan kalemler override edilebilir bir profil mantigiyla ele alinir
- deposit fee payout bazli oldugu icin varsayilan kapali gelir

Bu sinirlar, kapsam kacakligini engeller ve urunun guvenilirligini korur.

---

## 15. Onerilen uygulama dosya etkisi ozeti

Beklenen dosya etkisi su sinirlarda kalir:

- `apps/web/src/app/shell/AppShell.tsx`
- `apps/web/src/app/router.tsx`
- `apps/web/src/app/api.ts`
- `apps/web/src/features/etsyCostCalculator/**`
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/repositories/settingsRepo.ts`
- `apps/api/src/routes/settings.ts`
- ilgili unit/component/e2e test dosyalari

Bu degisiklik yeni ayri bir backend modulu gerektirmez; mevcut `settings` akisi uzerinden ilerlemek minimum degisiklik hedefiyle uyumludur.
