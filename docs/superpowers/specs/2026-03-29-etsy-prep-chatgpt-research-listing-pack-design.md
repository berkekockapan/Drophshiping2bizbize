# Etsy Prep ChatGPT Research Listing Pack Tasarimi

**Tarih:** 2026-03-29  
**Durum:** Tasarim onaylandi  
**Kapsam:** `apps/api`, `apps/web`, `packages/shared`, `docs/superpowers`

---

## 1. Amac

Bu degisikligin amaci, mevcut `Listing Prompt Pack` deneyimini iki farkli kullanim moduna ayirmaktir:

- uygulama ici otomatik doldurma icin parse edilebilir `system` prompt
- ChatGPT uzerinde manuel browse-first kullanim icin daha guclu `research` prompt

Beklenen deneyim:

- kullanici `Etsy'e Yukle` alaninda mevcut `Listing Prompt Pack` bolumunu gorur
- sistem mevcut `AI ile Uret` akisini bozmadan strict JSON tabanli system promptu korur
- sistem ayrica ChatGPT'ye kopyalanabilecek yeni bir `Research Prompt` sunar
- bu yeni prompt ChatGPT'den zorunlu olarak Etsy Seller Handbook ve Etsy icinde rakip arastirmasi yapmasini ister
- final cevap yalnizca 3 alan olarak doner:
  - `1. Baslik`
  - `2. Aciklama`
  - `3. Tag`

Bu degisiklik gorsel prompt akisina dokunmaz.

---

## 2. Problem

Mevcut manuel `Listing Prompt Pack` su an self-contained olsa da browse-first degildir. Bu nedenle:

- ChatGPT Etsy icindeki guncel rakipleri ve arama niyetini kontrol etmeden cevap uretebilir
- aciklama Etsy SEO ve donusum kalitesi acisindan fazla genel kalabilir
- title ve tags Etsy'de one cikma niyeti yerine duz keyword varyasyonu gibi kalabilir
- kullanici manuel akista daha iyi kalite isterken sistem JSON kontrati yuzunden ayni promptu fazla kisitli bulabilir

Tek promptu hem browse-first manuel kullanim hem de parse edilebilir sistem uretimi icin kullanmak kirilgan bir tasarim olur.

---

## 3. Onaylanan Urun Kararlari

- `AI ile Uret` akisi korunacaktir
- mevcut strict JSON listing sonucu korunacaktir
- yeni manuel prompt browse-first olacaktir
- ChatGPT arastirma yaptiktan sonra final cevapta yalnizca 3 alan gosterecektir
- final manuel cikti JSON olmayacak, sectioned text olacaktir
- description kisa tutulmaya zorlanmayacaktir
- description, Etsy SEO ve satis diline gore daha detayli yazilacaktir
- description icinde secilen tag mantigi dogal sekilde yedirilecektir
- gerekirse emoji kullanilabilir, ama spam goruntusu vermeyecektir
- ChatGPT Etsy Seller Handbook ve Etsy icinde rakip listing arastirmasi yapacaktir
- gorsel prompt paketinde hicbir degisiklik yapilmayacaktir

---

## 4. Dis Kural Girdileri

Bu tasarim resmi Etsy kaynaklariyla hizalanir:

- Etsy Seller Handbook: [Keywords 101: Everything You Need to Know](https://www.etsy.com/seller-handbook/article/382774281517)
- Etsy Seller Handbook: [The Anatomy of a Well-Crafted Etsy Listing](https://www.etsy.com/seller-handbook/article/1347574487014)
- Etsy Seller Handbook: [What is Etsy’s stance on AI creations?](https://www.etsy.com/seller-handbook/article/1275449912004)

Bu kaynaklardan alinacak ana sinyaller:

- title kisa, acik ve taranabilir olmali
- en guclu tanimlayici keywordler title'in basinda yer almali
- description'in ilk kisimlarinda ana arama niyeti dogal bicimde kullanilmali
- 13 tag firsati etkili sekilde degerlendirilmeli
- tekrarli keyword yigini yerine cesitlendirilmis buyer-intent keywordleri kullanilmali
- yaniltici claim ve desteklenmeyen urun iddialari yazilmamali

---

## 5. Secilen Cozum

Secilen cozum, listing prompt katmanini ikiye ayirmaktir:

### 5.1 `systemListingPromptPack`

Amaç:

- uygulama ici `AI ile Uret` akisi
- strict JSON parse
- deterministik validation

Output:

```json
{
  "title": "...",
  "description": "...",
  "tags": "tag1, tag2, tag3"
}
```

### 5.2 `chatGptResearchPromptPack`

Amaç:

- kullanicinin ChatGPT'ye kopyalayip browse ile manuel, daha guclu listing cikisi almasi

Output:

```text
1. Baslik
...

2. Aciklama
...

3. Tag
tag1, tag2, tag3, ...
```

Bu prompt ChatGPT'ye su is akisini zorunlu kilar:

1. Etsy Seller Handbook sinyallerini kontrol et
2. Etsy icinde ilgili urun grubunda rakipleri incele
3. Rakiplerin keyword, title ve positioning kaliplarini ic degerlendirmede kullan
4. Final cevapta arastirma notlarini gosterme
5. Yalnizca 3 alanlik final sonucu ver

---

## 6. Prompt Kurallari

### 6.1 Baslik

- Etsy aramasinda taranabilir olmali
- ilk kelimelerde ana urun tipi + en guclu farklastirici olmali
- rakiplerdeki spam title kaliplarini kopyalamamali
- okunurluk bozulmamali

### 6.2 Aciklama

- kisa olmak zorunda degildir
- ilk paragrafta ana arama niyetini dogal bicimde kullanmali
- urunu acik, guven veren ve ikna edici bicimde tanitmali
- uygun gorurse hafif emoji kullanabilir
- secilen tag mantigindaki ana keywordleri dogal sekilde metne yaymali
- boilerplate origin, warranty, care, kampanya veya seller CTA metinleri icermemeli

### 6.3 Tag

- tam 13 adet olmali
- benzersiz olmali
- buyer intent odakli olmali
- kategori veya attribute ile bos tekrar yapmamali

---

## 7. API Tasarimi

Mevcut `prompt-pack` response'u genisletilir:

```json
{
  "rulebookVersion": "etsy-prompt-pack-v1",
  "generatedAt": 1774742400000,
  "productSnapshot": { "...": "..." },
  "systemListingPromptPack": {
    "prompt": "...",
    "outputContract": {
      "type": "json",
      "fields": ["title", "description", "tags"]
    }
  },
  "chatGptResearchPromptPack": {
    "prompt": "...",
    "outputFormat": "sectioned-text",
    "researchMode": "required",
    "expectedSections": ["title", "description", "tags"]
  },
  "imagePromptPack": {
    "mainPrompt": "...",
    "variations": ["...", "..."]
  }
}
```

Geriye donuk uyum icin `generate-listing-pack` yalnizca `systemListingPromptPack` kullanir.

---

## 8. UI Tasarimi

`Listing Prompt Pack` kartinda su aksiyonlar yer alir:

- `ChatGPT Arastirma Promptunu Kopyala`
- `Sistem Promptunu Kopyala`
- `AI ile Uret`

Kart, iki prompt modunu kisa aciklama ile ayirir:

- `ChatGPT Research Mode`
  - browse-first
  - final cevap 3 alan
  - rakip ve Etsy arastirmasi zorunlu
- `System Generate Mode`
  - strict JSON
  - otomatik alan doldurma

Gorsel prompt karti degismez.

---

## 9. Test Stratejisi

### Unit

- `chatGptResearchPromptPack` browse-first arastirmayi zorunlu kiliyor mu
- final ciktiyi yalnizca 3 alanla sinirliyor mu
- system prompt halen strict JSON kontratini koruyor mu

### Integration

- `prompt-pack` response'u iki listing prompt modunu birlikte donuyor mu
- `generate-listing-pack` halen system promptu kullaniyor mu

### UI

- `ChatGPT Arastirma Promptunu Kopyala` dogru promptu kopyaliyor mu
- `Sistem Promptunu Kopyala` system promptu kopyaliyor mu
- `AI ile Uret` mevcut otomatik akisi bozmuyor mu

### Regression

- gorsel prompt pack degismiyor mu
- save akisi bozulmuyor mu

---

## 10. Kapsam Disi

- uygulama ici tam browse-first ChatGPT otomasyonu
- gorsel prompt sisteminde degisiklik
- Etsy publish akisi
- prompt CMS

---

## 11. Sonuc

Bu tasarim, mevcut listing prompt sistemini ikiye ayirarak hem parse edilebilir sistem uretimini korur hem de kullaniciya browse-first, rakip arastirmali ve Etsy odakli daha guclu manuel ChatGPT akisi sunar. Boylece otomatik akisin kararliligi ile manuel akisin kalite beklentisi ayni mimaride ama farkli prompt kontratlariyla karsilanir.
