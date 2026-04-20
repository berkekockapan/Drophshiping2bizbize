# Ürün Detayında Etsy Hazırlık Çalışma Alanı Tasarımı

**Tarih:** 2026-03-23  
**Durum:** Tasarım onaylandı  
**Kapsam:** Ürün detay sayfasında açılan Etsy hazırlık modu, canlı analiz akışı, alan bazlı İngilizce içerik üretimi ve ürüne bağlı kalıcı Etsy taslağı kaydetme davranışı

---

## 1. Amaç

Bu değişikliğin amacı, takip edilen bir Trendyol ürününün detay ekranından ayrılmadan Etsy için hazırlık yapılabilmesidir. Kullanıcı ürüne girdiğinde üst tarafta `Etsy'e Yükle` aksiyonunu görmeli, bu aksiyona bastığında aynı sayfa içinde bir `Hazırlık` çalışma alanına geçebilmelidir.

Bu alan yalnızca mevcut SEO editörünün farklı bir yerden açılan kopyası olmayacaktır. Beklenen deneyim şunlardır:

- sistemde kayıtlı güncel ürün verisi otomatik okunur
- sayfa açılır açılmaz Etsy odaklı genel analiz başlar
- kullanıcı analiz ilerleyişini canlı olarak görür
- `Title`, `Description` ve `Tags` için ayrı ayrı üretim yapılır
- her alan kendi ayrı prompt mantığıyla çalışır
- üretim sonucu ilgili alana doğrudan yazılır
- kullanıcı isterse son durumda `Kaydet` diyerek bu çıktıları ürüne bağlı Etsy taslağı olarak kalıcı hale getirir

Bu iterasyonda amaç gerçek Etsy yayınlama/publish değildir. Ama hazırlık deneyimi, sonraki iterasyonda publish adımı eklenecek kadar net ve genişletilebilir kurulmalıdır.

---

## 2. Onaylanan ürün kararları

- Bu iterasyonun kapsamı **yalnızca Etsy hazırlık ekranıdır**; gerçek Etsy mağazasına gönderim yoktur.
- Ürün detay route'u korunur: `/products/:productId`.
- Üst aksiyonda kullanıcı diliyle uyumlu ana buton **`Etsy'e Yükle`** olur.
- Kullanıcı butona bastığında aynı sayfa içinde `Hazırlık` moduna geçer; ayrı bir wizard route açılmaz.
- Kullanıcıya içeride bunun hazırlık alanı olduğu net gösterilir; yani dış aksiyon dili ile iç mod etiketi birlikte kullanılır.
- Sayfa açıldığında **genel analiz otomatik** başlar.
- Genel analiz sırasında kullanıcı canlı adım akışını görür; bu görünüm **ham model iç muhakemesi değil**, kullanıcıya gösterilen yapılandırılmış çalışma adımlarıdır.
- Üretim satırları üç alanla sınırlıdır:
  - `Title`
  - `Description`
  - `Tags`
- Her satırın kendi **ayrı promptu** ve kendi `Üret` butonu vardır.
- Genel analiz dili **Türkçe**, üretilen Etsy içeriği **İngilizce** olacaktır.
- Okunur analiz blokları da yer alacaktır:
  - `SEO Notları`
  - `Etsy Uyum Kontrolleri`
  - `Eksik Veri / Riskler`
- Canlı araştırma girdi seti şunlardan oluşur:
  - sistemde kayıtlı ürün verisi
  - kayıtlı uygulama/prompt ayarları
  - resmi Etsy kural ve rehber sinyalleri
  - Etsy içindeki canlı listing/search sinyalleri
- Canlı araştırma Etsy odaklı olacaktır; genel web taraması ilk iterasyonda yoktur.
- Sayfa açılışında **genel araştırma ve analiz** çalışır.
- Her alanın `Üret` aksiyonunda o alan için ayrıca **hedefli canlı araştırma** tekrar yapılır.
- `Üret` sonucu ilgili alana doğrudan yazılır.
- `Üret` sonucu **otomatik kaydedilmez**.
- Kullanıcı `Kaydet` dediğinde o anda ekranda bulunan üretilmiş ve/veya düzenlenmiş alanlar ürüne bağlı Etsy taslağı olarak kalıcı yazılır.
- Kaydedilmemiş değişiklik varsa kullanıcı sayfadan ayrılırken uyarılır.

---

## 3. Dış kural girdileri

Hazırlık ekranındaki analiz ve üretim mantığı yalnızca iç varsayımlara dayanmayacaktır. Resmi Etsy kural ve rehber girdileri tasarımın bir parçasıdır.

Bu iterasyonda özellikle şu resmi kaynak yaklaşımı baz alınacaktır:

- Etsy Seller Handbook içindeki güncel listing rehberleri
- Etsy Help Center içindeki listing/policy destek içerikleri
- Etsy listing arama ve mağaza içi sinyaller

Bu tasarıma yön veren somut örneklerden biri Etsy Seller Handbook'taki 26 Ağustos 2025 tarihli “[The Anatomy of a Well-Crafted Etsy Listing](https://www.etsy.com/pt/seller-handbook/article/1347574487014)” yazısıdır. Bu kaynakta özellikle şu sinyaller bizim için önemlidir:

- başlığın ilk kelimelerinin kritik olması
- başlığın kısa ve taranabilir tutulması
- 15 kelimenin altında kalmayı hedefleme önerisi
- açıklamanın ilk cümlelerinde ilgili anahtar kelimeleri kullanma
- 13 tag kullanma beklentisi
- attribute/tag tekrarını azaltma mantığı

Bu kurallar uygulamada sabit bir “tek prompt metni” olarak değil, analiz ve üretim orkestrasyonunda kullanılacak dış kural seti olarak ele alınacaktır.

---

## 4. Seçilen yaklaşım

Üç aday yaklaşım içinden seçilen çözüm şudur:

- mevcut ürün detay route'u korunur
- ürün detay sayfasına özel yeni bir `EtsyPrepWorkspace` modülü eklenir
- mevcut `etsy_drafts` kalıcı taslak katmanı olarak korunur
- mevcut connector ve profil altyapısı yeniden kullanılır
- ama kullanıcı deneyimi ve AI orkestrasyonu, mevcut `SeoEditorPage`'den bağımsız yeni bir çalışma alanı olarak kurgulanır

Bu yaklaşımın seçilme nedenleri:

- kullanıcının tarif ettiği “aynı kartta farklı sayfa” deneyimine en yakın yapı budur
- ürün detay ekranından kopmadan çalışır
- mevcut draft ve connector altyapısını çöpe atmaz
- canlı analiz, alan bazlı üretim ve ileride publish ekleme işini temiz sınırlarla taşır

Seçilmeyen yaklaşımlar:

- mevcut `SeoEditorPage`'i olduğu gibi ürün detayına gömmek: bugünkü ihtiyaç için fazla dar ve yeniden şekillendirme maliyeti yüksek
- ayrı wizard route açmak: istenen aynı sayfa hissini zayıflatır

---

## 5. Sayfa mimarisi

### 5.1 Route ve mod davranışı

`/products/:productId` route'u korunur.

Bu sayfa iki modda çalışır:

- `Genel Bakış`
- `Hazırlık`

Varsayılan mod `Genel Bakış`tır. Kullanıcı üstteki `Etsy'e Yükle` aksiyonuna bastığında sayfa `Hazırlık` moduna geçer. Bu geçişte kullanıcı aynı ürün sayfasında kalır; üst ürün özeti görünmeye devam eder, alt bölüm ise Etsy hazırlık çalışma alanına dönüşür.

### 5.2 Üst alan

Ürün üst özeti korunur:

- görseller
- başlık
- marka/kategori
- Trendyol linki
- durum rozetleri
- fiyat özet kutuları

Bu bölüm kullanıcıya hazırlık sırasında hâlâ hangi ürün üzerinde çalıştığını güçlü biçimde hatırlatır.

### 5.3 Yeni çalışma alanı modülü

`EtsyPrepWorkspace` aşağıdaki alt parçalara ayrılır:

1. `PrepModeHeader`
2. `LiveAnalysisPanel`
3. `GenerationRows`
4. `ReadOnlyInsightBlocks`

### 5.4 `PrepModeHeader`

Bu bölümde şunlar bulunur:

- `Hazırlık` mod etiketi
- `Genel Bakışa Dön` aksiyonu
- taslak durumu (`Kaydedilmedi`, `Kaydediliyor`, `Kaydedildi` gibi)
- ana `Kaydet` butonu

İç dil burada hazırlık odaklı olur; yani dışarıda `Etsy'e Yükle`, içeride `Hazırlık` ifadesi birlikte yaşar.

### 5.5 `LiveAnalysisPanel`

Bu panel sayfa açılışında otomatik çalışan genel analizin görünür yüzüdür.

Kullanıcı burada ham model düşünce zinciri görmez. Bunun yerine sistem şu tür yapılandırılmış adımları canlı olarak gösterir:

- `Kaynak ürün verisi okunuyor`
- `Etsy kural sinyalleri toplanıyor`
- `Etsy listing/search sinyalleri analiz ediliyor`
- `Keyword odakları çıkarılıyor`
- `Riskler ve eksik alanlar derleniyor`
- `Hazırlık özeti oluşturuluyor`

Bu panel “AI düşünüyor” hissini verir ama güvenli ve açıklanabilir olay seviyesinde kalır.

### 5.6 `GenerationRows`

Üç üretim satırı bulunur:

- `Title`
- `Description`
- `Tags`

Her satırın kendine ait:

- mevcut alan değeri
- `Üret` aksiyonu
- bağımsız loading durumu
- bağımsız hata durumu
- en son üretimden gelen yardımcı özet bilgisi

Alanlar birbirinden bağımsız çalışır. `Tags` üretimindeki hata `Title` ya da `Description` üretimini kilitlemez.

### 5.7 `ReadOnlyInsightBlocks`

Bu bölümde üç okunur kutu yer alır:

- `SEO Notları`
- `Etsy Uyum Kontrolleri`
- `Eksik Veri / Riskler`

Bu bloklar genel analiz ve alan bazlı üretimlerden beslenir. Kullanıcının neden o önerilerin verildiğini anlamasını sağlar.

---

## 6. Veri akışı ve AI orkestrasyonu

### 6.1 Girdi seti

Hazırlık ekranının temel girdi kaynakları şunlardır:

- ürünün kayıtlı güncel başlığı
- ürün açıklaması
- görseller
- marka
- kategori
- attribute verileri
- varyasyon verileri
- fiyat/stok bağlamı
- varsa önceden kaydedilmiş Etsy taslağı
- uygulama ayarları ve prompt tercihleri
- aktif connector profili

### 6.2 Sayfa açılışındaki genel analiz

Kullanıcı `Hazırlık` moduna geçtiğinde genel analiz otomatik başlar.

Bu analiz şu sorulara cevap üretir:

- ürünün Etsy listing açısından öne çıkan özellikleri neler
- title tarafında hangi özellikler öne alınmalı
- description tarafında hangi bilgi eksik veya belirsiz
- tag tarafında hangi keyword aileleri mantıklı
- Etsy kural/uyum açısından hangi riskler var
- mevcut ürün verisinde hangi boşluklar üretim kalitesini düşürüyor

Genel analiz sonucu yapılandırılmış veri olarak döner. UI bunu canlı adımlar ve okunur özet blokları olarak gösterir.

### 6.3 Alan bazlı hedefli üretim

Her `Üret` aksiyonu kendi alanına özel ikinci bir çalışma başlatır.

Bu aşama sayfa açılışındaki genel analizi körü körüne tekrar kullanmaz; ilgili alan için hedefli canlı araştırmayı yeniden çalıştırır.

Alan bazlı davranış:

- `Title`
  - baştaki kelimeleri güçlendirme
  - okunabilirlik ve taranabilirlik
  - gereksiz tekrarları azaltma
  - ayırt edici özellikleri öne alma
- `Description`
  - ilk cümlelerde ilgili keyword yerleştirme
  - ürünün malzeme/ölçü/kullanım bilgisini netleştirme
  - marka sesi ve ikna edici açıklama dengesi
  - okunabilir paragraf/bullet yapısı
- `Tags`
  - 13 tag hedefi
  - çok kelimeli doğal ifadeler
  - attribute tekrarını azaltma
  - farklı arama niyetlerini kapsama

### 6.4 Canlı adım akışı

Genel analiz ve alan bazlı üretimlerde canlı akış, yapısal olaylar üzerinden gösterilir. İlk iterasyonda token token model çıktısı akıtılmayacaktır.

Olay türleri şunlardır:

- `step_started`
- `step_completed`
- `research_summary`
- `result_ready`
- `error`

Bu akış UI'da “canlı düşünme” olarak sunulur.

### 6.5 Üretim sonucu davranışı

Bir alanın `Üret` aksiyonu tamamlandığında sonuç doğrudan ilgili edit alanına yazılır.

Ancak bu hâlâ çalışma kopyasıdır:

- veritabanına otomatik yazılmaz
- kullanıcı başka alanları da üretebilir
- kullanıcı isterse elle düzenleyebilir
- kalıcılık yalnızca `Kaydet` aksiyonunda oluşur

---

## 7. Kalıcı veri modeli

### 7.1 Mevcut `etsy_drafts` tablosunun yeniden kullanımı

İlk iterasyonda yeni draft tablosu açılmayacaktır. Mevcut `etsy_drafts` kaydı ürün başına tek taslak kaydı olarak kullanılmaya devam eder.

Bu seçim şu nedenlerle uygundur:

- ürün başına tek hazırlık taslağı ihtiyacını zaten karşılıyor
- mevcut web/API altyapısıyla uyumlu
- publish öncesi hazırlık aşaması için yeterli

### 7.2 Alan eşlemesi

Hazırlık ekranındaki alanların tabloya eşlemesi şöyle olacaktır:

- `Title` -> `etsy_drafts.english_title`
- `Description` -> `etsy_drafts.long_description`
- `Tags` -> `etsy_drafts.tags_json`
- `SEO Notları` -> `etsy_drafts.seo_notes`
- `Etsy Uyum Kontrolleri` + `Eksik Veri / Riskler` -> `etsy_drafts.policy_notes`

Not:

- Bu iterasyonda `Description` tek bir ana Etsy açıklaması alanıdır.
- Mevcut `short_description` alanı bu ekranın ana yüzeyine taşınmaz.
- `short_description` bu spec kapsamı dışındadır.

### 7.3 Kaydetme davranışı

`Kaydet` aksiyonu o an ekrandaki çalışma durumunu tek seferde kalıcılaştırır.

Kaydedilen şeyler:

- title alanının son değeri
- description alanının son değeri
- tags alanının son değeri
- seo notları
- uyum/risk notları

Bu davranış sayesinde kullanıcı:

- yalnızca title üretip kaydedebilir
- title + tags üretip kaydedebilir
- üretilen sonucu elle değiştirip sonra kaydedebilir
- sayfaya daha sonra geri döndüğünde kayıtlı Etsy taslağını ürün içinde yeniden görebilir

### 7.4 Versiyon ve metadata kuralı

Hazırlık ekranı için save davranışı mevcut drafts mantığını yeniden kullanır fakat bu özellik için daha net metadata taşır.

Save akışı aşağıdaki kuralları uygular:

- bu oturumda en az bir AI üretimi kaydediliyorsa `last_generated_at` güncellenir
- bu oturumda en az bir AI üretimi kaydediliyorsa `generated_version` ilerler
- bu oturumda hiç AI üretimi kaydedilmiyorsa `generated_version` ve `last_generated_at` değişmez
- kullanıcı üretim sonrası elle düzenleme yaptıysa `edited_version` ilerler
- kaydedilen durumda en az bir alan kullanıcı tarafından değiştirilmişse `manual_edits_present` `true` olur
- hiç manuel düzenleme yoksa `manual_edits_present` `false` kalır

Bu metadata davranışı önemlidir; çünkü hazırlık ekranı “üretildi ama henüz kaydedilmedi” ile “kaydedilmiş draft” ayrımını net tutmalıdır.

---

## 8. API tasarımı

### 8.1 Başlangıç verisi

Yeni bir hazırlık başlangıç endpointi gerekir:

- `GET /products/:productId/etsy-prep`

Bu endpoint şunları döner:

- ürün detay özeti
- varsa kayıtlı Etsy draft
- aktif connector durumu
- hazırlık ekranı için gerekli başlangıç metadata'sı

Amaç, ürün detay sayfasının hazırlık moduna geçerken tek sorguda güvenilir başlangıç durumu alabilmesidir.

### 8.2 Genel analiz endpointi

- `POST /products/:productId/etsy-prep/analyze`

Bu endpoint yapılandırılmış canlı olay akışı üretir. Dönen akış, UI'ın canlı analiz panelini besler.

Amaç:

- ürün + Etsy kural sinyalleri + Etsy listing/search sinyalleri üzerinden genel analiz üretmek
- okunur analiz bloklarını hazırlamak
- alan bazlı üretim öncesinde ortak araştırma zemini kurmak

### 8.3 Alan bazlı üretim endpointleri

- `POST /products/:productId/etsy-prep/generate-title`
- `POST /products/:productId/etsy-prep/generate-description`
- `POST /products/:productId/etsy-prep/generate-tags`

Bu endpointler:

- ilgili alan için hedefli Etsy canlı araştırmasını tekrar çalıştırır
- ayrı prompt ile connector üretimini yapar
- canlı adım akışı döner
- sonunda üretilen sonucu ve kısa araştırma özetini döner

Bu endpointler **kalıcı save yapmaz**.

### 8.4 Save endpointi

Hazırlık ekranı için ayrı bir save endpointi önerilir:

- `PUT /products/:productId/etsy-prep/save`

Bu endpoint mevcut `etsy_drafts` kaydına yazar ama hazırlık ekranının ihtiyaç duyduğu metadata'yı da birlikte işler.

İstek yükü aşağıdaki bilgileri kapsamalıdır:

- title son değeri
- description son değeri
- tags son değeri
- seo notları
- uyum/risk notları
- hangi alanların bu oturumda AI ile üretildiği
- hangi alanların üretim sonrası kullanıcı tarafından düzenlendiği

Bu ayrı endpoint seçiminin nedeni, mevcut `PATCH /drafts/:productId` sözleşmesini hazırlık ekranının karma metadata ihtiyacıyla gereksiz yere aşırı yüklememektir.

---

## 9. Prompt ve araştırma sınırları

### 9.1 Ayrı prompt prensibi

Tek bir dev prompt yerine dört ayrı prompt akışı olacaktır:

- genel analiz promptu
- title üretim promptu
- description üretim promptu
- tags üretim promptu

Bu ayrım şu nedenlerle gereklidir:

- her alanın başarı ölçütü farklıdır
- aynı araştırma verisi her alanda farklı yorumlanmalıdır
- başarısız bir alan diğerlerini bozmamalıdır
- ileride prompt tuning daha güvenli yapılır

### 9.2 Araştırma sınırı

İlk iterasyonda canlı araştırma yalnızca Etsy odaklı olacaktır:

- resmi Etsy seller/help içerikleri
- Etsy listing/search sinyalleri

Genel web, blog, forum veya başka marketplace verisi kullanılmayacaktır.

### 9.3 Yapılandırılmış çıktı beklentisi

Promptlar serbest paragraflar yerine yapılandırılmış sonuç döndürmeye zorlanmalıdır.

Örnek ihtiyaçlar:

- title üretimi: tek nihai title + kısa neden özeti
- description üretimi: tek nihai description + dikkat notları
- tags üretimi: tam tag listesi + kullanılmayan keyword/risk özeti

Bu yapı, UI tarafında tutarlı alan doldurma ve hata yakalama için kritiktir.

---

## 10. Hata yönetimi

### 10.1 Genel analiz hatası

Genel analiz başarısız olduğunda:

- tüm hazırlık ekranı çökmez
- `LiveAnalysisPanel` hata durumu gösterir
- kullanıcıya `Tekrar Dene` aksiyonu sunulur
- kayıtlı draft varsa düzenleme alanları yine gösterilebilir

### 10.2 Alan bazlı üretim hatası

Her üretim satırı kendi hata durumunu taşır:

- `Title` hatası `Description` ve `Tags` alanlarını kilitlemez
- `Tags` hatası genel analizi silmez
- her satır bağımsız yeniden denenebilir

### 10.3 Connector ve profil hataları

Aktif connector profili yoksa ya da connector çevrimdışıysa:

- hazırlık ekranı bunu üst seviyede net gösterir
- üretim aksiyonları devre dışı kalır
- kullanıcıya `AI Bağlantıları` sayfasına giden açık bir CTA gösterilir

### 10.4 Araştırma zaman aşımı

Canlı araştırma yavaşlarsa:

- olay akışı üzerinden kullanıcıya hangi adımda beklendiği gösterilir
- belirli süre sonunda kontrollü timeout hatası döner
- UI sonsuz spinner'da kalmaz

---

## 11. Uygulama sınırları

Bu çalışma aşağıdakileri kapsamaz:

- gerçek Etsy publish / listing oluşturma
- Etsy shop auth veya token yönetimi
- Etsy görsel yükleme akışı
- materials/attributes/who-made gibi ek listing alanlarının düzenlenmesi
- kısa açıklama/uzun açıklama için çift editör
- çoklu taslak versiyon geçmişi
- otomatik arka plan üretim veya sessiz autosave

Bu sınırlar özellikle korunmalıdır; aksi halde iş publish platformuna dönüşerek tek spec kapsamını aşar.

---

## 12. Test stratejisi

### 12.1 API / entegrasyon testleri

Testler aşağıdakileri doğrulamalıdır:

- hazırlık başlangıç endpointi ürün + draft + connector durumunu doğru döner
- genel analiz endpointi olay akışını beklenen sırayla üretir
- title/description/tags üretim endpointleri alan bazlı doğru yapı döner
- Etsy odaklı araştırma sınırı korunur
- save endpointi doğru alanları `etsy_drafts` tablosuna yazar
- `Description` alanı `long_description` ile eşleşir

### 12.2 Web bileşen testleri

Testler aşağıdakileri doğrulamalıdır:

- ürün detayında `Etsy'e Yükle` aksiyonu görünür
- tıklanınca aynı sayfada `Hazırlık` modu açılır
- canlı analiz paneli adım akışı gösterir
- `Title`, `Description`, `Tags` satırları bağımsız loading/hata taşır
- üretim sonucu doğrudan ilgili alana yazılır
- `Kaydet` öncesi sayfadan çıkışta uyarı görünür
- kayıt sonrası aynı ürüne dönüldüğünde taslak alanları korunur

### 12.3 Connector sözleşme testleri

Şunlar doğrulanmalıdır:

- her alan için ayrı prompt kontratı kullanılır
- yapısal cevap parse edilebilir
- eksik veya bozuk cevap güvenli biçimde hata verir
- connector çevrimdışı senaryosu kullanıcıya net yansır

---

## 13. Planlamaya hazır uygulama başlıkları

Bu tasarım şu iş paketlerine ayrılır:

1. ürün detay sayfasında `Hazırlık` mod mimarisi
2. hazırlık başlangıç verisi ve connector durumu endpointi
3. genel analiz için canlı olay akışı
4. title/description/tags için ayrı üretim hatları
5. çalışma alanı state yönetimi ve kaydedilmemiş değişiklik koruması
6. kalıcı draft save endpointi ve repo metadata güncellemesi
7. UI testleri ve connector sözleşme testleri

Bu kapsam tek bir plan dokümanında ele alınabilecek kadar odaklıdır. Publish, Etsy auth ve tam listing yaşam döngüsü bu specin dışında bırakılmıştır.
