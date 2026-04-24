# Etsy maliyet hesaplayıcı resmi kaynak analizi

**Tarih:** 2026-04-23  
**Hazırlayan:** Codex  
**Kapsam:** Etsy maliyet hesaplayıcıdaki mevcut matematiği, ShipEntegra kullanım senaryosunu ve ABD / Diger hedef profil yaklaşımını resmi ve güncel kaynaklarla doğrulamak.

---

## 1) İstek özeti

Amaç, Etsy maliyet hesaplayıcıda görünen maliyet hesabının gerçekten doğru olup olmadığını kontrol etmekti.

Özel şartlar:

- Satıcı Türkiye'den gönderim yapıyor.
- Kargo tarafında ShipEntegra kullanılıyor.
- Hedef ayrımı ülke ülke değil, sadece **ABD** ve **Diğer** olacak.
- Hesabın mümkün olduğunca resmi ve güncel kaynaklara dayanması gerekiyor.
- Çıktı sadece "şöyle olabilir" seviyesinde değil; mevcut sistemin **neyi doğru**, **neyi eksik**, **neyi yanlış** yaptığı net şekilde ortaya konmalı.

---

## 2) İncelenen mevcut kod alanları

Ana inceleme yapılan dosyalar:

- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\web\src\features\etsyCostCalculator\lib\defaults.ts`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\web\src\features\etsyCostCalculator\lib\calculateScenario.ts`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\web\src\features\etsyCostCalculator\components\QuickModeForm.tsx`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\web\src\features\etsyCostCalculator\components\CostInputsCard.tsx`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\web\src\features\etsyCostCalculator\components\FeeProfileCard.tsx`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\api\src\modules\tracking\buildShipentegraEstimate.ts`
- `C:\Users\berke\Desktop\Projelerim\dropshiping2bizbize\apps\api\src\modules\tariff\catalog\usTariffSeed.ts`

---

## 3) Resmi ve güncel kaynak araştırması

> Not: Bu bölümde özellikle **23 Nisan 2026 itibarıyla** geçerli görünen kaynaklara öncelik verildi. Tarihi değişebilen başlıklarda mümkün olduğunca yayın / güncellenme tarihleri dikkate alındı.

### 3.1 Etsy resmi ücret yapısı

#### 3.1.1 Listing fee

Etsy resmi ücret politikasına göre:

- listing fee: **0.20 USD**
- listing 4 ayda bir yenilenir
- çoklu adet satışta ilk adet dışında ek adet başına da **0.20 USD** yenileme ücreti doğabilir

Kaynak:
- [Etsy Fees & Payments Policy](https://www.etsy.com/legal/fees)

Önemli sonuç:
- `0.20 USD` doğrudur
- ama bunu **her siparişte zorunlu sabit ücret** gibi almak her zaman doğru değildir

#### 3.1.2 Transaction fee

Etsy Help ve Fees sayfasına göre:

- transaction fee: **%6.5**
- item price + shipping + gift wrap gibi order toplamı üzerinden alınır
- Etsy'nin topladığı vergi bu kaleme dahil edilmez

Kaynaklar:
- [What are the Fees and Taxes for Selling on Etsy?](https://help.etsy.com/hc/en-us/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy)
- [Fees & Payments Policy](https://www.etsy.com/legal/fees)

#### 3.1.3 Etsy Payments processing fee (Türkiye)

Etsy'nin ülke bazlı resmi processing fee tablosuna göre Türkiye için:

- **%6.5 + 14 TRY**

Ayrıca Etsy Payments Policy'ye göre processing fee:

- **gross order amount** üzerinden alınır
- buna **shipping** ve **tax (uygulanıyorsa)** dahildir

Kaynaklar:
- [What are Payment Processing Fees for Selling on Etsy?](https://help.etsy.com/hc/en-gb/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy)
- [Etsy Payments Policy](https://www.etsy.com/legal/etsy-payments)

#### 3.1.4 Regulatory operating fee

Türkiye için resmi oran:

- **%2.27**

Bu kalem:

- item price + shipping + gift wrap / personalization gibi order bileşenleri üzerinden alınır
- Etsy'nin topladığı vergi dahil edilmez

Kaynak:
- [What is a Regulatory Operating Fee?](https://help.etsy.com/hc/en-us/articles/1500011073202-What-is-a-Regulatory-Operating-Fee)

#### 3.1.5 Currency conversion fee

Etsy resmi policy'ye göre:

- seller listing currency ile payment account currency farklıysa
- **%2.5 currency conversion fee** uygulanır

Kaynaklar:
- [Fees & Payments Policy](https://www.etsy.com/legal/fees)
- [Etsy Payments Policy](https://www.etsy.com/legal/etsy-payments)

#### 3.1.6 Deposit fee (Türkiye)

Etsy resmi yardım sayfasına göre Türkiye için:

- deposit minimum: **50 TRY**
- fee threshold: **600 TRY**
- deposit fee: **42 TRY**

Ve bu kalem:

- **sipariş bazlı değil**, payout / deposit bazlıdır
- ayrıca VAT'e tabi olabilir

Kaynaklar:
- [How to Receive Your Etsy Payments Deposit](https://help.etsy.com/hc/en-us/articles/360046998234-How-to-Receive-Your-Etsy-Payments-Deposit)
- [Payment Processing Fees for Selling on Etsy](https://help.etsy.com/hc/en-gb/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy)

#### 3.1.7 VAT on seller fees

Etsy resmi VAT yardım sayfasına göre Türkiye dahil belirli ülkelerde:

- Etsy, seller fee'ler üzerine VAT uygulayabilir
- Etsy'ye VAT ID verilmemişse VAT ücretleri charge edilir
- VAT ID verilmişse seller fees için VAT charge edilmez

Kaynak:
- [How VAT Is Collected on Seller Fees](https://help.etsy.com/hc/en-in/articles/360040584433-How-VAT-Is-Collected-on-Seller-Fees)

#### 3.1.8 Offsite Ads

Etsy resmi yardıma göre:

- shop son 365 günde 10.000 USD altındaysa: **%15**
- 10.000 USD ve üzerindeyse: **%12**
- order başına üst sınır: **100 USD**

Kaynaklar:
- [How Etsy's Offsite Ads Work](https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work)
- [Fees and Taxes for Selling on Etsy](https://help.etsy.com/hc/en-us/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy)

---

### 3.2 ShipEntegra resmi bulguları

#### 3.2.1 Kargo fiyatı nasıl oluşuyor?

ShipEntegra'nın resmi fiyat hesaplama açıklamasına göre:

- fiyat için **ülke** seçilir
- **servis türü** seçilir
- **en / boy / yükseklik / ağırlık** girilir
- faturalandırılabilir ağırlık = **gerçek ağırlık ile hacimsel ağırlığın büyük olanı**
- hacimsel ağırlık formülü: `(Uzunluk x Genişlik x Yükseklik) / 5000`

Kaynaklar:
- [ShipEntegra yurt dışı kargo fiyat hesaplama](https://www.shipentegra.com/yurtdisi-kargo-fiyat-hesapla)
- [ShipEntegra SSS](https://www.shipentegra.com/sss)

Doğrudan sonuç:

- ShipEntegra kargosunu **tek sabit USD** ile modellemek resmi mantığa göre tam doğru değildir
- ağırlık, desi, servis ve hedef ülke olmadan %100 doğru navlun çıkmaz

#### 3.2.2 Etsy tarafında fiyatların ülkeye göre değişmesi

ShipEntegra'nın Etsy shipping profile içeriğine göre:

- Amerika'daki müşteri Amerika kargo fiyatını görür
- Fransa'daki müşteri Fransa kargo fiyatını görür
- fiyatlar ülkeye göre otomatik aktarılır
- güncel fiyatları manuel sabit girmenin zarar ettirebildiği özellikle belirtilir

Kaynak:
- [Etsy'de Kargo Profili Nasıl Oluşturulur?](https://www.shipentegra.com/blog/etsyde-kargo-profili-nasil-olusturulur-shipentegra)

Doğrudan sonuç:

- iş açısından **ABD / Diğer** sadeleştirmesi yapılabilir
- ama bunun adı resmi / birebir fiyat değil, kontrollü sadeleştirme olur

#### 3.2.3 Servis farklılıkları

ShipEntegra SSS'ye göre:

- **EKO** servis yalnızca ABD'ye olan **0.5 kg/desi altı** gönderiler için geçerli
- **EKSPRES** tüm ülkeler ve ölçüler için geçerli

Kaynak:
- [ShipEntegra SSS](https://www.shipentegra.com/sss)

Doğrudan sonuç:

- servis türü girilmeden doğru kargo hesabı yine eksik kalır

#### 3.2.4 ShipEntegra'nın güncel ABD gümrük rehberi

Mart 2026 tarihli ShipEntegra satıcı kılavuzuna göre:

- ABD'de 800 USD de minimis muafiyeti **29 Ağustos 2025 itibarıyla kaldırıldı** ifadesi yer alıyor
- ABD için gümrük hesaplamasında çoğu durumda **transaction value / FOB** mantığı kullanıldığı söyleniyor
- toplam nihai maliyetin sadece vergiden ibaret olmadığı; **MPF + HMF + ISF kefalet + diğer ücretler** de olabileceği yazıyor

Kaynak:
- [ShipEntegra Satıcı Kılavuzu (Mart 2026)](https://www.shipentegra.com/blog/wp-content/uploads/2026/03/ShipEntegra_SaticiKilavuzu_TR_compressed.pdf)

Çok önemli sonuç:

- ABD maliyetini sadece `tek duty yüzdesi` ile modellemek yetersizdir
- navlun / brokerage / MPF / HMF / ISF gibi ek kalemler gerekebilir

#### 3.2.5 ShipEntegra kaynakları arasında çelişki

ShipEntegra'nın SSS sayfasında hâlâ:

- "ABD için 800 Dolar" eşiği yazıyor

Ama yine ShipEntegra'nın Mart 2026 satıcı kılavuzu bunun **29 Ağustos 2025 itibarıyla kaldırıldığını** söylüyor.

Sonuç:

- ShipEntegra'nın kendi kaynaklarında bile eski / yeni içerik karışmış durumda
- bu nedenle ABD gümrük kararlarında **en üst kaynak olarak ABD resmi kaynakları** esas alınmalı

---

### 3.3 ABD resmi kaynakları

#### 3.3.1 Buyer / importer sorumluluğu

Etsy'nin resmi customs help sayfasına göre ABD'ye giren mallarda:

- buyer (importer), fee / tax / duty'den genel olarak sorumludur
- duty oluşursa CBP veya carrier processing fee de doğabilir

Kaynak:
- [Custom Fees and Physical VAT Collection](https://help.etsy.com/hc/en-us/articles/360000337247-Custom-Fees-and-Physical-VAT-Collection)

Bu madde çok önemli çünkü:

- ABD duty'yi **her zaman seller maliyeti** saymak doğru değildir
- ancak seller DDP sunuyorsa veya buyer ödemezse seller üzerinde maliyet kalabilir

#### 3.3.2 CBP - shipping bedeli duty dahil değildir varsayımı

CBP resmi Internet Purchases sayfasına göre:

- shipping and handling fiyatın içinde olsa bile bu durum duty / customs clearance ücretlerinin ödenmiş olduğu anlamına gelmez
- courier gönderilerinde broker / clearance / duty gibi ek ücretler olabilir
- importer duty'den sorumludur

Kaynak:
- [CBP Internet Purchases](https://www.cbp.gov/trade/basic-import-export/internet-purchases)

#### 3.3.3 De minimis güncel durum

Beyaz Saray'ın 30 Temmuz 2025 tarihli emri ve 20 Şubat 2026 tarihli devam kararı birlikte incelendiğinde:

- duty-free de minimis muafiyetinin küresel ölçekte askıya alındığı görülüyor
- bu konu 2025 öncesi basit "800 USD altı vergisiz" mantığından farklı bir noktaya gelmiş durumda

Kaynaklar:
- [Suspending Duty-Free De Minimis Treatment for All Countries - 30 Jul 2025](https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/)
- [Continuing the Suspension of Duty-Free De Minimis Treatment for All Countries - 20 Feb 2026](https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/)

#### 3.3.4 Türkiye için ek tarife

31 Temmuz 2025 tarihli Beyaz Saray ekinde Türkiye için:

- **Turkey: 15%** adjusted reciprocal tariff oranı yer alıyor

Kaynak:
- [Further Modifying the Reciprocal Tariff Rates - 31 Jul 2025](https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/)

Çok önemli not:

- bu oran her ürün için tek başına nihai landed-cost oranı değildir
- ürünün HTS satırı, istisnalar ve diğer ücretler ayrıca değerlendirilmelidir

---

## 4) Mevcut sistemde doğru olan kısımlar

Aşağıdaki varsayımlar mevcut kodda büyük ölçüde doğru veya en azından resmi Etsy kaynaklarıyla uyumlu:

### 4.1 Etsy fee default oranları büyük ölçüde doğru

`defaults.ts` içindeki değerler:

- listing fee = 0.20 USD
- transaction fee = 6.5%
- processing fee = 6.5% + 14 TRY
- regulatory operating fee = 2.27%
- currency conversion = 2.5%
- offsite ads = 15% default, 12 / 15 seçenekleri
- deposit fee = 42 TRY / threshold 600 TRY / min 50 TRY

Kod referansı:
- `defaults.ts:5-16`

Sonuç:
- Etsy fee default profili tamamen yanlış değil
- tam tersine ana fee yüzdeleri güncel resmi tabloya oldukça yakın

### 4.2 Payment processing base mantığı doğru yöne yakın

Kod:
- `calculateScenario.ts:60-67`

Burada processing base için:

- totalCollectedUsd + buyerTaxCollectedByEtsyUsd

kullanılıyor.

Bu, Etsy Payments Policy'deki **gross order amount including shipping and tax** mantığıyla uyumlu.

### 4.3 Regulatory fee'nin tax hariç order toplamı üzerinden hesaplanması doğru yöne yakın

Kod:
- `calculateScenario.ts:68`

Regulatory fee `totalCollectedUsd` üzerinden hesaplanıyor.

Eğer `totalCollectedUsd` gerçekten item + shipping + fee-applicable extras mantığını temsil ediyorsa bu yaklaşım doğruya yakın.

### 4.4 Deposit fee'nin her siparişte oluşmayabileceği uyarısı doğru

Kod:
- `calculateScenario.ts:149-153`

Bu warning doğru; çünkü deposit fee gerçekten order bazlı değil payout bazlıdır.

---

## 5) Mevcut sistemde ana sorunlar

## 5.1 En kritik sorun: ABD ithalat vergisi her zaman satıcının maliyeti gibi işleniyor

Kod:
- `calculateScenario.ts:121-129`
- `calculateScenario.ts:263-277`

Mevcut sistem ABD duty'yi doğrudan operational cost içine ekliyor.

Yani sistemin bugünkü yorumu fiilen şu:

- "ABD ithalat vergisini satıcı ödeyecek"

Bu her senaryoda doğru değil.

Resmi kaynaklara göre:

- Etsy tarafında ABD'ye giren ürünlerde buyer / importer genel olarak bu ücretlerden sorumlu
- CBP de importer sorumluluğunu vurguluyor

Bu yüzden mevcut sistemin bugünkü hali:

- **DDP / seller absorbs duty** senaryosunda doğru olabilir
- ama **buyer pays import charges** senaryosunda fazla maliyet yazar

### Gerekli düzeltme

Hesapta açık bir seçim olmalı:

- `Buyer pays import charges`
- `Seller pays / DDP`

Bu toggle olmadan ABD maliyeti doğru kabul edilemez.

---

## 5.2 ABD import total sadece duty yüzdesine indirgenmiş

Kod:
- `calculateScenario.ts:98-103`

Şu an:

- `shipentegraImportTotalUsd = shipentegraDutyUsd`

Yani toplam ithalat etkisi = sadece duty.

Ama resmi / güncel kaynaklar gösteriyor ki ABD tarafında gerekebilecek kalemler yalnızca duty değil:

- HTS duty
n- IEEPA / reciprocal tariff etkisi
- MPF
- HMF
- ISF kefalet (özellikle bazı taşıma senaryolarında)
- brokerage / carrier clearance maliyetleri

### Gerekli düzeltme

ABD import cost modeli en azından ayrı parçalara bölünmeli:

- `customsValueUsd`
- `htsDutyUsd`
- `extraUsTariffUsd`
- `carrierBrokerageUsd`
- `otherImportFeesUsd`
- `totalImportCostUsd`

Eğer tüm kalemler otomatik çözülemiyorsa bile kullanıcıya en azından **tek yüzde duty** yerine **ayrı import fee alanları** sunulmalı.

---

## 5.3 Tek bir kargo maliyeti alanı var; ABD ve Diğer için ayrı navlun modeli yok

Kod:
- `calculateScenario.ts:123`
- `QuickModeForm.tsx:171-180`
- `CostInputsCard.tsx:29-42`

Şu an sistemde tek bir `actualShippingCost` alanı var.

Bu şu anlama geliyor:

- kullanıcı ABD senaryosunda da
- Diğer senaryosunda da
- aynı kargo maliyetini kullanmış oluyor

Bu ShipEntegra mantığıyla çelişiyor çünkü resmi kaynaklarda fiyat:

- ülkeye göre
- servise göre
- ağırlığa göre
- desiye göre

değişiyor.

### Gerekli düzeltme

En azından şu iki ayrı alan olmalı:

- `actualShippingCostUs`
- `actualShippingCostOther`

İdeal seviye ise:

- servis türü
- gerçek ağırlık
- en / boy / yükseklik
- hedef bölge (`US`, `OTHER`)

üzerinden ShipEntegra resmi fiyat hesap mantığına bağlanmak.

---

## 5.4 ShipEntegra tahminleri resmi canlı tarife değil, hardcoded sezgisel değerler

Kod:
- `buildShipentegraEstimate.ts:20-44`
- `usTariffSeed.ts:31-113`

Burada ShipEntegra tahmini şu şekilde yapılıyor:

- ürün kelimelerine regex bakılıyor
- örn. kolye -> 4.9 USD
- tekstil -> 7.5 USD
- kupa -> 9.8 USD
- yoksa 6.25 USD

Bu yaklaşım:

- ülke kullanmıyor
- servis türü kullanmıyor
- ölçü kullanmıyor
- ağırlık kullanmıyor
- varyantlar arası boyut farkını kullanmıyor

Dolayısıyla bu sistem **ShipEntegra'nın resmi fiyat hesap mantığı değil**.

### Gerekli düzeltme

Eğer %100'e yaklaşan doğruluk hedefleniyorsa bu katman:

1. ya ShipEntegra panel / API / export edilen resmi fiyat listesi ile beslenmeli
2. ya da kullanıcıdan zorunlu olarak şu bilgiler alınmalı:
   - servis tipi
   - gerçek ağırlık
   - en / boy / yükseklik
   - hedef profil

Sadece kategori regex'i ile navlun tahmini bırakılmamalı.

---

## 5.5 ABD duty veri seti eksik ve güncel ABD tarife gerçekliğini tam yansıtmıyor

Kod:
- `usTariffSeed.ts:31-113`

Buradaki seed kayıtları sadece birkaç örnek profile dayanıyor ve şu mantıkta:

- 11%
- 8%
- 5.3%

Ama güncel ABD maliyet resmi çerçevesinde artık sadece klasik HTS duty'yi almak yetmiyor.

Ayrıca Türkiye için 31 Temmuz 2025 tarihli Beyaz Saray ekinde **15%** reciprocal tariff katmanı da var.

Buradan çıkan sonuç:

- mevcut seed veri yapısı açıklama / örnekleme için yararlı olabilir
- ama tek başına "güncel ve tam ABD maliyeti" değildir

### Gerekli düzeltme

ABD tarafı için veri modeli iki katmanlı olmalı:

- ürün sınıflandırma / HTS duty katmanı
- güncel ülke bazlı ek tarife / IEEPA / policy katmanı

---

## 5.6 Listing fee her siparişte sabit 0.20 USD kabul ediliyor

Kod:
- `calculateScenario.ts:63`
- `calculateScenario.ts:176-181`

Etsy resmi modele göre listing fee:

- listing publish / renew anında oluşur
- her order için birebir aynı şekilde doğmaz
- multi-quantity order'larda ekstra renewal davranışı olabilir

Şu anki yaklaşım:

- tek sipariş başına sabit 0.20 USD

Bu bazen kabul edilebilir bir pratik yaklaşım olsa da **%100 doğru** değildir.

### Gerekli düzeltme

En azından 3 mod olmalı:

- `always include 0.20`
- `allocate per sold quantity`
- `manual amortized listing fee`

Varsayılan açıklama da net olmalı: "sipariş başına ayrılmış listing payı".

---

## 5.7 Currency conversion fee varsayılanı kapalı; bu bazı Türk mağazalarda sonucu eksik çıkarır

Kod:
- `createDefaultDraft()` -> `defaults.ts:64-68`
- `FeeProfileCard.tsx:65-72`

Currency conversion varsayılan olarak kapalı.

Ama kullanıcı Türkiye'de Etsy Payments alıyor ve listing currency ile payment account currency farklıysa resmi olarak **2.5% conversion fee** oluşuyor.

Özellikle mağaza USD listeliyorsa bu alanın kapalı kalması sonucu eksik çıkarabilir.

### Gerekli düzeltme

Bu alan manuel checkbox olmaktan çok shop config üzerinden türetilmeli:

- payment account currency
- listing currency

aynıysa `OFF`, farklıysa `ON`.

---

## 5.8 "Ekstra tahsilat" alanı fee base açısından belirsiz

Kod:
- `QuickModeForm.tsx:152-169`
- `calculateScenario.ts:59-60`

`buyerPaidExtrasUsd` şu an genel bir ekstra tahsilat gibi davranıyor.

Ama Etsy fee tarafında önemli fark var:

- gift wrap / personalization gibi kalemler fee base'e girebilir
- bazı ekstra tahsilatlar aynı mantıkta olmayabilir

### Gerekli düzeltme

`buyerPaidExtrasUsd` en azından ikiye ayrılmalı:

- `feeApplicableExtrasUsd` (gift wrap / personalization)
- `otherCollectedAmountsUsd`

Aksi halde transaction / regulatory / offsite ads bazları bulanık kalıyor.

---

## 5.9 VAT tabanında currency conversion fee dışarıda bırakılmış; bu alan net doğrulama istiyor

Kod:
- `defaults.ts:17-24`
- `calculateScenario.ts:105-119`

Şu an VAT base listesinde:

- listing
- transaction
- processing
- regulatory
- offsite ads
- deposit

var.

Ama `currency_conversion_fee` varsayılan VAT uygulanabilir fee listesine alınmamış.

Resmi Etsy VAT sayfası seller fee'ler için genel VAT charge mantığı anlatıyor; açık bir "currency conversion fee VAT dışıdır" metni bulunamadı.

### Sonuç

Bu alan için kesin hüküm vermek yerine şu not doğru olur:

- mevcut kod burada muhafazakâr / eksik kalıyor olabilir
- aylık Etsy VAT invoice ile gerçek hesap örneği üzerinden doğrulanmalı

---

## 6) Mevcut sistem için net hüküm

### Kısa hüküm

Mevcut sistem:

- **Etsy fee yüzdelerinde büyük ölçüde doğruya yakın**
- ama **ShipEntegra + ABD import maliyeti tarafında %100 doğru değil**
- özellikle ABD tarafında **satıcı mı öder, alıcı mı öder** ayrımı olmadığı için kritik ölçüde yanıltıcı olabilir

### En büyük sapma alanları

1. **ABD duty her zaman satıcı maliyeti sayılıyor**  
2. **ABD import total = sadece duty** yapılıyor  
3. **ShipEntegra navlun tarafı resmi canlı tarifeye bağlanmıyor**  
4. **ABD / Diğer için ayrı kargo alanı yok**  
5. **ABD güncel de minimis / ek tarife gerçekliği veri modeline tam yansımıyor**  
6. **listing fee her siparişte sabit kabul ediliyor**

---

## 7) Bana göre düzeltilmesi gerekenler - öncelik sırasıyla

## P1 - Mutlaka düzelmeli

### 7.1 Import charge payer seçimi eklenmeli

Yeni alan:

- `importChargesPaidBy = buyer | seller`

Davranış:

- `buyer` ise ABD duty / import charges net karı düşürmemeli
- `seller` ise operasyonel maliyete eklenmeli

### 7.2 ABD import cost modeli parçalı hale getirilmeli

En azından:

- customs value
- duty
- ek tarife
- carrier/brokerage
- diğer ithalat gideri

ayrı tutulmalı

### 7.3 Kargo maliyeti ABD ve Diğer için ayrılmalı

Yeni alanlar:

- `shippingCostUs`
- `shippingCostOther`

İdeal ek alanlar:

- serviceType
- weightKg
- lengthCm
- widthCm
- heightCm

### 7.4 ShipEntegra resmi fiyat mantığına yaklaşılmalı

En doğrusu:

- ShipEntegra panel / API / export edilen güncel fiyat datası

En az minimum doğru çözüm:

- ülke grubu + servis + ağırlık + desi ile kullanıcıdan veri almak

## P2 - Güçlü doğruluk iyileştirmesi

### 7.5 Listing fee allocation modu eklenmeli

### 7.6 Currency conversion otomatik türetilmeli

### 7.7 Fee-applicable extras alanı ayrılmalı

## P3 - Operasyonel kalite iyileştirmesi

### 7.8 Kaynak versiyonu UI'da gösterilmeli

Örn:

- Etsy fee profile verified: 2026-04-23
- US tariff policy verified: 2026-04-23
- ShipEntegra pricing basis: manual / live / imported list

### 7.9 Outdated source warning eklenmeli

ShipEntegra'nın bazı eski sayfaları ABD için hâlâ 800 USD eşiği söylüyor.
Sistem bu tip kaynak çakışmalarında güncel resmi kaynağı öne almalı.

---

## 8) Son söz

Bugünkü kod tabanı tamamen yanlış değil.

Özellikle Etsy fee profili kısmı:

- oranlar
- processing fee
- regulatory fee
- deposit fee
- offsite ads

başlıklarında iyi bir temel üzerinde.

Ancak senin hedeflediğin seviye **"%100 doğruya mümkün olduğunca yaklaşan maliyet hesabı"** olduğu için asıl problem Etsy komisyonlarında değil; daha çok şuralarda:

- **ABD import cost'un seller cost gibi zorunlu yazılması**
- **ShipEntegra kargo maliyetinin resmi hesap mantığına bağlanmaması**
- **ABD / Diğer ayrımı yapılırken tek shipping input ile gidilmesi**
- **2025-2026 ABD gümrük değişikliklerinin tam modele yansımaması**

Bu yüzden mevcut hesaplayıcıya bugün için benim net değerlendirmem şu:

> **Etsy fee tarafı kısmen güvenilebilir, ama ShipEntegra + ABD landed-cost tarafı şu haliyle %100 doğru kabul edilemez.**

---

## 9) Kaynak listesi

- Etsy Fees & Payments Policy: https://www.etsy.com/legal/fees
- Etsy Payments Policy: https://www.etsy.com/legal/etsy-payments
- Etsy Fees and Taxes Help: https://help.etsy.com/hc/en-us/articles/115014483627-What-are-the-Fees-and-Taxes-for-Selling-on-Etsy
- Etsy Payment Processing Fees: https://help.etsy.com/hc/en-gb/articles/115015628847-What-are-Payment-Processing-Fees-for-Selling-on-Etsy
- Etsy Regulatory Operating Fee: https://help.etsy.com/hc/en-us/articles/1500011073202-What-is-a-Regulatory-Operating-Fee
- Etsy VAT on Seller Fees: https://help.etsy.com/hc/en-in/articles/360040584433-How-VAT-Is-Collected-on-Seller-Fees
- Etsy Offsite Ads: https://help.etsy.com/hc/en-us/articles/360000338367-How-Etsy-s-Offsite-Ads-Work
- Etsy Customs / VAT Collection: https://help.etsy.com/hc/en-us/articles/360000337247-Custom-Fees-and-Physical-VAT-Collection
- ShipEntegra Etsy: https://www.shipentegra.com/etsy
- ShipEntegra Price Calculator: https://www.shipentegra.com/yurtdisi-kargo-fiyat-hesapla
- ShipEntegra FAQ: https://www.shipentegra.com/sss
- ShipEntegra Etsy Shipping Profile Article: https://www.shipentegra.com/blog/etsyde-kargo-profili-nasil-olusturulur-shipentegra
- ShipEntegra Seller Guide (Mar 2026): https://www.shipentegra.com/blog/wp-content/uploads/2026/03/ShipEntegra_SaticiKilavuzu_TR_compressed.pdf
- CBP Internet Purchases: https://www.cbp.gov/trade/basic-import-export/internet-purchases
- White House - Suspensing de minimis globally (2025-07-30): https://www.whitehouse.gov/presidential-actions/2025/07/suspending-duty-free-de-minimis-treatment-for-all-countries/
- White House - Continuing de minimis suspension (2026-02-20): https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/
- White House - Further Modifying Reciprocal Tariff Rates (Turkey 15%): https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/
