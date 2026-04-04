# Etsy Maliyet Hesaplayici Dogruluk ve Urun Maliyeti Entegrasyonu Tasarimi

**Tarih:** 2026-03-30  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, `apps/api`, `docs/superpowers`  
**Ilgili onceki spec'ler:**  
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\superpowers\specs\2026-03-28-etsy-cost-calculator-design.md`  
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\superpowers\specs\2026-03-28-etsy-cost-calculator-quick-mode-redesign-design.md`  
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\superpowers\specs\2026-03-28-gtip-us-duty-integration-design.md`

---

## 1. Amac

Bu degisikligin amaci, Etsy Maliyet Hesaplayici ozelligini iki farkli kullanim yuzeyinde ayni cekirdek matematikle calisan, ancak kullaniciya on yuze ciktiginda cok daha sade gorunen bir dogruluk modeline donusturmektir:

1. **Hizli fiyat formu**
2. **Urun detayinda otomatik maliyet gorunumu**

Kullanicidan gelen net ihtiyac su sekilde sabitlenmistir:

- sonuc olabildigince dogru olmali
- on yuzde hesap kullanimi cok kolay olmali
- sistem arkada otomatik olarak daha cok isi kendi yapmali
- `ABD` ve `Diger` olmak uzere sadece iki hedef profil olmali
- `duty` etkisi sadece `ABD` icin ele alinmali
- hizli formda kullanici ABD icin sadece manuel `% duty` girebilmeli
- urun detay ekraninda ise sistem urunu analiz edip uygun ABD siniflandirmasini otomatik secmeli
- ancak otomatik secim yeterince guvenli degilse ABD maliyeti **kilitli** kalmali; yanlis kesin sonuc gosterilmemeli
- ShipEntegra kargo mantigi otomatik tahminle gelmeli, kullanici isterse override edebilmeli
- Trendyol urun fiyati otomatik maliyet girdisi olarak kullanilmali, kullanici isterse override edebilmeli
- secili varyant degistikce maliyetler anlik yeniden hesaplanmali

Bu belge, hesap makinesinin sadece UX'ini degistiren bir revizyon degil; ayni zamanda ABD maliyet modelini, urun detay entegrasyonunu ve dogruluk sinirlarini yeniden tanimlayan bir tasarimdir.

---

## 2. Mevcut durum ve asil problem

Kod tabani incelendiginde bugun su durum gorulmektedir:

- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\lib\types.ts` mevcut hesaplayici taslaginda `importDutyEnabled`, `importDutyRate`, `selectedTariffCode` gibi alanlar tasimaktadir.
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\components\ImportDutyCard.tsx` bugun GTIP secimine bagli opsiyonel bir `ABD ithalat vergisi` karti gostermektedir.
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\product\components\ProductTariffPanel.tsx` urun detayinda GTIP / ABD vergi analizi tavsiyeleri gostermektedir.
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\product\routes\ProductDetailPage.tsx` urun detayinda varyant, degisim gecmisi ve GTIP panelini bir araya getirmektedir.
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\app\api.ts` icindeki `ProductDetailResponse` modeli urun, varyant ve tarife analiz ozetini tasimaktadir.

Mevcut yapida su UX ve dogruluk sorunlari bulunmaktadir:

- hizli hesap deneyimi hala kullanicinin zihninde fazla kavram tasimaktadir
- `duty` kavrami ile `GTIP/HTS` kavrami yeterince ayrismamistir
- urun detayindaki GTIP tavsiyesi ile maliyet hesaplayicidaki sonuc arasinda kullanici tarafindan kolay algilanan bir tek-akis yoktur
- `ABD` ve `Diger` gibi yalnizca iki hedef mantigi kullanici icin yeterli olmasina ragmen veri modeli daha acik uclu hissedebilmektedir
- kullanici urune girdiginde secili varyant icin "simdi bana bunun Etsy'de maliyeti ne?" sorusuna tek bakista cevap alamamaktadir
- sistem bir tavsiyeyi otomatik secse bile guven dusuk oldugunda hatali bir kesinlik izlenimi verebilir

Temel problem su hale gelmistir:

**Hizli karar vermek isteyen kullaniciya sade bir yuzey, urun bazli daha dogru hesap isteyen kullaniciya ise daha guclu ama kontrollu bir otomasyon ayni feature icinde birlikte sunulmalidir.**

---

## 3. Dis arastirma ozeti ve tasarimi etkileyen kilit bulgular

Bu tasarim 2026-03-30 tarihinde resmi ve birincil kaynaklar kullanilarak sekillendirilmistir.

### 3.1 GTIP / HS / HTS iliskisi

- USITC'ye gore ABD ithalat siniflandirmasi icin resmi kaynak **HTSUS / HTS** yapisidir.
- Ilk 6 hane uluslararasi HS sistemi ile ortak olsa da, ABD ithalatinda kullanilan kod 10 haneli **HTS statistical reporting number** seviyesindedir.
- USITC'ye gore duty oranlari yasal olarak 8-digit legal provision seviyesinde atanir; 10-digit seviye ise raporlama icin kullanilir, ancak girislerde yine de 10-digit numara kullanilir.
- USITC, ithal edilecek malin dogru siniflandirmasi icin HTS arama, CROSS kararlarini inceleme ve gerekirse CBP'den baglayici karar alma yolunu onermektedir.

### 3.2 De minimis ve ABD'ye gonderim gercegi

- 2025 icinde ABD'nin de minimis muafiyetine iliskin kurallari degismistir.
- 2026-02-20 tarihli Beyaz Saray karari, belirli ticari gonderiler icin duty-free de minimis muafiyetinin butun ulkeler acisindan askida tutuldugunu teyit etmektedir.
- Bu nedenle "800 USD altindaysa otomatik vergisiz" gibi onceki basit varsayimlar ABD maliyet modeli icin guvenilir kabul edilmemelidir.

### 3.3 Turkiye mensei ve ek tarifeler

- 2025-07-31 tarihli Beyaz Saray ekinde `articles the product of Turkey` icin ilgili subheading uzerine `+ 15%` gorevli ek duty satirlari yer almaktadir.
- Bu oran, urune uygulanan tek kalem anlamina gelmez; asil duty satiri, siniflandirma satiri ve istisnalar yine HTS tarafinda okunur.

### 3.4 ShipEntegra gozlemleri

- ShipEntegra'nin Mart 2026 tarihli satici kilavuzu, ABD'ye gonderimlerde HS/HTS siniflandirmasinin ve guncel gumruk maliyetinin onemini vurgulamaktadir.
- Ayni kilavuz, Turkiye'den ABD'ye gonderimlerde de minimis avantajinin artik basit varsayimla kullanilamayacagini belirtmekte ve ABD gumruk hesaplama araci ile planlama yapilmasini onermektedir.
- Kilavuza gore ABD ithalat maliyeti planlamasinda FOB/transaction value mantigi, duty, MPF ve servis secimi gibi unsurlar ayrisiktir.

### 3.5 Tasarima yansiyan sonuc

Bu kaynaklardan su tasarim ilkeleri cikmistir:

1. **Hizli formda otomatik HTS zorlugu kullaniciya yuklenmemelidir.**  
2. **Urun detayinda otomatik siniflandirma yapilabilir, ancak guven dusukse sonuc kilitlenmelidir.**  
3. **ABD maliyet modeli sadece tek bir sabit duty oranina indirgenmemelidir; urun detay tarafinda resmi kod/profil yapisi bulunmalidir.**  
4. **Kullanici icin on yuze cikan fark yalnizca `ABD` ve `Diger` olmalidir.**

> Not: Turkiye icin `+15%` tarife kuralinin urun bazli uygulamasi resmi kaynaklardan yorumlanarak modele alinacaktir. Uygulamada kullanilan nihai kuralin gecerli olup olmadigi veri senkronizasyonu sirasinda versiyonlu sekilde tutulacaktir. Bu belge burada bir tasarim cikarimi yapmaktadir.

### 3.6 Kullanilan temel kaynaklar

- USITC FAQ - tariff classification ve HTS kullanim rehberi  
  [https://www.usitc.gov/harmonized_tariff_information/frequently_asked_questions](https://www.usitc.gov/harmonized_tariff_information/frequently_asked_questions)
- USITC Definitions and Classifications  
  [https://www.usitc.gov/faq_subsection/definitions_and_classifications](https://www.usitc.gov/faq_subsection/definitions_and_classifications)
- White House - Further Modifying the Reciprocal Tariff Rates, 31 Temmuz 2025  
  [https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/](https://www.whitehouse.gov/presidential-actions/2025/07/further-modifying-the-reciprocal-tariff-rates/)
- White House - Continuing the Suspension of Duty-Free De Minimis Treatment for All Countries, 20 Subat 2026  
  [https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/](https://www.whitehouse.gov/presidential-actions/2026/02/continuing-the-suspension-of-duty-free-de-minimis-treatment-for-all-countries/)
- ShipEntegra Satici Kilavuzu, Mart 2026  
  [https://www.shipentegra.com/blog/wp-content/uploads/2026/03/ShipEntegra_SaticiKilavuzu_TR_compressed.pdf](https://www.shipentegra.com/blog/wp-content/uploads/2026/03/ShipEntegra_SaticiKilavuzu_TR_compressed.pdf)

---

## 4. Onaylanan urun kararlari

Kullanici ile netlesen urun kararlari sunlardir:

- secilecek ana cozum **iki yuzey, tek motor** mimarisidir
- sistem sadece iki hedef profil kullanir:
  - `ABD`
  - `Diger`
- `duty` mantigi yalnizca `ABD` icin gecerli olur
- `Diger` profilinde otomatik duty hesaplanmaz
- hizli fiyat formunda kullanici yalnizca manuel `% duty` girebilir
- urun detay ekraninda sistem otomatik ABD siniflandirma profili secmeye calisir
- bu otomatik secimin guveni dusukse ABD maliyet kutusu **kilitli** kalir
- hizli form HTS / GTIP detaylariyla kirletilmez
- Trendyol urun fiyati varsayilan maliyet olarak otomatik kullanilir, fakat manuel override desteklenir
- ShipEntegra kargo maliyeti once varsayilan/otomatik tahminle gelir, kullanici isterse override eder
- override edilen tum sayisal degerler sonuclari anlik olarak yeniden hesaplatir
- urun detayinda secili varyant ana hesap birimidir
- kullanici urune girdiginde secili varyant icin hem `ABD` hem `Diger` maliyetini tek bakista gorebilmelidir
- hesaplama basliklarinin yaninda `?` yardim ikonlari bulunur
- hover aciklamalari sade Turkce ile neyin ne ise yaradigini anlatir
- urun bazli ABD kod/kategori kopyalamasi icin genis kategori adlari yerine daha spesifik urun tipi profilleri tutulur
- hizli form, `duty nedir` veya `HTS nedir` gibi kavramlari zorunlu bilgi olarak istemez

---

## 5. Degerlendirilen yaklasimlar

### Yaklasim A - Cift yuzey, tek hesap motoru (**secilen**)

- hizli fiyat formu ayri sade yuzey olur
- urun detay maliyet gorunumu ayri uzman yuzey olur
- ikisi de ayni hesap motorunu ve ortak fee/donusum mantigini kullanir

**Artilari**

- on yuze en sade deneyimi verir
- urun detayinda daha yuksek dogruluk akisini bozmadan tutar
- manuel duty ihtiyacini hizli formda cozer
- ortak motor sayesinde tutarlilik korunur

**Eksileri**

- kullaniciya iki farkli giris deneyimi anlatilmalidir
- urun detay ile hizli form arasindaki rol farki net etiketlenmelidir

### Yaklasim B - Tek evrensel hesaplayici

Tum kullanimlar ayni sayfada birlesir; gelismis kisimlar kosullu acilir.

**Artilari**

- tek ekran fikri daha yalindir

**Eksileri**

- HTS, guven skoru, duty, ShipEntegra override ve urun baglami ayni sayfada toplandiginda ekran hizla kalabaliklasir
- kullanicinin istedigi "cok kolay hizli form" hedefi zayiflar

### Yaklasim C - Kod kutuphanesi merkezli deneyim

Kullanici once kod profillerini kurar, urunler bu profillere baglanir.

**Artilari**

- operasyonel denetlenebilirlik yuksektir
- tekrar eden urun ailelerinde guclu olabilir

**Eksileri**

- ilk kullanim surtunmesini arttirir
- otomatik analizle "direkt soyle" beklentisine ters duser

Secilen yon: **Yaklasim A**.

---

## 6. Hedef yuksek seviye mimari

Sistem uc ana parcadan olusur:

1. **Ortak Etsy maliyet motoru**
2. **Hizli fiyat formu yuzeyi**
3. **Urun detay maliyet ve siniflandirma yuzeyi**

### 6.1 Ortak Etsy maliyet motoru

Ortak motor alttaki sorumluluklari tasir:

- Etsy fee profili
- kur donusumu
- net kar solver'i
- indirimli liste fiyati solver'i
- basa bas fiyati solver'i
- operasyonel maliyet toplami
- manuel veya otomatik duty etkisi
- kaynak etiketleme (`auto`, `manual_override`, `profile_default`, `analysis_selected`)

Bu katman `apps/web/src/features/etsyCostCalculator/lib` icindeki mevcut motorun genisletilmis hali olarak dusunulur; ayni matematik urun detayi tarafinda da yeniden kullanilir.

### 6.2 Hizli fiyat formu yuzeyi

Bu yuzey sade karar alma araci olarak kalir. Otomatik siniflandirma burada yoktur.

### 6.3 Urun detay maliyet yuzeyi

Bu yuzey daha guclu veri akislarini birlestirir:

- urun basligi
- aciklama
- attribute'lar
- varyant bilgisi
- mevcut tarife analizi
- daha once onaylanmis urun tipi profilleri
- ShipEntegra kargo tahmin girisleri

Bu yuzeyde ABD kodu/profili otomatik secilir; dusuk guvende sonuc kilitlenir.

---

## 7. Kullanici deneyimi ve ekran davranisi

### 7.1 Hizli fiyat formu

Bu ekranin amaci kullaniciya 10-15 saniyede satis karari verdirmektir.

On yuze ilk anda cikan alanlar:

- hedef profil secimi: `ABD / Diger`
- urun maliyeti
- gercek kargo maliyeti
- USD/TRY kuru
- indirim yuzdesi
- hedef kar tipi:
  - `X USD kar`
  - `%X kar`
  - `Basa bas`
- hedef deger
- sadece `ABD` seciliyken: manuel `duty %`

Ana sonuc alani buyuk tipografi ile:

- onerilen Etsy satis fiyati
- indirimliyken hedef kari koruyan liste fiyati
- basa bas fiyat
- tahmini net kar
- toplam gider ozeti

Gizli/gelismis alanda kalacaklar:

- paketleme
- ShipEntegra operasyon gideri
- ozel gider satirlari
- gelismis Etsy fee override alanlari

#### 7.1.1 Yardim ikonlari

Hizli form, urun detay ve breakdown tablosundaki kritik hesap basliklarinin yanina `?` ikonu eklenir.

Ornek tooltip basliklari:

- `Duty`: "ABD'ye giriste urune uygulanabilecek ithalat vergi etkisi. Hizli formda bu alani yuzde olarak sen belirlersin."
- `Basa bas`: "Tum giderlerden sonra zarar etmeden satabilecegin minimum fiyat."
- `Hedef kar`: "Tum giderlerden sonra elinde kalmasini istedigin net kazanc."
- `Manuel override`: "Sistemin tahmini yerine kendi degerini kullaniyorsun."

Tooltip dili kisa, sade ve dogrudan fayda odakli olur. Urun detay tarafinda da benzer yardimlar su kavramlari aciklar:

- `ABD maliyeti`: "ABD'ye satis senaryosunda, dogrulanmis veya yeterince guvenli veriye gore hesaplanan toplam maliyet."
- `Hesap kilitli`: "Sistem ABD siniflandirmasindan yeterince emin degil. Yanlis kesin sonuc gostermemek icin hesap kapatildi."

### 7.2 Urun detay maliyet gorunumu

Urun detay ekraninda secili varyant baz alinir.

Kullanici urune girdiginde tek bakista sunulacak ana kutular:

- secili varyant Trendyol maliyeti
- `ABD toplam maliyet`
- `Diger toplam maliyet`
- `ABD basa bas Etsy fiyati`
- `Diger basa bas Etsy fiyati`

ABD tarafi durum etiketiyle gelir:

- `otomatik dogrulandi`
- `inceleme gerekli`
- `hesap kilitli`

Dusuk guvende:

- ABD maliyet karti sonuc gostermez
- kilit nedenini kisa yazar
- kullaniciya dogrulama aksiyonu sunar

### 7.3 Override davranisi

- Trendyol fiyati otomatik dolar
- ShipEntegra tahmini otomatik dolar
- kullanici isterse bunlari degistirir
- degistigi anda sonuc canli guncellenir
- ilgili satirin kaynagi `manuel override` etiketiyle isaretlenir

---

## 8. Dogruluk modeli ve ABD duty mantigi

### 8.1 Hizli form dogruluk modeli

Hizli form bir **siniflandirma araci** degil, bir **fiyat karar araci** olarak tanimlanir.

Bu nedenle ABD secildiginde:

- kullanici manuel `% duty` girer
- motor bu oran uzerinden sonucu hesaplar
- form sonucu "girilen duty oranina gore" mantigiyla calisir

Burada HTS arama, GTIP secimi veya guven skoru gerektirilmez.

### 8.2 Urun detay dogruluk modeli

Urun detay ekraninda sistem otomatik siniflandirma yapar.

Kullanilan sinyaller:

- baslik
- marka
- kategori
- aciklama
- attribute'lar
- gorsel/gorsel ozeti sinyalleri
- mevcut GTIP / tarife analiz secimi
- daha once kaydedilmis spesifik urun tipi profilleri

Sistem bu sinyallerden:

1. aday urun tipi profili bulur
2. aday ABD HTS profilini secer
3. ilgili duty ozetini ve gerekiyorsa ek tarifeyi uygular
4. guven skorunu uretir

### 8.3 Guven kilidi

ABD siniflandirma secimi icin en az iki durum bulunur:

- **high_confidence** -> ABD maliyeti acilir
- **low_confidence** -> ABD maliyeti kilitli kalir

Bu akista dusuk guvenli tahmini sonuc kullaniciya "kesinmis gibi" gosterilmez.

### 8.4 Resmi kod ve profil modeli

Sistemde iki farkli katman bulunur:

1. **resmi master tarife verisi**
2. **kullanici dostu urun tipi profilleri**

Resmi master veri:

- ABD HTS kodu
- duty satiri/ozeti
- versiyon
- effective tarihleri
- kaynak referansi

Kullanici dostu profil:

- `925 gumus kolye`
- `pirinc kupe`
- `seramik kahve kupasi`
- `pamuklu kadin tisort`

Bu profiller genis kategori degil, tekrar kullanilabilir **spesifik urun arketipi** seviyesinde tutulur.

### 8.5 "100% dogruluk" siniri

Bu ozellik operasyonda "yanlis kesinlik vermeme" ilkesini benimser.

Tasarim yorumu sunlardir:

- sistem, yuksek guvenli otomatik secim varsa kesin hesap acabilir
- dusuk guvende hesap kilitlenir
- resmi olarak baglayici siniflandirma otoritesi yine CBP'dir

Buradan cikan urun ilkesi:

**Uygulama, kendi guveninin yetmedigi yerde sonucu gostermez; boylece UX sade kalsa da yanlis otomasyonla dogruluk hedefi zedelenmez.**

---

## 9. Veri modeli ve kalicilik

### 9.1 Basit hedef profili modeli

Hedef profiller yalnizca sunlar olur:

- `US`
- `OTHER`

Baska ulke profili bu kapsama dahil edilmez.

### 9.2 Hesaplayici taslagi

Mevcut `CalculatorDraft` modeli asagidaki yone evrilir:

- `destinationProfile: "US" | "OTHER"`
- hizli form icin `manualDutyPercent`
- secili varyant baglami icin `linkedVariantId` veya esdeger referans
- kullanicinin manuel override kaynaklari

`importDutyEnabled` ve `selectedTariffCode` gibi alanlar hizli form ile urun detay akisini birbirine karistirmayacak sekilde yeniden adlandirilir veya ayristirilir:

- hizli form duty etkisi -> manuel oran
- urun detay ABD profili -> analiz/profil secimi

### 9.3 Urun bazli maliyet kayitlari

Her urun icin su bilgiler tutulabilir:

- otomatik Trendyol maliyeti
- manuel maliyet override
- otomatik ShipEntegra tahmini
- manuel kargo override
- aktif ABD profil referansi
- ABD siniflandirma guven durumu
- secili varyant baglami

### 9.4 Kod profil kutuphanesi

Ayrica ayri bir veri yapisi gerekir:

- `id`
- `profileName`
- `htsCode8LegalProvision`
- `htsCode10`
- `description`
- `dutySummary`
- `sourceType`
- `confidenceMode`
- `lastVerifiedAt`
- `sourceRevision`

Bu kutuphane urunlere baglanir; tekrar eden urun tiplerinde yeniden arama ihtiyacini azaltir.

### 9.5 Resmi master tarife verisi

Sistemin dogru hesap icin elle kod yazmak yerine resmi veriyi tutmasi gerekir.

Bu nedenle ayri bir senkron veri katmani tasarlanir:

- `htsCode8LegalProvision`
- HTS kodu
- satir aciklamasi
- duty ozeti
- ek note / ek tarife referansi
- versiyon / effective tarihleri
- kaynak URL veya source meta

Bu katman, gelecekte guncel revizyonlari yeniden ice alma imkani verir.

---

## 10. Hesaplama motoru davranisi

### 10.1 Temel ciktilar

Hizli form icin ana ciktilar:

- onerilen satis fiyati
- indirimliyken hedef kari koruyan liste fiyati
- basa bas fiyat
- tahmini net kar

Urun detay icin ana ciktilar:

- `ABD toplam maliyet`
- `Diger toplam maliyet`
- `ABD basa bas Etsy fiyati`
- `Diger basa bas Etsy fiyati`

### 10.2 Temel formuller

Toplam operasyonel maliyet =

- urun maliyeti
- gercek kargo
- paketleme
- ShipEntegra operasyon gideri
- ozel giderler
- varsa duty etkisi

Toplam Etsy etkisi =

- listing fee
- transaction fee
- payment processing
- regulatory fee
- opsiyonel diger resmi fee kalemleri

Toplam maliyet =

- operasyonel maliyetler
- Etsy etkileri

Basa bas fiyat =

- net kari `0` yapan minimum satis fiyati

Hedef fiyat =

- secilen hedef kar tipini saglayan satis fiyati

Indirimli guvenli liste fiyat =

- belirtilen indirim uygulandiginda bile hedef kari koruyan liste fiyati

### 10.3 Duty uygulama mantigi

- `OTHER` -> duty her zaman `0`
- hizli form `US` -> kullanicinin girdigi manuel `% duty`
- urun detay `US` -> sadece yuksek guvenli otomatik profil veya onayli profil ile hesap

### 10.4 Kaynak etiketleme

Breakdown satirlari icin kaynak etiketi kullanilir:

- `Sistem`
- `Manuel`
- `Profil`
- `Analiz`
- `Kosullu`

Bu sayede kullanici kalemin nereden geldigini kolayca anlar.

---

## 11. Urun detay entegrasyon akisi

### 11.1 Secili varyant mantigi

Urun detay maliyet hesabi secili varyant uzerinden yapilir.

- secili varyant degisirse maliyet de degisir
- varyantin Trendyol fiyat verisi degisirse sonuc canli yenilenir
- override varsa secili varyant baglaminda uygulanir

### 11.2 Otomatik maliyet olusturma

Sistem urune girildiginde su akisi calistirir:

1. secili varyantin guncel fiyatini oku
2. varsayilan urun maliyetini buradan doldur
3. ShipEntegra tahminini olustur
4. `OTHER` maliyetini hemen hesapla
5. `US` icin siniflandirma guvenini kontrol et
6. guven yeterliyse `US` maliyetini ac
7. guven yetmiyorsa karti kilitle

### 11.3 Kullanici override sonrasi davranis

Kullanici su alanlari degistirdiginde sonuc aninda yeniden hesaplanir:

- urun maliyeti
- kargo maliyeti
- USD/TRY kuru
- indirim
- hedef kar
- manuel duty
- diger giderler

---

## 12. Hata yonetimi ve guvenlik davranisi

### 12.1 Kilitli durumlar

ABD maliyet karti asagidaki durumlarda kilitli kalir:

- otomatik siniflandirma guveni dusuk
- aktif ABD profili bulunamadi
- resmi duty verisi cozumlenemedi

### 12.2 Dusuk veri durumlari

- Trendyol fiyat verisi yoksa manuel maliyet alani one cikar
- ShipEntegra tahmini yoksa varsayilan kargo degeri gelir ama duzenlenebilir olur
- `US` maliyet hesaplanamasa bile `OTHER` maliyet gosterilmeye devam eder

### 12.3 Uyari dili

Uyari dili sakin ve kisa olur:

- "ShipEntegra tahmini kullaniliyor."
- "Manuel kargo override aktif."
- "ABD siniflandirmasi dogrulanmadan kesin maliyet gosterilmez."

---

## 13. Test stratejisi

### 13.1 Birim testleri

- basa bas solver'i
- hedef kar solver'i
- indirimli liste fiyati solver'i
- manuel duty yuzde etkisi
- kur donusumu
- override onceligi

### 13.2 Entegrasyon testleri

- urun analizinden otomatik profil secimi
- dusuk guvende ABD kartinin kilitlenmesi
- yuksek guvende ABD hesabinin acilmasi
- Trendyol fiyatindan otomatik maliyet doldurma
- ShipEntegra tahmininin override edilmesi

### 13.3 UI testleri

- `ABD / Diger` secimine gore alanlarin degismesi
- `?` tooltip iceriklerinin gorunmesi
- canli yeniden hesaplama
- urun detayinda secili varyant degisimine gore maliyetlerin yenilenmesi

### 13.4 Regresyon testleri

- mevcut Etsy fee hesaplari bozulmamalidir
- onceki preset/stored draft migrasyonu kontrollu olmalidir
- mevcut GTIP paneli ile yeni ABD maliyet gorunumu birbirini bozmaz

---

## 14. Kapsam sinirlari

Bu tasarimin ilk fazi disinda kalan konular:

- tum ulkeler icin otomatik duty motoru
- hizli formda otomatik HTS arama
- CBP binding ruling basvurusu entegrasyonu
- genis kategori adiyla otomatik toplu kod atama
- ABD disi ulkeler icin gumruk/tarife otomasyonu

---

## 15. Onerilen uygulama sonucu

Bu tasarim sonucunda urun su davranisi vermelidir:

- kullanici hizli formda karmasa yasamadan fiyat karari verebilir
- `ABD` ve `Diger` arasindaki farki tek bakista anlar
- urun detayinda secili varyant icin anlik Etsy maliyetini gorur
- sistem arkada olabildigince otomatik siniflandirma yapar
- ama guven yeterli degilse yanlis kesin hesap gostermez
- tekrar eden urun tipleri icin profil kutuphanesi zamanla sistemi hizlandirir

Bu tasarimin ana ilkesi sunlardir:

**On yuze kolaylik, arkaya otomasyon, dogrulukta ise sessiz tahmin degil kontrollu kesinlik.**
