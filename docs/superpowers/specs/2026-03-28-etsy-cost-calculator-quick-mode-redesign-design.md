# Etsy Maliyet Hesaplayici Hizli Mod Yeniden Tasarimi

**Tarih:** 2026-03-28  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/web`, gerekirse kucuk tip/validation guncellemeleri icin `apps/api`, `docs/superpowers`  
**Ilgili onceki spec:** `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\superpowers\specs\2026-03-28-etsy-cost-calculator-design.md`

---

## 1. Amac

Bu revizyonun amaci, mevcut **Etsy Maliyet Hesaplayici** ozelligini matematiksel olarak degistirmek degil, onu **ilk bakista daha az yorucu**, **hizli karar vermeye daha uygun** ve **dogru satis fiyatini daha cabuk bulduran** bir deneyime donusturmektir.

Kullanicidan gelen net ihtiyac su sekilde sabitlendi:

- ekran bugunku halinde fazla kalabalik hissediyor
- ana is, yani "istedigim kar marjina gore dogru satis fiyatini bulma" yeterince hizli degil
- kullanici minimum bilgi girerek sonuca ulasmak istiyor
- yine de sonucun neden boyle ciktigini gorebilmek istiyor

Bu nedenle hedeflenen urun davranisi sunlardir:

- hesaplayici ayni route uzerinde kalir: `/etsy-cost-calculator`
- varsayilan deneyim, wizard degil; **tek sayfa hizli mod** olur
- ilk ekranda sadece karar icin gerekli minimum alanlar gorunur
- varsayilan odak **"Hedef kar icin satis fiyati bul"** akisi olur
- kullanici isterse kendi satis fiyatini da girip onerilen fiyatla karsilastirabilir
- ileri ayarlar ana akis disina tasinir, sagdan acilan panelde yasar
- fee breakdown gizlenmez; aksine ilk anda acik gelir
- mevcut hesap motoru, fee kurallari, preset kayit mantigi ve kalicilik korunur

Bu belge, mevcut motoru koruyup UX katmanini yeniden tasarlayan bir spesifikasyondur.

---

## 2. Mevcut durum ve asil problem

Mevcut uygulama kodunda `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\routes\EtsyCostCalculatorPage.tsx` sayfasi su ana bloklarla acilmaktadir:

- `CalculatorHeader`
- `FeeProfileCard`
- `SalesCampaignCard`
- `CostInputsCard`
- `ProfitTargetCard`
- `FeeBreakdownTable`
- `ResultsPanel`
- `PresetToolbar`

Bu yapi islevsel olarak zengindir; ancak ilk acilista kullaniciya cok sayida alan ve karar ayni anda gosterildigi icin temel kullanim hedefini golgeler.

Bugunku UX sorunlari sunlardir:

- ilk gorunumde fazla sayida kart vardir; kullanici nereye bakacagini hemen anlayamaz
- resmi fee profili, kampanya, ozel giderler, hedef kar ve preset kontrolleri ayni hizada gorundugu icin oncelik duygusu zayiflar
- kullanicinin asil sormak istedigi soru genelde "Bu urunde hedef kara gore kac dolardan satmaliyim?" iken mevcut ekran bu soruyu ana akis olarak one cikarmiyor
- mevcut fiyatla karsilastirma yapmak mumkun olsa bile, bu davranis hizli modda toplanmis bir deneyim olarak sunulmuyor
- detay alanlar ana akisla ayni gorunumde oldugu icin ekran kolaylastirilmis degil, sadece zenginlestirilmis hissediyor

Temel problem bu noktada hesap motorunun yetersizligi degil; **dogru motorun dogru sirada sunulamamasi**dir.

---

## 3. Tasarimin ana hedefleri ve hedef disi konular

### 3.1 Ana hedefler

Bu revizyonda asagidaki hedefler sabittir:

- ilk 10-15 saniyede hesap yapilabilmesi
- minimum alanla onerilen satis fiyatinin bulunabilmesi
- ayni ekranda net kar, marj ve basa bas fiyatin kolay okunmasi
- kullanici isterse girilen satis fiyatinin onerilen fiyatla hizli karsilastirilmasi
- gelismis alanlarin erisilebilir ama birinci planda olmamasi
- breakdown'in kullanicidan saklanmamasi
- mevcut hesaplama kurallarinin ve kalici state'in yeniden kullanilmasi

### 3.2 Hedef disi konular

Bu revizyonun kapsami disinda kalanlar sunlardir:

- Etsy fee kurallarini bastan degistirmek
- yeni bir backend modulu tasarlamak
- farkli para birimi stratejisini sifirdan degistirmek
- owner bazli yeni route veya yeni bilgi mimarisi kurmak
- mevcut hesap motorunu tamamen silip yeniden yazmak

---

## 4. Onaylanan urun kararlari

Kullanici ile netlesen urun kararlari sunlardir:

- hesaplayici ayni sayfada kalir; varsayilan deneyim **tek sayfa hizli mod** olur
- varsayilan duzen, gorusmelerde secilen **B yerlesimi**dir: **sol hizli giris / sag sabit sonuc**
- varsayilan sekme **"Hedef kar icin satis fiyati bul"** olur
- ikinci sekme **"Mevcut fiyati analiz et"** olur
- hizli modda ilk acilista gorunecek alan seti su kadar kucuk tutulur:
  - urun maliyeti
  - gercek kargo
  - hedef kar
  - opsiyonel satis fiyati
- hedef kar mantigi sade gorunur ama arkada mevcut uc modu korur:
  - `%`
  - `USD`
  - `TRY`
- varsayilan sekmede satis fiyati alaninin rolu **opsiyonel karsilastirma**dir; kullanici isterse yazar, istemezse sistem ana sonuc olarak fiyat onerir
- gelismis alanlar ayni sayfada asagi uzayan bolum olmayacak; **sagdan acilan panel** icinde yer alacak
- fee breakdown gizli gelmeyecek; **ilk anda tam acik** gorunecek
- preset secimi zorunlu olmayacak; **Preset** butonuyla istege bagli acilacak
- preset uygulanirsa sadece gorunen hizli alanlar degil, gorunmeyen gelismis ayarlar da ayni anda draft'a islenir
- sonucun ana okunacak metrigi her zaman kullanicinin secili akisa gore yeniden siralanir; ancak **basa bas fiyat** her durumda gorunen temel sonuc olarak kalir

---

## 5. Degerlendirilen yaklasimlar

### Yaklasim A - Hizli mod merkezli cift sekmeli hesaplayici (**secilen**)

Ustte iki sekmeli bir toolbar bulunur:

- `Hedef kar icin satis fiyati bul`
- `Mevcut fiyati analiz et`

Sol tarafta yalnizca minimum alanlar gorunur, sagda sonuc paneli sabit kalir, detaylar sag drawer icinde acilir.

**Artilari**

- kullanicinin asil amacini dogrudan one cikarir
- ilk gorunumde gozu yormaz
- mevcut hesap motorunu koruyarak UX iyilestirmesi saglar
- ayni sayfada hem fiyat onerisi hem fiyat analizi kullanimi sunar

**Eksileri**

- hizli mod ile gelismis drawer arasinda iyi bir state senkronu gerektirir
- breakdown acik geldigi icin sayfa dikeyde buyuyebilir

### Yaklasim B - Tek buyuk formu gruplandirarak sade gostermek

Tum alanlar ayni sayfada kalir; sadece gruplama ve etiketleme iyilestirilir.

**Artilari**

- mevcut yapidan daha az kopus gerektirir
- tum kontroller tek yuzeyde kalir

**Eksileri**

- yine kalabalik hissettirme riski yuksektir
- hizli fiyat bulma hedefini yeterince one cikarmaz
- kullanicinin ilk andaki kararsizligini tam olarak cozmez

### Yaklasim C - Ustte mini hizli hesap, altta tam ekran gelismis form

Sayfa ustunde mini arac, asagida tam feature devam eder.

**Artilari**

- hizli kullanim ile detayli kullanim ayni ekranda bulunur

**Eksileri**

- iki farkli deneyim varmis hissi verir
- hangi bolumun asil akim oldugu belirsizlesebilir
- state ve sonuc hiyerarsisi karmasiklasabilir

Secilen yon: **Yaklasim A**.

---

## 6. Bilgi mimarisi ve ekran akisi

### 6.1 Route karari

Route degismez:

- `/etsy-cost-calculator`

Sidebar yerlesimi ayni kalir; bu revizyon giris noktasini degistirmez.

### 6.2 Sayfa iskeleti

Sayfa asagidaki katmanlardan olusur:

1. **Header**
   - sayfa basligi
   - aktif profil etiketi
   - kayit durumu

2. **Quick mode toolbar**
   - sekme secici
   - `Preset` butonu
   - `Gelismis ayarlar` butonu

3. **Ana icerik alani**
   - sol kolon: minimum hizli giris formu
   - sag kolon: sticky sonuc paneli

4. **Breakdown bolumu**
   - varsayilan olarak acik
   - satir bazli fee ve maliyet gosterimi

5. **Gelismis ayarlar drawer'i**
   - sagdan acilan detay paneli

### 6.3 Secili yerlesim ilkesi

Desktop ve genis ekranlarda ana bilgi mimarisi su sekildedir:

- **sol:** input ve breakdown
- **sag:** sticky sonuc paneli

Bu karar, kullanicinin veri girerken sonucu ayni anda gormesini saglamak icin secilmistir.

Kucuk ekranlarda ayni mantik dikey akisla surdurulur:

- once hizli giris
- hemen altinda sonuc ozeti
- daha sonra breakdown
- gelismis ayarlar drawer olarak yine sagdan ya da tam ekran sheet gibi acilir

Bu mobil davranis yeni bir urun akisi degil, ayni deneyimin responsive uyarlamasidir.

### 6.4 Varsayilan sekme akisi

Her yeni sayfa yuklemesinde varsayilan aktif sekme:

- `Hedef kar icin satis fiyati bul`

Bu tercih kalici olarak son sekmeyi hatirlamaz. Amac, her giriste kullaniciyi tekrar ana use-case ile karsilamaktir.

### 6.5 Ikinci sekme akisi

Ikinci sekme:

- `Mevcut fiyati analiz et`

Bu sekme farkli bir hesap motoru acmaz. Ayni draft ve ayni fee mantigi kullanilir; sadece form onceligi ve sonuc hiyerarsisi degisir.

---

## 7. Etkilesim davranisi

### 7.1 Hizli mod giris deneyimi

Varsayilan sekmede kullanici su sirayla yonlendirilir:

1. urun maliyeti
2. gercek kargo
3. hedef kar modu ve degeri
4. opsiyonel satis fiyati

Burada ayrica `Hesapla` butonu zorunlu kilinmaz. Alanlar degistikce sonuc **anlik** olarak guncellenir.

### 7.2 Hedef kar alaninin gorunumu

Hedef kar hizli modda tek bir karmasik blok gibi degil, sade ama kontrollu bir giris olarak sunulur:

- solda mod secici: `% / USD / TRY`
- sagda secili moda ait deger girisi

Bu yapida mevcut esneklik korunur, ama kullaniciya once tum fee ayarlari degil karar hedefi sorulur.

### 7.3 Opsiyonel satis fiyati davranisi

Bu revizyonun kritik farklarindan biri, varsayilan sekmede satis fiyatinin "zorunlu girdi" degil, **opsiyonel karsilastirma alani** olmasidir.

Davranis sunlardir:

- kullanici bu alanı bos birakabilir
- alan bosken sistem ana sonuc olarak yalnizca **onerilen satis fiyatini** one cikarir
- kullanici bu alani doldurursa ek bir kiyas karti acilir

Kiyas kartinda su sorular cevaplanir:

- girilen fiyat hedef kari karsiliyor mu
- onerilen fiyattan ne kadar dusuk / yuksek
- bu fiyatla net kar ve marj ne oluyor

### 7.4 Ikinci sekmede fiyat analizi

`Mevcut fiyati analiz et` sekmesinde ayni fiyat alani artik opsiyonel degil, ana girdi gibi davranir.

Bu sekmede odak sunlardir:

- mevcut fiyatla net kar
- mevcut fiyatla marj
- basa bas fiyat farki
- guvenli hedef fiyata gore sapma

Bu nedenle ayni alan seti kullanilsa da, sonuc panelindeki oncelik ve kopya dili sekmeye gore degisir.

### 7.5 Preset davranisi

Preset akisi ust toolbar icindeki bir butondan acilir. Varsayilan gorunumde buyuk bir preset yonetim karti yer almaz.

Preset davranisi su sekilde sabitlenir:

- preset secmek zorunlu degildir
- `Preset` butonu acildiginda kullanici preset secme, kaydetme, guncelleme, silme eylemlerini gorebilir
- bir preset uygulandiginda yalnizca 4 hizli alan degil, tum draft state'i guncellenir
- buna gorunmeyen gelismis ayarlar da dahildir

Bu karar sayesinde preset, ekrani agirlastiran bir "yonetim paneli" olmaktan cikarak, hizli calismayi hizlandiran bir arac olur.

### 7.6 Gelismis ayarlar drawer'i

Sagdan acilan drawer su alanlari tasir:

- musteriden alinan kargo
- manuel kur
- ShipEntegra maliyeti
- paketleme maliyeti
- ozel gider satirlari
- kampanya ve promosyon alanlari
- VAT modu
- currency conversion
- offsite ads
- deposit fee
- fee override alanlari

Bu drawer kapansa da icindeki degerler mevcut draft'ta yasamaya devam eder. Kullanici drawer'i sadece gorunurluk icin acar; state ayrimi icin degil.

### 7.7 Breakdown davranisi

Breakdown varsayilan olarak **acik** gelir. Ancak okunabilirligi artirmak icin mantiksal gruplara ayrilir:

- **Etsy fee'leri**
- **Kullanici maliyetleri**
- **Sonuc ozetine etki eden toplamlar**

Ek olarak her satir mevcut kaynak etiketini korur:

- `official_default`
- `official_override`
- `user_input`
- `conditional`

### 7.8 Hangi senaryonun breakdown'i gosterilir

Bu nokta acik secilir:

- varsayilan sekmede breakdown, **onerilen satis fiyatina gore hesaplanan ana senaryoyu** gosterir
- kullanici opsiyonel satis fiyatini girse bile breakdown varsayilan olarak ana onerilen senaryoyu korur
- kullanicinin girdigi fiyatin etkisi sonuc panelindeki kiyas blokunda ozetlenir
- ikinci sekmede breakdown, **girilen mevcut fiyat senaryosunu** gosterir

Bu karar, ayni anda iki buyuk breakdown gostermenin yaratacagi karmasayi engeller.

### 7.9 Gorunmeyen varsayimlari saklamama ilkesi

Gelismis alanlar drawer icinde yasasa da, etkileri kullanicidan tamamen gizlenmez.

Bu nedenle hizli mod alani veya sonuc ustunde kisa durum rozetleri gosterilebilir:

- `Preset aktif`
- `Musteriden alinan kargo var`
- `Kampanya aktif`
- `Fee override aktif`

Bu rozetler yeni bir yonetim alani yaratmak icin degil, sonucu etkileyen gizli degiskenleri kullaniciya hatirlatmak icin vardir.

---

## 8. Hesap modeli ve state kararlari

### 8.1 Ana ilke: tek draft, tek motor, iki sunum

Bu revizyonun teknik omurgasi su ilkeye dayanir:

- **tek draft state**
- **tek hesap motoru**
- **iki farkli sunum modu**

Yani hizli mod ile analiz modu icin ayri veri modeli ya da ayri fee hesaplayicisi acilmaz.

### 8.2 Mevcut motorun korunmasi

Asagidaki mevcut yapi ve fonksiyonlar korunur:

- `calculateScenario`
- `solveTargetPrice`
- `formatBreakdown`
- `validateDraft`
- `useEtsyCostCalculatorState`
- mevcut `settings` tabanli kalicilik mantigi

Bu fonksiyonlarin ustune yeni UI davranisi kurulur.

### 8.3 Fiyat alaninin yeniden yorumlanmasi

Mevcut feature'da satis fiyati ana draft icinde merkezi bir alandir. Ancak yeni UX'te varsayilan sekmede bu alan opsiyonel karsilastirma rolune sahiptir.

Bu nedenle tasarim karari sunlardir:

- draft seviyesi fiyat alani UI tarafinda nullable/opsiyonel olarak ele alinabilmelidir
- `Hedef kar icin satis fiyati bul` sekmesinde ana senaryo, `solveTargetPrice` ile uretilen onerilen fiyat uzerinden hesaplanir
- kullanici kendi fiyatini girdiginde ikinci bir karsilastirma senaryosu turetilir
- `Mevcut fiyati analiz et` sekmesinde ayni fiyat alani zorunlu hale gelir ve ana senaryo buna gore hesaplanir

Bu karar, ayni alanin iki akista farkli rol alabilmesini saglar.

### 8.4 Hangi alanlar hizli modda gorunur

Hizli mod formu yalnizca su draft parcasi icin birinci seviye UI sunar:

- `productCost`
- `actualShippingCost`
- `targetProfitMode`
- `targetProfitValue`
- `salePriceUsd` veya esdeger opsiyonel kiyas fiyati alani

Diger tum alanlar ayni draft icinde kalir ama drawer icinde temsil edilir.

### 8.5 Preset'in teknik anlami

Preset, hesaplayicinin sadece bazi alanlarini degil tum anlamli draft'ini kopyalayan bir hizlandiricidir.

Teknik davranis su sekildedir:

- preset secildiginde mevcut draft, preset input'u ile degistirilir
- kullanici daha sonra hizli modda yaptigi degisikliklerle bu draft'i uzerine yazar
- preset secili olmak zorunda degildir; onceki kayitli draft veya varsayilan profil ile de ekran acilabilir

Bu tercih, ek bir "aktif preset motoru" yerine sade bir `draft <- preset input` semantigi korur.

### 8.6 Kaydetme davranisinin korunmasi

Mevcut autosave davranisi korunur:

- draft degisiklikleri debounce ile kaydedilir
- preset eylemleri kayit semantigini bozmadan calisir
- yeni UX, yeni bir veri tabani modeli zorunlu kilmaz

Ancak fiyat alaninin opsiyonellestirilmesi icin gerekiyorsa storage tipi ve backend validation katmani kucuk olcude guncellenebilir.

---

## 9. Bilesen mimarisi

Onerilen ekran sinirlari su sekilde ayrilir:

- `EtsyCostCalculatorPage`
  - sayfa orkestrasyonu
  - query/mutation baglanti noktasi
  - toolbar, hizli mod, sonuc paneli, breakdown, drawer koordinasyonu

- `QuickModeToolbar`
  - sekmeler
  - preset butonu
  - gelismis ayarlar butonu
  - gerekiyorsa aktif etki rozetleri

- `QuickModeForm`
  - urun maliyeti
  - gercek kargo
  - hedef kar modu + degeri
  - opsiyonel satis fiyati

- `StickyResultsPanel`
  - onerilen satis fiyati
  - net kar
  - marj
  - basa bas fiyat
  - varsa kiyas ozeti

- `BreakdownSection`
  - grouped breakdown render'i
  - kaynak tipleri

- `AdvancedSettingsDrawer`
  - gelir, kampanya, operasyon ve fee detaylari

- `PresetPanel` veya `PresetPopover`
  - preset sec / kaydet / guncelle / sil

### 9.1 Mevcut bilesenlerin yeniden kullanimi

Mevcut bilesenlerin bazilari tamamen silinmek zorunda degildir. Onerilen uyarlama sunlardir:

- `ResultsPanel` yeni sticky sonuc davranisina uyarlanabilir veya yerine `StickyResultsPanel` yazilabilir
- `FeeBreakdownTable` gruplu gorunumu destekleyecek sekilde genisletilebilir
- `PresetToolbar` daraltik bir panel/popup deneyimine donusturulebilir
- `FeeProfileCard`, `SalesCampaignCard`, `CostInputsCard`, `ProfitTargetCard` gibi kartlar dogrudan ilk sayfada gorunmek yerine drawer icindeki section'lara donusturulebilir

Bu yaklasim, mevcut form mantigini cope atmadan yeni UX yuzeyi uretir.

---

## 10. Sonuc paneli hiyerarsisi

### 10.1 Varsayilan sekme sonucu

`Hedef kar icin satis fiyati bul` sekmesinde sonuc paneli su sirayla okunur:

1. **Onerilen satis fiyati**
2. **Net kar**
3. **Marj**
4. **Basa bas fiyat**
5. varsa **girilen fiyat kiyasi**

Bu sekmede ana karar sorusu fiyatin kendisidir; bu nedenle net kar ve marj destekleyici metrik rolundedir.

### 10.2 Analiz sekmesi sonucu

`Mevcut fiyati analiz et` sekmesinde ayni panel farkli onceliklenir:

1. **Net kar**
2. **Marj**
3. **Basa bas fiyat**
4. **Onerilen guvenli fiyat**

Bu sekmede kullanicinin ilk sordugu soru, mevcut fiyatin yeterli olup olmadigidir.

### 10.3 Uyarilar ve bilgi kartlari

Sonuc panelinde sadece hata degil, karar destek uyarilari da gosterilir:

- net kar negatif
- girilen fiyat basa basin altinda
- fee override aktif
- kosullu fee'ler acik
- gelismis ayarlar sonucu etkiliyor

Bunlar sert blokaj degil; kullaniciyi baglam konusunda uyaran yardimci kartlardir.

---

## 11. Validation ve hata davranisi

### 11.1 Sert blokajlar

Asagidaki durumlar hesap davranisini bozdugu icin alan seviyesinde engellenir:

- negatif degerler
- sifir veya gecersiz kur
- `%100` ve uzeri indirim
- subtotal'i asan kupon
- gecersiz hedef kar degeri
- analiz sekmesinde bos birakilan satis fiyati

### 11.2 Yumusak uyarilar

Asagidaki durumlarda hesap devam eder ama sonuc paneli uyari gosterir:

- net kar negatif
- girilen fiyat onerilen fiyatin altinda
- drawer icindeki ayarlar ana sonucu etkiliyor
- deposit fee gibi kosullu kalemler acik
- override profili aktif

### 11.3 Bozulmayan draft ilkesi

Kullanici drawer icinde ya da hizli modda alan degistirdiginde state birbirini ezmez. Tum gorunumler ayni draft'i besledigi icin, alanlar arasi gecis kullaniciya veri kaybi yasatmaz.

---

## 12. Test stratejisi

### 12.1 Unit testler

Korunacak veya genisletilecek unit kapsam sunlardir:

- `calculateScenario`
- `solveTargetPrice`
- grouped breakdown formatlama mantigi
- hedef kar tab'inda onerilen senaryonun kurulmasi
- opsiyonel fiyat girildiginde kiyas senaryosunun kurulmasi

### 12.2 Component testler

Yeni kritik component senaryolari sunlardir:

- varsayilan sekmenin dogru acilmasi
- hizli modda yalnizca minimum alanlarin gorunmesi
- opsiyonel satis fiyati girildiginde kiyas alaninin acilmasi
- gelismis drawer ac/kapa davranisi
- breakdown'in varsayilan acik gelmesi
- preset butonundan preset secilip draft'a uygulanmasi

### 12.3 E2E testler

Ana kullanici yolculuklari su sekilde kapsanir:

- hesaplayici route'u acilir
- varsayilan sekme dogru aktif gelir
- minimum alanlar doldurularak onerilen fiyat uretilir
- basa bas fiyat gorulur
- kullanici kendi fiyatini girip kiyas sonucu alir
- analiz sekmesine gecildiginde sonuc hiyerarsisi degisir
- gelismis drawer'dan alan degistirilince sonuc ve breakdown guncellenir
- preset secildiginde hem hizli alanlar hem drawer verileri draft'a yansir

---

## 13. Kabul kriterleri

Bu revizyon tamamlandiginda su davranislar gozlenmelidir:

- sayfa ilk acildiginda kullanici buyuk kart yiginina degil, kompakt bir hizli moda girer
- varsayilan olarak `Hedef kar icin satis fiyati bul` sekmesi aktiftir
- ilk gorunumde yalnizca `urun maliyeti`, `gercek kargo`, `hedef kar`, `opsiyonel satis fiyati` gorunur
- kullanici minimum veri ile onerilen satis fiyatini gorebilir
- net kar, marj ve basa bas fiyat ayni anda okunur
- kullanici isterse kendi fiyatini girerek ana sonucla karsilastirabilir
- detaylar ana ekrani bozmadan sag drawer icinde acilir
- breakdown ilk anda acik ve okunabilir sekilde gorunur
- preset butonu zorunlu baslangic yaratmadan hizlandirici arac gibi davranir
- mevcut hesap motoru korunur; UX sadelesirken hesap kural dogrulugu bozulmaz

---

## 14. Onerilen dosya etkisi ozeti

En olasi dosya etkisi su sinirlarda kalir:

- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\routes\EtsyCostCalculatorPage.tsx`
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\hooks\useEtsyCostCalculatorState.ts`
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\components\ResultsPanel.tsx` veya yeni sticky varyanti
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\components\FeeBreakdownTable.tsx`
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\components\PresetToolbar.tsx`
- yeni olasi bilesenler:
  - `QuickModeToolbar.tsx`
  - `QuickModeForm.tsx`
  - `StickyResultsPanel.tsx`
  - `AdvancedSettingsDrawer.tsx`
  - `PresetPanel.tsx`
- fiyat alaninin opsiyonellestirilmesi gerekiyorsa ilgili tip/validation etkileri icin:
  - `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\lib\types.ts`
  - `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\etsyCostCalculator\lib\validation.ts`
  - gerekirse `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\routes\settings.ts`
  - gerekirse `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\db\repositories\settingsRepo.ts`

Bu etki alani, mevcut feature'i cope atmadan UX odakli ama kontrollu bir revizyon yapmak icin yeterlidir.

---

## 15. Son karar ozeti

Bu tasarimla birlikte Etsy maliyet hesaplayici su yonde evrilir:

- eski davranis: "tum kontrollere ayni anda ulas"
- yeni davranis: "once sonuca ulas, sonra gerekirse detaya in"

Ana urun karari budur. Motor korunur, ekran sadelesir, karar hizi artar.

