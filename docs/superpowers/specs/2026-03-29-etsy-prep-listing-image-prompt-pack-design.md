# Etsy Hazırlıkta Listing ve Görsel Prompt Pack Tasarımı

**Tarih:** 2026-03-29  
**Durum:** Tasarım onaylandı  
**Kapsam:** `apps/web`, `apps/api`, `packages/shared`, `docs/superpowers`

---

## 1. Amaç

Bu değişikliğin amacı, mevcut `Etsy'e Yükle` hazırlık alanını yalnızca alan bazlı üretim yapan bir editör olmaktan çıkarıp, hem manuel hem otomatik kullanılabilen bir **Prompt Pack** çalışma alanına dönüştürmektir.

Beklenen kullanıcı davranışı şudur:

- kullanıcı ürün detayında `Etsy'e Yükle` alanına girer
- sistem, ürün verilerinden Etsy odaklı bir `Listing Prompt Pack` üretir
- kullanıcı isterse bu promptu ChatGPT'ye kopyala-yapıştır yapar
- kullanıcı isterse aynı prompt mantığını sistemin bağlı AI sağlayıcısıyla otomatik çalıştırır
- sistem, `title`, `description` ve `tags` alanlarını tek üretim sonucuyla doldurur
- sistem ayrıca referans ürün görselini bozmadan yeni pazarlama/lifestyle sahnesi üretmeye yönelik ayrı bir `Image Prompt Pack` sunar

Bu tasarımın hedefi prompt metni yazdırmak değil, Etsy odaklı üretim kalitesini daha kontrollü ve daha az kırılgan hale getirmektir.

---

## 2. Mevcut Durum ve Problem

Kod tabanı incelendiğinde mevcut Etsy hazırlık akışının ağırlıklı olarak **alan bazlı prompt üretimi** mantığıyla çalıştığı görülüyor:

- `apps/api/src/modules/etsyPrep/buildEtsyPrepFieldPackage.ts` bugün `title`, `description` ve `tags` için ayrı ayrı prompt paketi üretiyor.
- `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` bu alan bazlı paketleri alıp connector üzerinden ayrı ayrı çalıştırıyor.
- `apps/web/src/features/etsyPrep/components/GenerationFieldRow.tsx` da bu davranışı kullanıcı arayüzünde alan bazlı butonlarla sunuyor.

Bu yapı teknik olarak çalışsa da kullanıcının yeni ihtiyacı için eksik kalıyor:

- tek seferde `title + description + tags` üreten bir ana prompt yok
- ChatGPT'ye kopyala-yapıştır yapılabilecek, kendi içinde kuralları taşıyan self-contained prompt yok
- görsel üretimi için ayrı, güvenli ve ürün kimliğini koruyan bir prompt sistemi yok
- otomatik üretim ile manuel kopyala-yapıştır akışı aynı omurgadan beslenmediği için ileride tutarsızlık riski var
- ham kaynak açıklama içindeki pazar yeri copu prompta taşınabiliyor
- görsel URL listeleri listing promptuna sızabiliyor
- model çıkışı JSON kontratına uysa bile dil, başlık stili ve içerik temizliği istenen kalite seviyesine zorlanmıyor
- görsel üretim ana promptu gereksiz ürün JSON dump'i içerdiğinde sahne kalitesi düşüyor ve model dikkatini referans görselden uzaklaştırıyor

Kullanıcının istediği deneyim, sohbet hafızasına dayalı "önce sistemi öğret, sonra ürünü ver" yaklaşımı değil; sistem içinde saklanan kurallardan her ürün için güvenilir prompt paketleri üretmektir.

---

## 3. Onaylanan Ürün Kararları

Bu tasarım için aşağıdaki kararlar onaylandı:

- çözüm **hibrit** olacaktır; hem `Promptu Kopyala` hem `AI ile Üret` akışı birlikte desteklenecektir
- sistem, sohbet hafızasına güvenen iki aşamalı eğitim modeli kullanmayacaktır
- uygulama içinde versionlanmış tek bir `Master Rulebook` bulunacaktır
- `Listing Prompt` tek seferde `title`, `description` ve `tags` üretecektir
- listing çıktısı **strict JSON** olacaktır
- çıktı kontratı şu şekildedir:

```json
{
  "title": "...",
  "description": "...",
  "tags": "tag1, tag2, tag3"
}
```

- `tags` alanı JSON array değil, virgülle ayrılmış tek string olacaktır
- görsel üretimi için listing promptundan tamamen ayrı bir `Image Prompt Pack` üretilecektir
- görsel promptu, referans görseldeki ürünü **kesinlikle bozmayacak**, yeni ürün detayı uydurmayacak ve yalnızca sahne/çekim/styling varyasyonları sunacaktır
- `Image Prompt Pack` çıktısı `1 ana prompt + 7 kısa varyasyon` olacaktır
- 7 kısa varyasyon, sahne + çekim açısı + styling tonu değiştirerek üretilecektir
- V1 kapsamında yalnızca prompt gösterimi değil, aynı prompt mantığıyla **otomatik AI üretimi** de yer alacaktır
- listing çıktısı **yalnızca İngilizce** olacaktır; Türkçe kaynak dil doğrudan kopyalanmayacaktır
- model çıktısı yalnızca çıplak JSON object olacaktır; markdown code fence, açıklama metni veya ön/arka metin bulunmayacaktır
- prompta ham `descriptionRaw` doğrudan gömülmeyecek; önce sanitize edilip yalnızca ürüne ait temiz gerçekler çıkarılacaktır
- `Trendyol`, kampanya dili, yorum çağrısı, indirim çağrısı, satıcı CTA'ları, kupon/kargo/taksit metinleri ve benzeri pazar yeri copu prompttan çıkarılacaktır
- raw görsel URL'leri listing promptu ve image promptu metnine gömülmeyecektir
- başlıkta tüm varyant matrisini dökme, açıklamada pazar yeri meta bilgisini tekrar etme ve ürün dışı boilerplate taşıma açıkça yasak olacaktır
- image prompt ana metni içine `attributes`, `variants`, `images`, `existingDraft` veya benzeri ürün JSON blokları gömülmeyecektir
- image prompt, referans görseli tek hakikat kaynağı kabul eden kısa ve sağlam bir yaratıcı brief olarak üretilecektir
- prompt kural seti veritabanında serbest düzenlenebilir metin olarak değil, kod içinde denetlenebilir ve review edilebilir şekilde tutulacaktır
- `etsy_drafts` kalıcı çıktı katmanı olarak kullanılmaya devam edecektir; prompt metinleri varsayılan olarak kalıcı saklanmayacaktır

---

## 4. Dış Kural Girdileri

Bu tasarım yalnızca iç varsayımlara dayanmayacaktır. Prompt kuralları Etsy'nin güncel resmi yönlendirmeleriyle hizalanacaktır.

Bu tasarımı yönlendiren ana resmi kaynaklar şunlardır:

- Etsy Seller Handbook: [Keywords 101: Everything You Need to Know](https://www.etsy.com/seller-handbook/article/382774281517)
- Etsy Seller Handbook: [The Anatomy of a Well-Crafted Etsy Listing](https://www.etsy.com/seller-handbook/article/1347574487014)
- Etsy Seller Handbook: [What is Etsy’s stance on AI creations?](https://www.etsy.com/se-en/seller-handbook/article/1275449912004)

Bu kaynaklardan tasarımı etkileyen ana sinyaller:

- başlık kısa, açık ve taranabilir olmalıdır
- başlığın başında en güçlü açıklayıcı anahtar kelimeler yer almalıdır
- açıklamanın ilk cümlelerinde ilgili anahtar kelimeler doğal biçimde bulunmalıdır
- 13 tag fırsat olarak kullanılmalıdır
- tag'ler çok kelimeli, çeşitli ve tekrarsız olmalıdır
- kategori ve attribute ile birebir çakışan boş tekrarlar azaltılmalıdır
- yanlış materyal, yanlış içerik veya aldatıcı sunum politikaya aykırı risk üretir

Ayrıca Etsy'nin AI duruş sayfası, ürünün kendisi AI ile üretildiyse listing açıklamasında bunun belirtilmesi gerektiğini açıkça söyler. Bu projede satılan şey fiziksel ürün olduğundan ve AI tarafı listing metni ile pazarlama görseli hazırlama desteği olarak kullanıldığından, V1'de otomatik disclosure eklenmemesi tercih edilmiştir. Bu sonuç doğrudan bir kural alıntısı değil, resmi kaynaktan çıkarılmış bir yorumdur; nihai içerik kontrolü kullanıcıda kalır.

---

## 5. Değerlendirilen Yaklaşımlar

### Yaklaşım A - Sohbeti Önce Eğit, Sonra Ürünü Ver

İlk mesajda ChatGPT'ye ana kuralları öğretmek, ikinci mesajda ürün verisini geçirmek.

**Artıları**

- ilk bakışta basit görünür
- kullanıcıya doğal sohbet hissi verir

**Eksileri**

- yeni sohbet açıldığında kurallar kaybolur
- manuel kullanımda hata olasılığı artar
- sistem içine güvenilir şekilde gömülmesi zordur
- otomatik üretim ile manuel akış aynı omurgayı paylaşmaz

### Yaklaşım B - Kod İçinde Rulebook + Self-Contained Prompt Pack (**seçilen**)

Sabit bir `Master Rulebook` tanımlayıp her ürün için self-contained `Listing Prompt Pack` ve `Image Prompt Pack` üretmek.

**Artıları**

- en kararlı modeldir
- otomatik üretim ve manuel kopyala-yapıştır aynı mantığa bağlanır
- promptlar yeni sohbetlerde de çalışır
- mevcut Etsy prep akışına daha temiz oturur
- görsel promptu listing promptundan ayrılarak kalite korunur

**Eksileri**

- prompt kurallarının ilk kurulumda dikkatli modellenmesi gerekir
- alan bazlı mevcut akış ile yeni pack akışının birlikte yönetilmesi gerekir

### Yaklaşım C - Tam Gizli Otomasyon

Kullanıcıya prompt göstermeden sistemin yalnızca arka planda üretim yapması.

**Artıları**

- en hızlı görünen kullanıcı deneyimidir

**Eksileri**

- manuel kontrol ve ChatGPT fallback ihtiyacını karşılamaz
- prompt kalitesini çıplak gözle denetlemeyi zorlaştırır
- kullanıcının istediği kopyala-yapıştır deneyimini vermez

Seçilen çözüm: **Yaklaşım B**.

---

## 6. Seçilen Çözümün Ana Mimarisi

Seçilen tasarım, mevcut Etsy prep çalışma alanını dört katmanlı bir prompt mimarisiyle genişletir:

1. `Master Rulebook`
2. `Prompt Context Sanitizer`
3. `Listing Prompt Builder`
4. `Image Creative Brief Builder`

Bu katmanların davranışı şöyledir:

- `Master Rulebook`, Etsy SEO ve policy guardrail bilgisini tutar
- `Prompt Context Sanitizer`, ham ürün verisinden yalnızca satışa uygun, temiz ve doğrulanmış gerçekleri çıkarır
- `Listing Prompt Builder`, sanitize edilmiş ürün bağlamı + rulebook ile tek seferlik listing prompt üretir
- `Image Creative Brief Builder`, referans görseli ana doğruluk kaynağı kabul eden kısa ve veri dump'siz görsel prompt paketi üretir
- `AI ile Üret`, aynı listing promptunu aktif AI sağlayıcısına göndererek JSON sonuç üretir
- `Promptu Kopyala`, aynı listing promptunu kullanıcıya manuel kullanım için verir

Bu mimari sayesinde prompt mantığı tekil olur; yalnızca tüketim şekli ikiye ayrılır:

- manuel kullanım
- otomatik kullanım

---

## 7. Prompt Sistemi Tasarımı

### 7.1 `Master Rulebook`

`Master Rulebook` kod içinde versionlanmış sabit bir kaynak olacaktır.

Önerilen yapı:

- `version`
- `inputSanitizationRules`
- `listingRole`
- `listingGuardrails`
- `listingSeoRules`
- `imageRole`
- `imageGuardrails`
- `imagePromptStructure`
- `outputContracts`
- `sourceNotes`

Önerilen yer:

- `apps/api/src/modules/etsyPrep/prompts/masterRulebook.ts`

Bu dosya veritabanında düzenlenebilir serbest metin olmayacaktır. Gerekçeler:

- prompt mantığı review edilebilir olmalıdır
- değişiklikler git geçmişinde açık görülmelidir
- üretim kalitesini etkileyen kurallar sessizce bozulmamalıdır
- ilk iterasyonda kullanıcıya prompt CMS açmak gereksizdir

### 7.2 `Listing Prompt`

`Listing Prompt`, ChatGPT'ye tek mesaj olarak gönderilecek self-contained prompt olacaktır. "Önce bunu öğren, sonra şunu yap" modeli kullanılmayacaktır.

Bu prompt aşağıdaki bloklardan oluşur:

1. `Role`
2. `Non-Negotiable Rules`
3. `Language Rules`
4. `SEO Rules`
5. `Sanitized Product Facts`
6. `Output Format`

`Role` kısmı modelin görevini net tanımlar:

- Etsy listing strategist
- Etsy copywriter
- policy-aware SEO assistant

`Non-Negotiable Rules` kısmı sert güvenlik katmanıdır:

- yalnızca verilen ürün bilgisine dayan
- doğrulanmamış özellik uydurma
- yanlış materyal, yanlış ölçü, yanlış paket içeriği yazma
- gerçek olmayan claim üretme
- pazar yeri adı, kampanya metni, yorum çağrısı, kupon/kargo/taksit dili yazma
- ham URL, CDN linki, görsel listesi veya kaynak platform izini çıktıya taşıma
- markdown code fence, açıklama satırı veya JSON dışı metin üretme
- başlığı spam listeye çevirme
- description içinde anahtar kelime yığını üretme

`Language Rules` kısmı dil kalitesini sabitler:

- çıktı dili yalnızca İngilizce olsun
- marka, özel isim ve teknik sabitler dışında Türkçe kelime taşıma
- kaynak başlık Türkçe olsa bile doğrudan çeviri kokan, yerel pazar yeri tonu taşıyan metin üretme

`SEO Rules` kısmı Etsy sinyallerini gömülü hale getirir:

- en anlamlı anahtar kelimeleri başlıkta erken konumlandır
- başlığı insan için okunur tut
- tüm uzunluk, renk veya varyant listesini başlığa dökme
- açıklamanın ilk cümlelerinde anahtar kelimeleri doğal kullan
- tag'leri long-tail, çeşitli ve tekrarsız üret
- kategori ve attribute ile birebir aynı boş tekrarları azalt

`Sanitized Product Facts` kısmına dinamik olarak şunlar yerleştirilir:

- Trendyol kaynak başlığı
- marka
- kategori
- temizlenmiş ürün özeti
- filtrelenmiş attribute'ler
- satış açısından anlamlı varyant özeti
- varsa materyal, renk, ölçü, kullanım alanı
- varsa mevcut Etsy taslak verisi

Burada özellikle şunlar prompt dışında tutulur:

- ham `descriptionRaw`
- `Trendyol'a özel`, `yorumlarını inceleyin`, `indirimli fiyat`, `sepete ekle` benzeri pazar yeri cümleleri
- raw görsel URL listeleri
- kaynak HTML veya metin artıkları
- satışa etkisi olmayan boilerplate garanti/menşei/bakım metinleri

Bu katmanda amaç ham kaynağı modele dökmek değil, modelin yalnızca temiz ürün gerçekleriyle çalışmasını sağlamaktır.

`Output Format` bölümü strict JSON ister:

```json
{
  "title": "...",
  "description": "...",
  "tags": "tag1, tag2, tag3"
}
```

Burada `tags` özellikle virgülle ayrılmış string olarak istenir. Sistem daha sonra bu değeri UI tarafında parçalayabilir, ancak prompt kontratı bu formatı korur.

### 7.3 `Image Prompt Pack`

`Image Prompt Pack`, listing promptundan tamamen bağımsızdır.

Amacı:

- referans ürün fotoğrafını bozmadan
- yeni sahne, ışık ve kompozisyon önerileri üretmek
- pazarlama/lifestyle görseli için güvenli prompt vermek
- modele gereksiz ürün datası yüklemeden kısa ve güçlü bir yönlendirme vermek

Bu prompt paketi iki parçadan oluşur:

- `mainPrompt`
- `variations[7]`

`mainPrompt` tek ve en güçlü yönlendirmeyi verir. Bu metin bir ürün JSON dump'i olmayacaktır.

`variations[7]` ise kısa varyasyonlar olarak sunulur ve şunları değiştirir:

- sahne tipi
- çekim açısı
- styling tonu

Ancak şu şeyler değiştirilemez:

- ürün formu
- ürün rengi
- ürün materyal hissi
- baskı/desen/aksesuar detayları
- ürünün ana yapısal parçaları

Image prompt çıktısı JSON zorunluluğu taşımaz; düz metin prompt paketi olarak gösterilir. Çünkü hedefi başka bir image modeline veya ChatGPT içindeki görsel üretim arayüzüne yapıştırmaktır.

Ancak image prompt metni içine de raw görsel URL'leri gömülmez. Sistem yalnızca referans görsel bulunduğunu ve kullanıcının bunu manuel sağlayacağını varsayar.

Image promptta özellikle bulunmaması gereken şeyler:

- `PRODUCT_CONTEXT` başlığı altında tam JSON blokları
- `attributes`, `variants`, `images`, `existingDraft` dump'i
- garanti süresi, menşei, bakım talimatı gibi görsel kompozisyona katkı sağlamayan metinler
- `yorumlarını inceleyin`, `indirimli fiyata satın alın` gibi pazar yeri dili
- fiyat bilgisi, stok durumu, varyant fiyatları

Image promptta bulunabilecek şeyler en fazla şunlardır:

- referans görselin hakikat kaynağı olduğu bilgisi
- ürünün bozulmaması için sert guardrail'ler
- istenen sahne tonu
- ışık yönü
- kompozisyon talimatı
- arka plan/styling seviyesinde yaratıcı yönlendirme

Buradaki temel ilke şudur: image modeline ürün bilgisini uzun metin olarak anlatmaya çalışmak yerine, ürünü referans görselden okumasını ve yalnızca sahneyi yeniden kurmasını istemek.

---

## 8. Kullanıcı Arayüzü ve Akış Tasarımı

Bu tasarım, mevcut `EtsyPrepWorkspace` içine yeni bir `Prompt Pack` bölümü ekler.

### 8.1 Ana bölümler

Önerilen düzen:

1. `Canlı Analiz`
2. `Listing Prompt Pack`
3. `Görsel Prompt Pack`
4. `Title / Description / Tags` düzenleme alanları
5. `SEO Notları` ve `Etsy Uyum Kontrolleri`

### 8.2 `Listing Prompt Pack` davranışı

Bu bölümde şunlar bulunur:

- `Promptu Kopyala`
- `AI ile Üret`
- prompt önizlemesi
- `rulebookVersion` gibi hafif metadata

`Promptu Kopyala` davranışı:

- mevcut ürün verisinden üretilen self-contained promptu panoya kopyalar
- kullanıcı bunu ChatGPT'ye manuel yapıştırabilir
- prompt önizlemesi sanitize edilmiş bağlamdan üretildiği için ham pazar yeri copunu ve görsel URL'lerini içermez

`AI ile Üret` davranışı:

- aynı promptu aktif AI sağlayıcısına gönderir
- dönen JSON parse edilir
- `title`, `description` ve `tags` alanlarına birlikte uygulanır
- alanlar `generated` olarak işaretlenir

### 8.3 `Görsel Prompt Pack` davranışı

Bu bölümde şunlar bulunur:

- `Ana Promptu Kopyala`
- `7 Varyasyonu Kopyala`
- ürün sadakati guardrail özeti

Bu bölüm sistem içinde otomatik görsel üretmek zorunda değildir. V1 davranışı prompt üretmek ve kopyalamaktır. Kullanıcı referans görseli manuel yükler ve promptu tercih ettiği görsel üretim aracında kullanır.

UI ürün görsellerini kullanıcıya referans olarak gösterebilir; ancak bu görsellerin URL'leri prompt metnine düz yazı halinde taşınmaz.

Ana prompt önizlemesi kısa tutulmalıdır. Kullanıcı ekranda dev JSON blokları değil, doğrudan kopyalanabilir net bir creative brief görmelidir.

### 8.4 Mevcut alanlarla ilişki

Mevcut `GenerationFieldRow` satırları tümden kaldırılmak zorunda değildir. Ancak ana akış artık alan bazlı üç ayrı üretim değil, tek seferlik listing pack üretimi olacaktır.

Bu nedenle V1 yönü şöyledir:

- pack tabanlı üretim birincil akış olur
- alan editörleri sonuçları inceleme ve manuel düzeltme alanı olarak kalır
- mevcut alan bazlı generate butonları ikincil veya gizli fallback olarak ele alınabilir

Bu seçim, kullanıcıyı tek master prompt mantığına yaklaştırır ve çalışma şeklini sadeleştirir.

---

## 9. API ve Sözleşme Tasarımı

Mevcut owner-scoped Etsy prep route ailesi korunur:

- `GET /owners/:ownerKey/products/:productId/etsy-prep`
- `POST /owners/:ownerKey/products/:productId/etsy-prep/analyze`
- `PUT /owners/:ownerKey/products/:productId/etsy-prep/save`

Bu tasarımla birlikte yeni prompt pack uçları önerilir:

- `POST /owners/:ownerKey/products/:productId/etsy-prep/prompt-pack`
- `POST /owners/:ownerKey/products/:productId/etsy-prep/generate-listing-pack`

### 9.1 `prompt-pack` çıktısı

Önerilen cevap yapısı:

```json
{
  "rulebookVersion": "etsy-prompt-pack-v1",
  "generatedAt": 1774742400000,
  "listingPromptPack": {
    "prompt": "...",
    "outputContract": {
      "type": "json",
      "fields": ["title", "description", "tags"]
    }
  },
  "imagePromptPack": {
    "mainPrompt": "...",
    "variations": ["...", "..."]
  }
}
```

### 9.2 `generate-listing-pack` çıktısı

Önerilen cevap yapısı:

```json
{
  "provider": "openai-oauth",
  "rulebookVersion": "etsy-prompt-pack-v1",
  "result": {
    "title": "...",
    "description": "...",
    "tags": "tag1, tag2, tag3"
  }
}
```

Bu yapı sayesinde UI aynı omurgayı iki yolla kullanabilir:

- prompt kopyalama
- otomatik üretim

### 9.3 Geriye dönük uyum

Mevcut `generate-title`, `generate-description`, `generate-tags` uçları ilk iterasyonda hemen silinmek zorunda değildir. Ancak yeni tasarımın birincil sözleşmesi artık pack tabanlı olacaktır.

---

## 10. Saklama ve Versiyonlama

### 10.1 Promptların kalıcılığı

`Prompt Pack` varsayılan olarak kalıcı veri olmayacaktır. Her istek sırasında runtime'da üretilecektir.

Bunun nedenleri:

- ürün verisi değişirse prompt da güncel kalsın
- rulebook değişirse prompt otomatik güncellensin
- veritabanında prompt cache yönetimi gereksiz büyümesin
- sanitize kuralları değişirse ham kirli kaynakları yeniden taşımadan anında daha temiz prompt üretilebilsin

### 10.2 Kalıcı kalan veri

Kalıcı katman mevcut `etsy_drafts` tablosu olmaya devam eder.

Kaydedilecek şey prompt değil, prompttan çıkan çalışma sonucudur:

- `english_title`
- `long_description`
- `tags_json`
- `seo_notes`
- `policy_notes`

### 10.3 Metadata

Prompt pack cevabında şu hafif metadata alanları bulunacaktır:

- `rulebookVersion`
- `generatedAt`
- `productSnapshot` veya eşdeğer özet bağlam

Bu metadata UI ve debug için yararlıdır. Ancak V1'de zorunlu veritabanı kalıcılığı gerektirmez.

---

## 11. Guardrail ve Hata Yönetimi

### 11.1 Listing guardrail

Sistem prompt ve sonuç doğrulamasında şunları korumalıdır:

- olmayan materyal/ölçü/paket içeriği üretme
- doğrulanmamış kalite iddiaları üretme
- aynı kelimeleri spam biçimde tekrar etme
- tag'leri 13 fırsat mantığına aykırı daraltma
- aldatıcı ürün sunumu üretme
- Türkçe listing çıktısı üretme
- başlığa varyant matrisi yığma
- açıklamaya pazar yeri boilerplate taşıma
- `http`, `https`, `cdn.` veya platform izi taşıyan ham URL üretme

Ayrıca bazı riskli kelimeler yalnızca açık dayanak varsa kullanılmalıdır:

- `handmade`
- `organic`
- `premium`
- `luxury`
- `gift-ready`
- materyal odaklı kesin ifadeler

### 11.2 Görsel guardrail

Image prompt tarafında şu kurallar sert olmalıdır:

- referans ürünü yeniden tasarlama
- yeni parça ekleme
- renk değiştirme
- baskı/desen uydurma
- yanıltıcı ürün varyasyonu üretme
- önemli ürün detaylarını kadraj dışında bırakma
- gereksiz ürün metadata dump'i ile promptu şişirme
- görsel modele URL, varyant fiyatı, garanti, menşei gibi sahne dışı veri yükleme

### 11.3 Fallback davranışı

Aktif AI sağlayıcısı çalışmıyorsa:

- `Promptu Kopyala` akışı yine çalışmalıdır
- kullanıcı manuel kullanımda bloklanmamalıdır
- pack üretimi ile otomatik üretim birbirine bağımlı hale getirilmemelidir

### 11.4 Parse ve doğrulama

`generate-listing-pack` sonucunda dönen JSON şu kontrollerden geçmelidir:

- `title` boş değil
- `description` boş değil
- `tags` string formatında
- `tags` parse edilince boş olmayan, tekrar kontrolünden geçen bir liste çıkarılabiliyor
- çıktı markdown code fence içermiyor
- çıktı içinde `Trendyol`, `yorumlarını inceleyin`, `indirimli fiyat`, `http://`, `https://`, `cdn.` gibi yasaklı token'lar bulunmuyor
- çıktı dil kontrolünde baskın olarak İngilizce görünüyor

Sonuç parse edilemezse alanlar sessizce kirlenmemeli; kullanıcıya hata verilmeli ve prompt kopyalama seçeneği korunmalıdır.

---

## 12. Test Stratejisi

### 12.1 Unit test

- rulebook builder doğru versiyonu dönüyor mu
- sanitize katmanı Trendyol CTA, kampanya metni ve URL'leri temizliyor mu
- listing prompt builder ürün bağlamını doğru yerleştiriyor mu
- listing prompt builder ham `Images` ve ham `descriptionRaw` bloklarını prompta gömmüyor mu
- image prompt builder `main + 7 variation` sözleşmesini sağlıyor mu
- image prompt builder `PRODUCT_CONTEXT` JSON, raw URL, varyant fiyatı ve gereksiz metadata gömmüyor mu
- tags string normalizasyonu doğru çalışıyor mu

### 12.2 Integration test

- `prompt-pack` endpoint'i listing ve image pack'i birlikte döndürüyor mu
- `generate-listing-pack` aynı prompt mantığını kullanarak parse edilebilir JSON üretiyor mu
- üretilen listing sonucu İngilizce dışı/pazar yeri kokulu içerik taşıdığında doğrulama bunu reddediyor mu
- aktif AI sağlayıcısı yokken prompt pack yine alınabiliyor mu

### 12.3 UI test

- `Promptu Kopyala` butonu doğru promptu kopyalıyor mu
- `AI ile Üret` alanları tek seferde dolduruyor mu
- `Ana Promptu Kopyala` ve `7 Varyasyonu Kopyala` çalışıyor mu
- otomatik üretim hatasında kullanıcı manuel akışa düşebiliyor mu

### 12.4 Regression test

- mevcut Etsy prep kaydetme akışı bozulmuyor mu
- draft alanlarına uygulanan üretim sonucu doğru saklanıyor mu
- ürün detayından `Etsy'e Yükle` moduna geçiş bozulmuyor mu

---

## 13. Kapsam Sınırları

Bu tasarımın kapsamı dışındadır:

- Etsy'ye doğrudan publish / listing gönderme
- uygulama içinde tam görsel üretim motoru kurma
- promptları son kullanıcı için tam bir CMS olarak düzenlenebilir yapma
- promptları kalıcı cache olarak veritabanında biriktirme
- fiziksel ürün listing'leri için otomatik AI disclosure ekleme

Özellikle son madde bilinçli olarak kapsam dışıdır. Çünkü bu ürün türünde disclosure gerekip gerekmediği bağlama göre değerlendirilmeli ve nihai listing kontrolü kullanıcıda kalmalıdır.

---

## 14. Başarı Kriterleri

Bu tasarım başarılı sayılacaktır eğer:

- kullanıcı tek tıkla ChatGPT'ye yapıştırılabilir listing promptunu alabiliyorsa
- kullanıcı aynı mantıkla sistem içinde otomatik listing üretebiliyorsa
- `title`, `description` ve `tags` tek üretim akışıyla birlikte doluyorsa
- `tags` sonucu virgülle ayrılmış string kontratını koruyorsa
- image prompt paketi ana prompt + 7 kısa varyasyon olarak üretilebiliyorsa
- görsel promptları referans ürünü bozmayan guardrail taşıyorsa
- AI bağlantısı bozulduğunda manuel prompt akışı çalışmaya devam ediyorsa

---

## 15. Sonuç

Seçilen tasarım, Etsy hazırlık alanını alan bazlı ve parçalı prompt üretiminden çıkarıp, tek omurgalı bir **Prompt Pack** sistemine taşır. Bu sistem:

- Etsy odaklı kural setini kod içinde versionlar
- manuel kopyala-yapıştır kullanımını destekler
- aynı prompt mantığını otomatik AI üretimi için yeniden kullanır
- görsel promptunu listing promptundan ayırarak kaliteyi korur
- ürün sadakati guardrail'leriyle yanıltıcı görsel riskini sınırlar

Böylece kullanıcı daha az kırılgan, daha kolay tekrarlanabilir ve Etsy odaklı bir çalışma akışı elde eder.
