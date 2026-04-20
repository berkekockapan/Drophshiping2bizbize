# Etsy Prep Prompt Pack Hardening Tasarimi

**Tarih:** 2026-03-31  
**Durum:** Yazili spec hazir  
**Kapsam:** `apps/api`, `apps/web`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, `Etsy'e Yukle` alanindaki iki prompt deneyimini ayni anda guclendirmektir:

- `ChatGPT Research Prompt Preview`
- `Gorsel Prompt Pack`

Hedef, kullanicinin hem listing metni hem de gorsel uretim icin daha guclu, Etsy'ye daha uyumlu ve daha dikkat cekici promptlar alabilmesidir.

Beklenen sonuc:

- ChatGPT research promptu Etsy Seller Handbook ve Etsy rakip arastirmasini gercekten zorlar
- title, description ve tags Etsy SEO acisindan daha guclu cikar
- gorsel prompt sistemi fazla sade ve zayif sahneler uretmez
- gorsel promptlar Etsy thumbnail ve listing galerisi icin daha dikkat cekici sahne fikirleri verir
- image model urunu yeniden tasarlamaz, bozmaz veya farkli gostermeye calismaz

Bu tasarimda `System Prompt Preview` ve `AI ile Uret` icin kullanilan strict JSON listing kontrati korunur; degisiklik odagi manuel research prompt ve gorsel prompt kalitesidir.

---

## 2. Problem

### 2.1 Research prompt problemi

Mevcut `buildChatGptResearchPromptPack` browse-first niyet tasisa da pratikte su sorunlar devam etmektedir:

- model bazen arastirma yaptigini varsayip yetersiz rekabet analizi ile sonuca gidebiliyor
- baslik tarafinda Etsy arama niyeti ile katalog dili arasindaki kalite cizgisi yeterince sert cizilmiyor
- aciklama bazen fazla kisa, fazla genel ya da yuzeysel kalabiliyor
- tagler buyer-intent yerine ayni kok kelimenin varyasyonlarina donusebiliyor
- tag mantigi aciklamanin icine yeterince dogal ve stratejik dagilmiyor
- model bazen guvenli ama zayif seceneklere kayip urunu one cikartacak ayrismayi zayiflatiyor

### 2.2 Gorsel prompt problemi

Mevcut `buildImagePromptPack` daha guvenli bir iskelet sunsa da su acilardan zayif kalmaktadir:

- `mainPrompt` fazla genel kaldigi icin modele guclu bir Etsy sunum hedefi vermiyor
- varyasyonlar cok kisa ve birbirine yakin oldugu icin sonuc seti siradan kaliyor
- mevcut `7` varyasyon dengeli bir hero / lifestyle / editorial dagilimi kurmuyor
- prompt, Etsy thumbnail seviyesinde dikkat cekicilik hedefini yeterince acik zorlamiyor
- urune gore ton ayari sinirli kaldigi icin bazi kategorilerde sahneler fazla duz kaliyor
- guardrail'ler dogru olsa da image modelin urunu “iyilestirme” bahanesiyle bozmasini yeterince sert engellemiyor

Kullanici beklentisi, iki promptun da sadece dogru degil, **daha guclu, daha Etsy odakli ve daha az kolayci** hale gelmesidir.

---

## 3. Onaylanan Urun Kararlari

- Degisiklik `ChatGPT Research Prompt Preview` ve `Gorsel Prompt Pack` kapsamindadir.
- `System Prompt Preview` icerigi bu turda degismeyecektir.
- `generate-listing-pack` akisi ve strict JSON output kontrati korunacaktir.
- Research prompt final cevap formatini koruyacaktir:
  - `1. Title`
  - `2. Description`
  - `3. Tags`
- Research prompt Ingilizce disinda dogal dil cikti uretmemelidir.
- Aciklama kisa olmaya zorlanmayacak; tag mantigi aciklamaya dogal bicimde dagitilacaktir.
- Gorsel prompt paketi `1 master prompt + 10 varyasyon + guardrailSummary` yapisina gecirilecektir.
- 10 varyasyon dengeli dagilacaktir:
  - 4 adet Etsy hero / clean product shot
  - 4 adet lifestyle / contextual scene
  - 2 adet editorial attention-grabber
- Gorsel varyasyonlar urune gore hafif akilli ton ayari yapacak, ancak tam bir kategori motoruna donusmeyecektir.
- Yapay zeka urunu kesinlikle bozmamali; form, renk, materyal hissi, desen, oran ve yapisal detaylar korunmalidir.
- UI tarafinda mevcut gorsel varyasyon kopyalama aksiyonu `10 Varyasyonu Kopyala` olacak sekilde guncellenecektir.
- Bu degisiklik, onceki image prompt spec'indeki `7 varyasyon` varsayimini gunceller.

---

## 4. Tasarim Hedefleri

Yeni prompt sistemi asagidaki hedefleri ayni anda zorlamalidir:

1. **Arastirma disiplini:** Listing prompt, Etsy Seller Handbook ve Etsy rakip sayfalarini gercekten incelemeden yazmamalidir.
2. **Buyer-intent SEO:** Baslik ve tagler Etsy arama mantigina daha yakin olmalidir.
3. **Ayrisma:** Rakiplerde cok tekrar eden zayif kaliplar ayiklanmali ve urun daha guclu bir acidan konumlanmalidir.
4. **Description depth:** Aciklama jenerik ovgu metni degil, ikna edici ve SEO dokulu bir listing olarak yazilmalidir.
5. **Visual click appeal:** Gorsel promptlar Etsy thumbnail ve galeri icin daha dikkat cekici ama guven veren sahneler istemelidir.
6. **Product fidelity:** Image prompt her durumda referans urunu korumali, yeniden yorumlamaya izin vermemelidir.
7. **Cross-field consistency:** Baslik, aciklama, tagler ve gorsel ton ayni satis konumlamasina hizmet etmelidir.

---

## 5. Research Prompt Hardening Tasarimi

### 5.1 Zorunlu arastirma cercevesi

Prompt, modelden su arastirma adimlarini acik bicimde isteyecektir:

- Etsy Seller Handbook icindeki temel listing ve keyword prensiplerini kontrol et
- ayni urun grubunda, Ingilizce Etsy marketinde anlamli sayida rakip listing incele
- tekrar eden title kaliplari, yaygin zayif tag kumelemeleri, bos generik description dili ve gercek ayrisma firsatlarini cikar

Bu arastirma ciktilari final cevapta gorunmeyecek; yalnizca ic degerlendirme olarak kullanilacaktir.

### 5.2 Keyword angle secimi

Model yazmadan once:

- tam olarak 1 ana keyword angle
- tam olarak 2 destekleyici keyword angle

secmesini sessizce yapacaktir. Boylece listing daginik degil, tutarli bir buyer-intent ekseninde kurulacaktir.

### 5.3 Alan bazli kalite kurallari

Research prompt title / description / tags icin daha keskin kabul-red kurallari icerecektir.

#### Title

- ana buyer query en basta olmali
- ana urun tipi ile en guclu farklastirici birlikte gelmeli
- synonym stacking yapilmamali
- raw attribute fragment veya teknik varyant dili title sonuna yigilmasin
- katalog gibi, bos veya gereksiz uzamis title'lar reddedilsin

#### Description

- tam olarak 3 paragrafli yapi korunur
- paragraf 1 ana arama niyetini ve urun vaadini net kurar
- paragraf 2 rakiplerde gorulen zayifliklara dusmeden neden daha iyi bir secim oldugunu anlatir
- paragraf 3 stil, kombin, kullanim senaryosu veya wardrobe fit tarafini guclendirir
- secilen tag mantigi metne dogal sekilde dagitilir
- jenerik baslikciklar, template dili ve bos ovgu sifatlari reddedilir
- emoji kullanimina izin vardir, ancak hafif ve kontrollu tutulur

#### Tags

- tam 13 benzersiz tag
- her biri Etsy'nin 20 karakter sinirina uygun
- ayni kok kelime taglerin cogunu domine etmemeli
- urun tipi, farklastirici, use case ve shopper query dagilimi kurulmali
- en zayif 3 tag sessizce elenip daha guclu seceneklerle degistirilmeli

### 5.4 Final self-reject dongusu

Prompt, modelin finalden once su zayifliklari sessizce reddetmesini isteyecektir:

- fazla katalog gibi duran baslik
- fazla kisa veya fazla genel description
- ayni kok kelimeye yuklenen tag seti
- description icine dogal sekilde yedirilmemis keyword yapisi
- rakip listinglerin zayif kaliplarini taklit eden cikti

Bu sayede kullanicinin sikayet ettigi kolayci listing cikti sinifi dogrudan hedeflenecektir.

---

## 6. Gorsel Prompt Pack Hardening Tasarimi

### 6.1 Yeni yapi

`Image Prompt Pack` ayni veri seklini korur ancak icerik seviyesi guclenir:

- `mainPrompt`
- `variations[10]`
- `guardrailSummary`

Kontrat tarafinda dizi yapisi zaten esnek oldugu icin paylasilan tipte yeni alan eklenmesi gerekmez; esas degisiklik varyasyon sayisi ve prompt kalitesidir.

### 6.2 Master prompt davranisi

Yeni master prompt sadece “guvenli sahne kur” demeyecek; su hedefleri acikca zorlayacaktir:

- Etsy ana listing gorseli veya galeri gorseli gibi dusun
- urun thumbnail boyutunda bile net secilsin
- sahne ilgi cekici olsun ama urunden rol calmamali
- sunum temiz, guven veren ve tiklanabilir gorunsun
- urun kategorisine uygun premium bir sunum hissi olussun

### 6.3 Master prompt bloklari

Master promptun icerik akisi su bloklardan olusacaktir:

1. **Reference truth block**
   - referans gorsel tek hakikat kaynagidir
   - urun kimligi referanstan okunur
2. **Product identity summary**
   - kategori, temel urun tipi, ana renk / materyal hissi / kullanim karakteri
   - kisa ve sade tutulur; JSON dump olmaz
3. **Etsy visual objective**
   - dikkat cekici thumbnail
   - temiz kompozisyon
   - urun odakli sahne
   - ticari ama asiri reklam kokmayan sunum
4. **Hard guardrails**
   - urunu degistirme
   - detay silme
   - yeni detay uydurma
   - urunu farkli materyal veya farkli renk gibi gostermeye calisma
   - urune ek parca veya yeni aksesuar ekleme
   - urunu prop, efekt veya kadraj altinda geri plana itme
5. **Creative direction**
   - isik
   - kadraj
   - prop yogunlugu
   - arka plan sadeligi
   - Etsy estetik tonu

### 6.4 Hard guardrail sertlestirmesi

Mevcut “same exact product” mantigi korunur, ancak daha sert yasak dili eklenir. Prompt asagidaki davranislari acikca yasaklar:

- redesign
- reinterpretation
- embellishment
- reconstruction
- detail enhancement bahanesiyle urunu degistirme
- AI'nin urun detaylarini yaratýcý bicimde yeniden cizmesi

Korunacak ana unsurlar:

- form
- renk
- materyal hissi
- desen / baski / dikis / donanim detaylari
- oran
- yapisal parcalar

### 6.5 Sessiz kalite kapisi

Master prompt, image modelin sonuc mantigini sessizce su filtrelerden gecirmesini ister:

- urun hala referansla ayni mi
- sahne urunu bastiriyor mu
- thumbnail seviyesinde urun net seciliyor mu
- kompozisyon Etsy'de tiklanabilir ama hala guvenilir mi

Bu kalite kapisi sahneyi guclendirirken urun sadakatini korumak icin ek bir savunma katmani olur.

---

## 7. 10 Varyasyon Ailesi

### 7.1 Dengeli dagilim

Onaylanan dagilim su sekildedir:

- 4 adet Etsy hero / clean product shot
- 4 adet lifestyle / contextual scene
- 2 adet editorial attention-grabber

### 7.2 Etsy hero / clean product shot varyasyonlari

Bu aile ana listing gorseli gibi davranir. Hedefleri:

- urunu ilk bakista net gostermek
- thumbnail seviyesinde okunurluk saglamak
- sade ama premium bir sunum vermek

Bu ailede varyasyonlar su eksenlerde farklilasir:

- duz temiz fon
- hafif premium masa veya zemin
- yumusak golge
- yakin uc ceyrek aci
- merkez kompozisyon
- bos alan dengesi

### 7.3 Lifestyle / contextual scene varyasyonlari

Bu aile kullanim hissi verir ama urunu kaybettirmez. Hedefleri:

- Etsy'de sicak ve dogal bir his uyandirmak
- urune uygun mini sahne kurmak
- satin alma istegini desteklemek

Bu ailede varyasyonlar su eksenlerde farklilasir:

- ev ici dogal isik
- masa / raf / soft textile ortami
- minimal dekor desteði
- kullanim baglamini sezdiren ama dikkat calmayan sahne
- sicak ama temiz atmosfer

### 7.4 Editorial attention-grabber varyasyonlari

Bu aile scroll durduran ama Etsy guven hissini bozmayan daha rafine sahneler sunar. Hedefleri:

- daha guclu isik yonu
- daha net kontrast
- daha rafine styling
- premium katalog + Etsy warmth dengesi
- urunu one cikan dikkat merkezi

### 7.5 Hafif urun farkindaligi

Varyasyonlar tamamen sabit cumleler olmayacaktir. Builder, urun baglamindan gelen sinyallere gore tonu hafifce ayarlayacaktir:

- urun tipi
- kategori
- renk / materyal hissi
- kullanim karakteri

Ancak bu yapi tam bir kategori kurallari motoru olmayacaktir. Amaç, bakimi dusuk tutarken urune daha uygun sahne tonu secmektir.

### 7.6 Ortak kalite sinyalleri

Her varyasyon, rolunden bagimsiz olarak su disiplinleri koruyacaktir:

- urun kadrajda yeterince baskin olmali
- arka plan urunden rol calmamali
- prop varsa yardimci seviyede kalmali
- urunun ana silueti net okunmali
- Etsy thumbnail seviyesinde ayirt edilebilir olmali
- yapay ve jenerik stock-photo hissine dusmemeli

---

## 8. UI ve Kopyalama Davranisi

UI'da asagidaki davranislar korunur, ancak guncellenir:

- `Ana Promptu Kopyala` ana master promptu kopyalar
- `10 Varyasyonu Kopyala` 1'den 10'a numaralanmis varyasyonlari kopyalar
- `guardrailSummary` ekranda urun sadakatini hatirlatmaya devam eder

`ImagePromptPackCard` metinleri, yeni sistemin “daha dikkat cekici ama urunu bozmayan Etsy sahneleri” amacini daha iyi anlatacak sekilde hafifce tazelenebilir; ancak bu turda asýl zorunlu UI degisikligi varyasyon sayisinin 10'a cikmasidir.

---

## 9. Kod Etkisi

Bu tasarim dogrultusunda beklenen kod etkisi su dosyalarda toplanir:

- `apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts`
- `apps/api/src/modules/etsyPrep/prompts/buildImagePromptPack.ts`
- `apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts`
- `apps/web/src/features/etsyPrep/components/ImagePromptPackCard.tsx`
- `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

Muhtemel etkiler:

- prompt kural metinleri sertlesir
- image prompt varyasyon sayisi 7'den 10'a cikar
- gorsel prompt rollerine dair yeni sabit varyasyon ailesi tanimlari eklenir
- test fixture ve kopyalama beklentileri guncellenir
- `rulebookVersion` anlamli bir prompt revizyonu olarak yeni bir surume yukselebilir

Yapinin geri kalani korunur:

- `buildListingPromptPack.ts` bu turda degismez
- `generateListingPackWithOpenAi.ts` akisi korunur
- paylasilan `ImagePromptPack.variations: string[]` kontrati degismez

---

## 10. Test Stratejisi

### 10.1 Research prompt testleri

- Prompt, zorunlu Etsy arastirmasini daha net ifade ediyor mu
- Prompt, quality gate mantigini acik bicimde iceriyor mu
- Prompt, title / description / tags icin sertlestirilmis kurallari tasiyor mu
- Prompt, only-final-output kontratini koruyor mu

### 10.2 Image prompt testleri

- `mainPrompt` reference truth, Etsy visual objective ve hard guardrail bloklarini iceriyor mu
- `variations` sayisi tam 10 mu
- 10 varyasyon dengeli rol dagilimini yansitiyor mu
- prompt metni raw URL, JSON dump veya urun disi metadata sizdirmiyor mu
- prompt urunu bozmayi yasaklayan sert ifadeleri iceriyor mu

### 10.3 UI regression testleri

- `ChatGPT Arastirma Promptunu Kopyala` guncel listing promptunu kopyaliyor mu
- `Ana Promptu Kopyala` guncel master promptu kopyaliyor mu
- `10 Varyasyonu Kopyala` dogru sayida ve numarali varyasyonlari kopyaliyor mu
- gorsel prompt preview yeni yapida dogru render oluyor mu

### 10.4 Non-regression

- `System Prompt Preview` metni etkilenmiyor mu
- `AI ile Uret` akisi ayni kaliyor mu
- prompt-pack response yapisi UI'yi bozmadan calismaya devam ediyor mu

---

## 11. Kapsam Disi

- `System Prompt Preview` icin ek sertlestirme
- uygulama ici otomatik image generation motoru
- tam kategori bazli sahne kurallari motoru
- Etsy publish akisi veya listing upload otomasyonu
- prompt CMS veya son kullaniciya acik prompt editoru

---

## 12. Sonuc

Bu tasarim, Etsy prep deneyimindeki iki kritik promptu ayni anda guclendirir:

- listing tarafinda research prompt daha Etsy-uyumlu, daha SEO odakli ve daha az kolayci hale gelir
- gorsel tarafta prompt paketi daha dikkat cekici ama urun sadakatini koruyan bir master prompt + 10 varyasyon sistemine donusur

Bunun sonucu olarak kullanici, hem metin hem de gorsel tarafta Etsy icin daha guclu, daha net konumlanmis ve daha kaliteli promptlar elde eder; ayni anda urunun AI tarafindan bozulma riski daha sert guardrail'lerle sinirlanir.
