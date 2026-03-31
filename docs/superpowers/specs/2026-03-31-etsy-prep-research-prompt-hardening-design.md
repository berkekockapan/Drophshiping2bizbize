# Etsy Prep Research Prompt Hardening Tasarimi

**Tarih:** 2026-03-31  
**Durum:** Yazili spec hazir  
**Kapsam:** `apps/api`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, `Etsy'e Yukle` ekranindaki `Listing Prompt Pack` alaninda yer alan **`ChatGPT Research Prompt Preview`** metnini guclendirmektir.

Hedef, kullanicinin bu promptu ChatGPT'ye verdiginde:

- Etsy Seller Handbook ve Etsy rakip arastirmasini gercekten yapmaya zorlanan
- Etsy SEO acisindan daha guclu
- Etsy listing yapisina daha uyumlu
- kisa, jenerik ve kolayci ciktilardan uzak duran
- baslik, aciklama ve tag tarafinda birlikte calisan
- urunu rakipler arasinda daha guclu konumlandiran

bir manuel listing cikisi alabilmesidir.

Bu tasarim **yalnizca** `ChatGPT Research Prompt Preview` uretimini kapsar. `System Prompt Preview`, `AI ile Uret` akisi, JSON kontrati ve gorsel prompt paketi kapsam disidir.

---

## 2. Problem

Mevcut `buildChatGptResearchPromptPack` icindeki prompt zaten browse-first niyet tasisa da pratikte su sorunlar devam etmektedir:

- model bazen arastirma yaptigini varsayip yetersiz rekabet analizi ile sonuca gidebiliyor
- baslik tarafinda Etsy arama niyeti ile katalog dili arasindaki kalite cizgisi yeterince sert cizilmiyor
- aciklama bazen fazla kisa, fazla genel ya da yuzeysel kalabiliyor
- tagler buyer-intent yerine ayni kok kelimenin varyasyonlarina donusebiliyor
- tag mantigi aciklamanin icine yeterince dogal ve stratejik dagilmiyor
- model bazen "guvenli ama zayif" seceneklere kayip urunu one cikartacak ayrismayi zayiflatiyor

Kullanici beklentisi, promptun sadece "iyi" degil, **Etsy icin daha agresif kalite filtresi uygulayan** bir arastirma ve yazim rehberi haline gelmesidir.

---

## 3. Onaylanan Urun Kararlari

- Degisiklik yalnizca `ChatGPT Research Prompt Preview` tarafinda yapilacaktir.
- `buildListingPromptPack` ve `generateListingPackWithOpenAi` davranisi degismeyecektir.
- Nihai cevap formati ayni kalacaktir:
  - `1. Title`
  - `2. Description`
  - `3. Tags`
- Cikti dili yalnizca dogal Ingilizce olacaktir.
- Aciklama kisa olmaya zorlanmayacaktir.
- Aciklama icinde tag mantigi dogal bicimde kullanilacaktir.
- Emoji kullanimi izinli kalacak, ancak hafif ve kontrollu olacaktir.
- Prompt, ChatGPT'nin kolayci veya jenerik taslaklari kendi icinde elemesini daha acik bicimde isteyecektir.

---

## 4. Tasarim Hedefleri

Yeni prompt asagidaki kalite hedeflerini ayni anda zorlamalidir:

1. **Arastirma disiplini:** Model Etsy Seller Handbook ve Etsy rakip sayfalarini gercekten incelemeden yazmamalidir.
2. **Buyer-intent odagi:** Baslik ve tagler, gercek Etsy arama kaliplarina yaklasmalidir.
3. **Ayrisma:** Rakiplerde cok tekrar eden ama zayif kalan dil kaliplari ayiklanmali, urun dogru farklastirici acidan konumlanmalidir.
4. **Description depth:** Aciklama jenerik ovgu metni degil, ikna edici ve SEO dokulu bir listing olarak yazilmalidir.
5. **Cross-field consistency:** Baslik, aciklama ve tagler ayni keyword stratejisinden beslenmelidir.
6. **Truthfulness:** Prompt daha agresif olsa da urun verisinde olmayan claim'ler uretmeye izin vermemelidir.

---

## 5. Secilen Cozum

Secilen cozum, mevcut promptu ufak ifadelerle yamamak yerine onu **daha katmanli bir kalite kontrol promptuna** donusturmektir.

Bu yapi 4 asamada calisir:

### 5.1 Zorunlu arastirma cercevesi

Prompt, modelden su arastirma adimlarini acik bicimde isteyecektir:

- Etsy Seller Handbook icindeki temel listing ve keyword prensiplerini kontrol et
- ayni urun grubunda, Ingilizce Etsy marketinde anlamli sayida rakip listing incele
- tekrar eden title kaliplari, yaygin zayif tag kumelemeleri, bos generik description dili ve gercek ayrisma firsatlarini cikar

Ancak bu arastirma ciktilari final cevapta gorunmeyecek; yalnizca ic degerlendirme olarak kullanilacaktir.

### 5.2 Keyword angle secimi

Prompt, modelin yazmadan once:

- tam olarak 1 ana keyword angle
- tam olarak 2 destekleyici keyword angle

secmesini isteyecektir. Boylece model her seyi ayni anda hedefleyen daginik bir listing yerine daha tutarli bir Etsy listing mantigi kuracaktir.

### 5.3 Alan bazli yazim kurallari

Prompt, title / description / tags icin daha keskin kabul-red kurallari icerecektir.

- **Title** Etsy arama niyetiyle baslayacak, spam synonym stacking yapmayacak, katalog son eklerine kaymayacak.
- **Description** tam olarak 3 paragrafli kalacak ancak daha derin, daha ikna edici ve tag mantigini dogal sekilde iceren bir yapida olacak.
- **Tags** tam 13 adet, benzersiz, 20 karakter sinirina uygun, buyer-intent agirlikli ve kok kelime tekrarina direncli olacak.

### 5.4 Final self-reject dongusu

Prompt, modelin finalden once su zayifliklari sessizce reddetmesini isteyecektir:

- fazla katalog gibi duran baslik
- fazla kisa veya fazla genel description
- ayni kok kelimeye yuklenen tag seti
- description icine dogal sekilde yedirilmemis keyword yapisi
- rakip listinglerin zayif kaliplarini taklit eden cikti

Bu sayede kullanicinin sikayet ettigi "kisa, kolayci, yeterince Etsy odakli olmayan" cikti sinifi dogrudan hedeflenecektir.

---

## 6. Prompt Iceriginde Yapilacak Somut Degisiklikler

### 6.1 Research kismini sertlestirme

Mevcut prompttaki browse-first talimati korunur, ancak su kavramlar daha acik hale getirilir:

- arastirmadan kacma
- yeterli sayida Etsy sonucu inceleme
- rakiplerde tekrar eden ama zayif kalan kaliplari bulma
- market gap tespiti
- sonucu yazmadan once bu sinyallerden net bir pozisyon secme

### 6.2 Title kurallarini guclendirme

Title bolumunde su kalite sinyalleri sertlestirilir:

- ana buyer query en basta olmali
- ana urun tipi ile farklastirici bir arada olmali
- ayni urun tipini farkli sinonimlerle sisirmemeli
- attribute dump, raw fragment ve teknik varyant dili title sonuna eklenmemeli
- sade ama guclu olmali; fazla kisa ya da bos olmamali

### 6.3 Description kurallarini derinlestirme

Description icin su guclendirmeler yapilir:

- "kisa olma" baskisi tamamen kaldirilir, ama kontrolsuz uzama da tesvik edilmez
- paragraf 1 ana arama niyetini ve urun vaadini net kurar
- paragraf 2 rakiplerde gorulen zayifliklara dusmeden neden daha iyi bir secim oldugunu anlatir
- paragraf 3 stil, kombin, kullanim senaryosu veya wardrobe fit tarafini guclendirir
- secilen tag mantigi ve shopper query yapisi aciklamaya dogal bicimde dagitilir
- jenerik template hissi veren baslikciklar ve bos ovgu sifatlari reddedilir

### 6.4 Tag kurallarini guclendirme

Tag tarafinda asagidaki sinirlar korunur veya sertlestirilir:

- tam 13 benzersiz tag
- her biri 20 karakter veya alti
- ayni kok kelime cogu tagi domine edemez
- en az anlamli bir bolumu, urun tipi + farklastirici / urun tipi + use case seklinde olmalidir
- yalnizca yumusak editoral dil degil, gercek shopper query mantigi agir basmalidir
- en zayif 3 tagi sessizce degistir komutu korunur ve daha etkili hale getirilir

### 6.5 Cross-field bagi guclendirme

Prompt acik bicimde sunu isteyecektir:

- title'da one cikan ana angle
- description'in ilk bolumunde desteklenmeli
- tag setinde farkli varyasyonlarla dagitilmali

Boylece uc alan birbirinden kopuk degil, ayni listing stratejisinin parcasi gibi davranacaktir.

---

## 7. Kod Etkisi

Bu tasarim dogrultusunda beklenen kod etkisi dardir:

- Ana degisiklik `apps/api/src/modules/etsyPrep/prompts/buildChatGptResearchPromptPack.ts` dosyasinda olacaktir.
- Gerekirse prompt fixture beklentileri veya ilgili test metinleri guncellenecektir.
- `buildListingPromptPack.ts`, `generateListingPackWithOpenAi.ts`, response contract'lari ve UI kart yapisi degismeyecektir.

Bu sayede risk kontrollu tutulur ve yalnizca manuel research prompt kalitesi artirilir.

---

## 8. Test Stratejisi

### Unit / prompt composition

- Prompt, zorunlu Etsy arastirmasini daha net ifade ediyor mu
- Prompt, quality gate mantigini acik bicimde iceriyor mu
- Prompt, title / description / tags icin sertlestirilmis kurallari tasiyor mu
- Prompt, only-final-output kontratini koruyor mu

### UI regression

- `Research Prompt Preview` hala dogru alanda render oluyor mu
- `ChatGPT Arastirma Promptunu Kopyala` guncel promptu kopyaliyor mu

### Non-regression

- `System Prompt Preview` metni etkilenmiyor mu
- `AI ile Uret` akisi ayni kaliyor mu

---

## 9. Kapsam Disi

- `AI ile Uret` icin kullanilan system promptun sertlestirilmesi
- JSON cikti kontratinin degistirilmesi
- prompt bazli runtime scoring sistemi
- Etsy publish akisi veya listing upload otomasyonu
- gorsel prompt paketinde degisiklik

---

## 10. Sonuc

Bu tasarim, `ChatGPT Research Prompt Preview` metnini daha sert kalite kapilarina sahip, daha Etsy-uyumlu ve daha conversion-odakli hale getirir. Ana fikir, promptu sadece "browse et ve yaz" seviyesinde bir komut olmaktan cikarip; arastirma, keyword angle secimi, alanlar arasi tutarlilik ve zayif ciktilari sessizce eleme adimlari olan bir listing strateji aracina donusturmektir.

Boylece kullanici, manuel ChatGPT kullaniminda Etsy icin daha guclu, daha dogal, daha SEO uyumlu ve rakipler arasinda daha iyi konumlanabilecek listing taslaklari alir.
