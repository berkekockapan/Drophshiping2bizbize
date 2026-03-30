# ShipEntegra Quick Form Ithalat Modeli Tasarimi

**Tarih:** 2026-03-30
**Kapsam:** `C:/Users/berke/Desktop/Projelerim/dropshiping-win/apps/web/src/features/etsyCostCalculator`

---

## 1. Problem Tanimi

Mevcut hizli fiyat formu ABD senaryosunda ithalat etkisini genel bir `manual duty %` mantigi ile modelliyor. Bu yaklasim, ShipEntegra kullanan mevcut operasyonu yeterince temsil etmiyor.

Kullanicinin net ihtiyaci su:

- her zaman ShipEntegra ile gonderim yapiliyor
- **gercek tasima maliyeti** ayri bir girdi olarak kalmali
- **ShipEntegra ithalat masrafi** hizli formun dogal parcasi olmali
- kullanici tarafinda manuel degisen tek ithalat degiskeni **gumruk vergisi orani** olmali
- diger ithalat kalemleri ShipEntegra mantigina gore sistem tarafindan otomatik uretilmeli
- ShipEntegra ithalat matrahi olarak **indirim sonrasi urun fiyati** kullanilmali

Bu tasarim, hizli formu mevcut operasyon gercegine yaklastirmayi ve sonucun ucret dokumunde denetlenebilir olmasini hedefler.

---

## 2. Arastirma Sonucu ve Is Kurali

Arastirmadan cikan temel noktalar:

1. ShipEntegra ABD ithalat mantigini HS/HTS temelli kuruyor.
2. ShipEntegra satici kilavuzunda ABD ithalat vergisi icin "transaction value / FOB / fatura degeri" temeli anlatiliyor.
3. Public gumruk hesaplayici akisinda su kalemler ayrik gorunuyor:
   - gumruk vergisi
   - Turkiye'den gelen gonderilere uygulanan ek vergi `%15`
   - tasiyici islem bedeli
4. Kullanici kendi gercek siparis ekranlariyla su operasyon modelini dogruladi:
   - **gercek tasima maliyeti** kargo maliyetidir
   - **ShipEntegra ithalat masrafi**, kargodan ayridir
   - ShipEntegra ithalat masrafi en az su kalemleri toplar:
     - gumruk vergisi tutari
     - ek vergi tutari
     - tasiyici islem bedeli

Bu gorev icin kesinlestirilen uygulama karari:

- **ShipEntegra ithalat matrahi = indirim sonrasi urun fiyati**
- `manualDutyPercent` anlami artik genel duty degil, **gumruk vergisi orani** olacak
- **ek vergi orani = sabit %15**
- **tasiyici islem bedeli = sistem tarafindan hesaplanan ayrik bir kalem**
- hizli form ve sonuc paneli bu modeli dogrudan gosterecek

Bu gorevte canli ShipEntegra API entegrasyonu yapilmayacak. Model uygulama icinde yerlestirilecek.

---

## 3. Hedef Kullanici Deneyimi

ABD hedef profili secildiginde hizli formda kullanici su deneyimi yasamali:

1. Gercek tasima maliyetini girer.
2. Gumruk vergisi oranini girer.
3. Sistem otomatik hesaplar:
   - ShipEntegra gumruk vergisi tutari
   - ShipEntegra ek vergi tutari
   - ShipEntegra tasiyici islem bedeli
   - ShipEntegra toplam ithalat masrafi
4. Sonuc panelinde ve ucret dokumunde:
   - gercek tasima maliyeti
   - ShipEntegra ithalat masrafi
   - toplam operasyonel maliyet
   - net kar
   birlikte okunur.

Kullanici artik `manual duty` alanini zihninde genel bir ithalat tahmini gibi degil, ShipEntegra modelinin tek manuel degiskeni olarak gorur.

---

## 4. UI Degisiklikleri

### 4.1 Hizli Fiyat Formu

ABD hedef profilinde mevcut `Manual duty %` alani su sekilde degistirilir:

- yeni etiket: **Gumruk vergisi orani (%)**
- yardim metni: bu alanin ShipEntegra ithalat modeli icindeki gumruk vergisi orani oldugu acikca anlatilir

Ayrica ABD hedef profilinde yeni bir bilgilendirici blok eklenir:

- baslik: **ShipEntegra ithalat masrafi**
- alt satirlar:
  - gumruk vergisi tutari
  - ek vergi tutari (%15)
  - tasiyici islem bedeli
  - toplam ithalat masrafi

Bu blok girdi alani degil, hesap ozeti olarak davranir.

### 4.2 Sonuc Paneli

Sonuc panelinde mevcut semantik korunur ancak operasyonel toplam artik iki ayri pratik maliyeti net gostermelidir:

- gercek tasima maliyeti
- ShipEntegra ithalat masrafi

### 4.3 Ucret Dokumu

Operasyonel maliyetler grubunda ayri satirlar olarak gosterilir:

- gercek kargo maliyeti
- ShipEntegra gumruk vergisi
- ShipEntegra ek vergi
- ShipEntegra tasiyici islem bedeli

Ayrica gerekirse ozet amacli bir satir daha eklenebilir:

- ShipEntegra toplam ithalat masrafi

Bu toplam satir, alt kalemlerin yerini almak icin degil, kullanicinin tek bakista toplam etkiyi gormesi icin vardir.

---

## 5. Hesap Modeli

### 5.1 Yeni ara degerler

`calculateScenario` icinde en az su ara degerler uretilir:

- `shipentegraImportBasisUsd`
- `shipentegraDutyUsd`
- `shipentegraAdditionalDutyUsd`
- `shipentegraCarrierFeeUsd`
- `shipentegraImportTotalUsd`

### 5.2 Matrah

ShipEntegra ithalat matrahi:

- `discountedSalePriceUsd`
- kupon varsa, mevcut motorun urun geliri mantigi ile uyumlu sekilde kupon sonrasi urun gelirine yaklasik davranilabilir
- ancak bu gorevte temel is kurali olarak **indirim sonrasi urun fiyati** esas alinacaktir

Uygulama karari:

- ilk surumde matrah icin mevcut `productRevenueUsd` kullanilacak
- cunku bu deger indirim + kupon sonrasi urun gelirini temsil eder ve mevcut motorla tutarlidir
- kullanici tarafinda anlatim dili yine "indirim sonrasi urun fiyati" olarak korunur

### 5.3 Gumruk vergisi

- `shipentegraDutyUsd = shipentegraImportBasisUsd * (manualDutyPercent / 100)`

### 5.4 Ek vergi

- `shipentegraAdditionalDutyUsd = shipentegraImportBasisUsd * 0.15`

### 5.5 Tasiyici islem bedeli

Bu gorevte sistemde sabit ve acik bir fonksiyon tanimlanir.

Kullanici acisindan bu kalem manuel degistirilmeyecektir.

Ilk surumde tasiyici islem bedeli icin su kural uygulanir:

- eger `shipentegraImportBasisUsd > 0` ise sistem bir **hesaplanmis sabit tasiyici islem bedeli** uretir
- bu kural tek bir yardimci fonksiyonda tanimlanir
- fonksiyonun davranisi testlerle sabitlenir

Not: Gercek ShipEntegra panelindeki tasiyici islem bedelinin tum urun ve servis tipleri icin resmi bir genel formulu kaynaklarda acik bulunamadi. Bu nedenle kodda bu kalem tek bir fonksiyonda yalýtýlýr; ileride resmi kurala gecis kolay olur.

### 5.6 Toplam ShipEntegra ithalat masrafi

- `shipentegraImportTotalUsd = shipentegraDutyUsd + shipentegraAdditionalDutyUsd + shipentegraCarrierFeeUsd`

### 5.7 Operasyonel toplam

Operasyonel toplam su kalemleri icerir:

- urun maliyeti
- gercek tasima maliyeti
- paketleme
- ShipEntegra operasyon maliyeti
- ShipEntegra gumruk vergisi
- ShipEntegra ek vergi
- ShipEntegra tasiyici islem bedeli
- ozel giderler
- genel gider payi

Yani ShipEntegra ithalat etkisi artik ozel gider hack'i ile degil, cekirdek motorun parcasý olur.

---

## 6. Veri Modeli Degisiklikleri

`CalculatorDraft` tarafinda yeni manuel girdi gerekmiyor; mevcut alanlardan yararlanilir:

- `actualShippingCost` = gercek tasima maliyeti
- `manualDutyPercent` = gumruk vergisi orani

`ScenarioSnapshot` tarafina yeni hesap alanlari eklenir:

- `shipentegraImportBasisUsd`
- `shipentegraDutyUsd`
- `shipentegraAdditionalDutyUsd`
- `shipentegraCarrierFeeUsd`
- `shipentegraImportTotalUsd`

Bu alanlar hem sonuc paneli hem breakdown hem testlerde tek gercek kaynak olur.

---

## 7. Test Stratejisi

### 7.1 Unit testler

Guncellenecek / eklenecek testler:

- `calculateScenario.test.ts`
  - ABD senaryosunda gumruk vergisi, ek vergi ve tasiyici islem bedeli ayri uretiliyor mu?
  - toplam ShipEntegra ithalat masrafi dogru mu?
- `groupBreakdownRows.test.ts`
  - yeni operasyonel maliyet satirlari dogru grupta mi?
- `buildQuickModeViewModel.test.ts`
  - hizli formdaki yeni ara toplamlar gorunur mu?

### 7.2 Component testler

- `QuickModeForm.test.tsx`
  - etiket `Gumruk vergisi orani (%)` olarak degisti mi?
  - ShipEntegra ithalat blok metinleri gozukuyor mu?
- `ResultsPanel.test.tsx`
  - operasyonel toplam ve ShipEntegra etkisi birlikte okunuyor mu?
- `FeeBreakdownTable.test.tsx`
  - ShipEntegra alt kalemleri render ediliyor mu?

### 7.3 Sayfa / e2e testleri

- `%35` indirimli Etsy siparisi benzeri akista:
  - satis fiyati
  - alicidan alinan kargo
  - gumruk vergisi orani
  - gercek tasima maliyeti
  ile ekranin yeni alanlari dolu geliyor mu?
- sonuc paneli ile ucret dokumu ayni modeli gosteriyor mu?

---

## 8. Riskler ve Sinirlar

1. Tasiyici islem bedeli formulu public kaynaklarda acik ve tam bulunmadi.
2. Bu nedenle ilk surumde bu kural tek fonksiyonda yalýtilacak.
3. Canli ShipEntegra API entegrasyonu bu gorev kapsaminda degil.
4. Kullaniciya gore en kritik kisim, genel duty mantigindan cikilip ShipEntegra mantigina gecilmesi oldugu icin, ilk surumde bu davranis onceliklenecek.

---

## 9. Basari Kriterleri

Bu gorev basarili sayilacak eger:

- ABD quick formunda ShipEntegra ithalat modeli acikca gorunuyorsa
- kullanici sadece gercek tasima maliyeti ve gumruk vergisi oranini girerek sonuc alabiliyorsa
- ek vergi `%15` ve tasiyici islem bedeli otomatik hesaplanýyorsa
- sonuc paneli ve ucret dokumu ayni ShipEntegra modelini gosteriyorsa
- eski "ozel gider ile ithalat toplami elle ekleme" ihtiyaci ortadan kalkýyorsa

---

## 10. Uygulama Onerisi

En dusuk riskli implementasyon sirasi:

1. cekirdek hesap motoru ve tipler
2. quick form UI ve labels
3. results / breakdown sunumu
4. route ve state entegrasyonu
5. test ve e2e dogrulama
