# Kaynak Ürünler Manuel Etsy Eşleştirme Tasarımı

**Tarih:** 2026-04-01  
**Durum:** Tasarım onaylandı, planlama öncesi kullanıcı review bekleniyor  
**Kapsam:** `apps/api`, `apps/web`, `packages/shared`

---

## 1. Amaç

Bu değişikliğin amacı, Trendyol takip akışından ayrı çalışan yeni bir "Kaynak Ürünler" bölümü oluşturmaktır. Bu bölümde kullanıcı Shopier, kişisel site veya benzeri kaynaklardan bulduğu ürünleri manuel olarak kaydedebilmeli; kayıtları bulutta kalıcı biçimde saklayabilmeli; ürün içine kişisel not ekleyebilmeli; aynı kayda bir veya birden fazla Etsy ilan linki bağlayabilmeli; ayrıca Etsy linki ile arama yaparak ilgili kaynak ürünü tekrar bulabilmelidir.

Bu tasarımın ana hedefi, "ürünü kaybetmeme" ve "kaynak ürün ile Etsy ilanı arasında net eşleştirme" ihtiyacını, mevcut Trendyol scraping ve takip sistemiyle karıştırmadan çözmektir.

---

## 2. Onaylanan ürün kararları

- Yeni özellik, mevcut Trendyol ürün listesinden **ayrı bir bölüm ve ayrı sayfa** olarak sunulacaktır.
- İlk sürümde kaynak ürünler **manuel kayıt** ile oluşturulacaktır; otomatik scraping yapılmayacaktır.
- Kaynak ürün oluştururken aşağıdaki alanlar kullanılacaktır:
  - `kaynak başlık` zorunlu
  - `kaynak link` zorunlu
  - `kaynak platformu` zorunlu
  - `kişisel not` opsiyonel
- Kaynak platformu ilk sürümde kontrollü seçenek olarak ele alınacaktır:
  - `SHOPIER`
  - `CUSTOM_SITE`
  - `OTHER`
- Etsy eşleştirmesi ilk sürümde **manuel** olacaktır; kullanıcı Etsy ilanı oluştuktan sonra linki kendisi ekleyecektir.
- Bir kaynak ürüne **birden fazla Etsy linki** bağlanabilecektir.
- Kullanıcı, kaynak ürünü aşağıdaki bilgilerle arayabilecektir:
  - kaynak başlık
  - kaynak link
  - not
  - Etsy linki
- Aynı owner altında:
  - aynı kaynak linki ikinci kez açılamaz
  - aynı Etsy linki iki farklı kaynak ürüne bağlanamaz
- Özellik, mevcut bulut kalıcılığı yaklaşımına uygun olarak merkezi D1 üzerinde yaşayacaktır; cihaz değiştiğinde veri kaybolmamalıdır.

---

## 3. Mevcut durum ve problem

Mevcut projede takip merkezi tamamen Trendyol odaklıdır:

- ürün ekleme akışı `trendyolUrl` ile çalışır
- ürün oluşturma sırasında sayfa çekilip parse edilir
- `products` tablosu ve ilişkili veri yapısı Trendyol ürün snapshot mantığına göre şekillenmiştir
- web tarafındaki liste ve detay sayfaları Trendyol takip yaşam döngüsüne bağlıdır

Bu yapı, kullanıcıya "kaynak ürün arşivi" ihtiyacı için doğrudan uygun değildir. Shopier veya kişisel site gibi kaynaklardan ürün bulunup Etsy'ye yüklendiğinde, mevcut sistem içinde yalnızca Trendyol uyumlu kayıt mantığı bulunduğu için şu sorun ortaya çıkar:

- ürün Trendyol dışıysa mevcut takip akışına doğal olarak sığmaz
- manuel not ve Etsy link eşleştirmesi için net bir alan yoktur
- aynı Etsy ilanını hangi kaynak ürün için açtığını sonradan hızlıca bulmak zorlaşır

Dolayısıyla ihtiyaç, mevcut Trendyol ürün modelini gevşetmek değil; ondan ayrı, daha yalın bir "manuel kaynak ürün arşivi" oluşturmaktır.

---

## 4. Değerlendirilen yaklaşımlar

### Yaklaşım A - Mevcut `products` yapısını genişletmek

Mevcut ürün tablosuna yeni bir ürün tipi eklenir; Trendyol ve manuel kaynak ürünler aynı veri modeli içinde tutulur.

**Artıları**

- ilk bakışta daha az yeni tablo gerekir
- bazı mevcut listeleme bileşenleri tekrar kullanılabilir

**Eksileri**

- Trendyol scraping odaklı alanlarla manuel kayıt davranışı birbirine karışır
- kod içinde sürekli "bu ürün Trendyol mu manuel mi" ayrımı gerekir
- ileride bakım ve test yükü artar

### Yaklaşım B - Ayrı kaynak ürünler modülü (**seçilen**)

Kaynak ürünler için ayrı tablo, ayrı API route'ları ve ayrı web sayfaları oluşturulur.

**Artıları**

- ürün sınırları nettir; Trendyol takibi bozulmaz
- kullanıcının istediği "ayrı sayfa / ayrı başlık" beklentisini doğrudan karşılar
- Etsy eşleştirme ve arama mantığı temiz kalır
- ileride Shopier özel alanları veya ek aksiyonlar eklemek daha kolaydır

**Eksileri**

- yeni veri modeli ve route ailesi gerekir
- ilk kurulum mevcut yapıya göre biraz daha fazla dosya değişikliği gerektirir

### Yaklaşım C - Çok hafif not defteri modeli

Tek tabloda başlık, link, not ve toplu Etsy linki alanı tutulur; detay model minimum seviyede bırakılır.

**Artıları**

- en hızlı ilk teslimat olabilir

**Eksileri**

- birden fazla Etsy linkini güvenli yönetmek zordur
- arama ve benzersizlik kuralları zayıf kalır
- ileride genişletme maliyeti yükselir

Seçilen yaklaşım: **Yaklaşım B**.

---

## 5. Hedef mimari

### 5.1 Modül sınırı

Yeni özellik, mevcut Trendyol takip modülünden ayrı bir bounded context gibi ele alınacaktır:

- web tarafında ayrı feature klasörü
- owner-scoped ayrı route'lar
- API tarafında ayrı kaynak ürün route ailesi
- veritabanında ayrı tablo ailesi

Bu modül, Trendyol ürün kartları, refresh akışları, scraping ve varyant takibi ile ortak yaşam döngüsü paylaşmayacaktır.

### 5.2 Ana bileşenler

- **Source products list page:** yeni kaynak ürün ekleme, arama ve kayıtların listelenmesi
- **Source product detail page:** başlık, link, platform, not ve Etsy link yönetimi
- **API source products router:** listeleme, oluşturma, güncelleme, Etsy link ekleme/silme
- **D1 source product tables:** kalıcı kayıt ve Etsy link eşleştirme katmanı

### 5.3 Owner davranışı

Mevcut owner yaklaşımı korunacaktır:

- her kaynak ürün bir `ownerKey` ile saklanır
- liste ve detay route'ları owner scoped çalışır
- benzersizlik kuralları owner sınırı içinde uygulanır

Bu sayede sistem mevcut proje yapısıyla uyumlu kalır.

---

## 6. Veri modeli tasarımı

### 6.1 Ana tablo: `source_products`

Yeni manuel kaynak ürün kaydı bu tabloda tutulacaktır.

Önerilen alanlar:

- `id`
- `owner_key`
- `source_title`
- `source_url`
- `source_url_normalized`
- `source_platform`
- `note`
- `created_at`
- `updated_at`

Kurallar:

- `source_title`, `source_url`, `source_platform` zorunludur
- `note` boş olabilir
- `source_url_normalized`, arama ve duplicate kontrolü için kullanılacaktır

### 6.2 Alt tablo: `source_product_etsy_links`

Bir kaynak ürüne bağlı Etsy linkleri bu tabloda tutulacaktır.

Önerilen alanlar:

- `id`
- `source_product_id`
- `owner_key`
- `etsy_url`
- `etsy_url_normalized`
- `etsy_listing_id`
- `created_at`

Kurallar:

- her satır tek bir Etsy linkini temsil eder
- aynı ürün için birden fazla kayıt olabilir
- her Etsy linki normalize edilerek saklanır
- mümkünse linkten `etsy_listing_id` çıkarılır; çıkarılamazsa `null` kalabilir

### 6.3 Benzersizlik kuralları

İlk sürüm için iki temel duplicate koruması uygulanacaktır:

1. Aynı owner altında `source_url_normalized` benzersiz olacaktır.
2. Aynı owner altında `etsy_url_normalized` benzersiz olacaktır.

Bu kurallar, "aynı kaynak ürünün iki kez açılması" ve "aynı Etsy ilanının iki farklı kayda bağlanması" problemlerini önler.

### 6.4 Silme davranışı

İlk sürümde Trendyol tarafındaki çöp kutusu benzeri ayrı bir akış kapsam içine alınmayacaktır. Kaynak ürünler için başlangıç teslimatı şu davranışı hedefler:

- kayıt yaşam döngüsü sade tutulur
- esas odak oluşturma, güncelleme ve eşleştirme olur

Silme ihtiyacı sonraki iterasyonda ayrıca tasarlanabilir. Bu nedenle ilk sürümde zorunlu olmayan soft-delete altyapısı eklenmeyecektir.

---

## 7. URL normalizasyonu ve eşleştirme kuralları

### 7.1 Kaynak link normalizasyonu

Kaynak ürün oluştururken veya güncellerken link normalize edilir:

- baş/son boşluklar temizlenir
- URL parse edilerek kanonik forma çevrilir
- duplicate kontrolü normalize edilmiş değer üzerinden yapılır

İlk sürümde agresif domain bazlı özel kurallar yerine güvenli ve sade URL normalizasyonu tercih edilir.

### 7.2 Etsy link normalizasyonu

Etsy linki eklenirken:

- URL parse edilir
- gereksiz query parametreleri mümkün olduğunca elenir
- mümkünse listing id URL'den çıkarılır
- saklama ve duplicate kontrolü normalize edilmiş Etsy URL üzerinden yapılır

Amaç, aynı ilanı farklı query parametreleriyle yapıştırıldığında yine tek kayıt olarak ele almaktır.

### 7.3 Arama davranışı

Liste araması aşağıdaki alanlarda çalışacaktır:

- `source_title`
- `source_url`
- `note`
- bağlı `etsy_url`
- varsa `etsy_listing_id`

Bu tasarım sayesinde kullanıcı:

- kaynak başlığı ile
- kaynak sitesi linki ile
- not içindeki ifade ile
- doğrudan Etsy ilan linki ile

aynı kayıt üzerinde arama yapabilir.

---

## 8. API tasarımı

Yeni owner-scoped route ailesi önerilmektedir:

- `GET /owners/:ownerKey/source-products`
- `POST /owners/:ownerKey/source-products`
- `GET /owners/:ownerKey/source-products/:sourceProductId`
- `PATCH /owners/:ownerKey/source-products/:sourceProductId`
- `POST /owners/:ownerKey/source-products/:sourceProductId/etsy-links`
- `DELETE /owners/:ownerKey/source-products/:sourceProductId/etsy-links/:etsyLinkId`

### 8.1 Liste endpoint'i

Liste endpoint'i:

- kaynak ürünleri owner bazında döner
- opsiyonel `search` query parametresi alır
- aramayı hem ana tablo hem Etsy link join'i üzerinde uygular
- kart görünümü için gerekli özet alanları döner

Liste öğesi için beklenen temel alanlar:

- `id`
- `ownerKey`
- `sourceTitle`
- `sourceUrl`
- `sourcePlatform`
- `notePreview`
- `etsyLinkCount`
- `updatedAt`

### 8.2 Oluşturma endpoint'i

Gönderilen payload:

- `sourceTitle`
- `sourceUrl`
- `sourcePlatform`
- `note`

Dönüş:

- oluşturulan kaynak ürün özeti veya detay başlangıç görünümü

Kurallar:

- zorunlu alanlar doğrulanır
- normalize edilmiş kaynak link duplicate kontrolünden geçer
- kayıt başarılı yazılmadan UI başarı göstermemelidir

### 8.3 Detay endpoint'i

Detay görünümü en az şu alanları döner:

- ana kaynak ürün alanları
- tam not alanı
- Etsy linklerinin listesi

Her Etsy link öğesi için:

- `id`
- `etsyUrl`
- `etsyUrlNormalized`
- `etsyListingId`
- `createdAt`

### 8.4 Güncelleme endpoint'i

Detay ekranındaki manuel alan güncellemeleri için `PATCH` endpoint'i kullanılacaktır:

- başlık güncelleme
- kaynak link güncelleme
- platform güncelleme
- not güncelleme

İlk sürümde sade alan güncelleme yaklaşımı yeterlidir; alanların aynı endpoint'te yönetilmesi kabul edilebilir.

### 8.5 Etsy link ekleme / silme endpoint'leri

Etsy link ekleme endpoint'i:

- payload içinde `etsyUrl` alır
- URL'yi normalize eder
- duplicate kontrolü yapar
- başarılıysa yeni Etsy link kaydını döner

Etsy link silme endpoint'i:

- yalnızca ilgili kaynak ürüne bağlı linki kaldırır
- ana kaynak ürünü etkilemez

---

## 9. Web arayüz tasarımı

### 9.1 Navigasyon

Sol menüye owner bazlı yeni bir giriş eklenir:

- mevcut `Ürünler / {owner}`
- yeni `Kaynak Ürünler / {owner}`

Bu sayede kullanıcı Trendyol takip listesi ile manuel kaynak arşivini birbirine karıştırmadan gezebilir.

### 9.2 Liste sayfası

Önerilen route:

- `/owners/:ownerKey/source-products`

Sayfa içeriği:

- üstte başlık ve kısa açıklama
- yeni kaynak ürün ekleme formu
- arama kutusu
- kaynak ürün kart/listesi

Her kartta aşağıdakiler görünür:

- kaynak başlık
- platform etiketi
- kaynak link
- not özeti
- Etsy link sayısı
- son güncelleme zamanı

Liste ekranı, Trendyol takip kartlarının görsel/fiyat/stok odaklı yapısını taklit etmek zorunda değildir; burada amaç arşiv ve eşleştirme yönetimidir.

### 9.3 Yeni kayıt formu

Form alanları:

- kaynak başlık
- kaynak link
- platform seçimi
- kişisel not

Davranış:

- başarı sonrası form temizlenir
- liste invalidate edilip yeniden çekilir
- hata varsa form içeriği korunur

### 9.4 Detay sayfası

Önerilen route:

- `/owners/:ownerKey/source-products/:sourceProductId`

Detay ekranı aşağıdaki bloklardan oluşur:

- kaynak ürün özeti
- düzenlenebilir temel alanlar
- kişisel not alanı
- Etsy linkleri listesi
- yeni Etsy link ekleme formu

Bu sayfanın birincil amacı, "kaynağı unutma" ve "hangi Etsy ilanına dönüştüğünü takip etme" işlemlerini tek yerde toplamak olacaktır.

---

## 10. Hata yönetimi

### 10.1 Yazma hataları

Aşağıdaki durumlarda kullanıcıya açık hata gösterilir:

- zorunlu alan eksik
- geçersiz URL
- kaynak link duplicate
- Etsy link duplicate
- bulut yazım hatası

Sistem sessizce başarı göstermemelidir.

### 10.2 Duplicate hata semantiği

İki farklı duplicate durumu kullanıcıya ayrı anlatılmalıdır:

- "Bu kaynak link zaten kayıtlı."
- "Bu Etsy link zaten başka bir kaynak ürüne bağlı."

Böylece kullanıcı neyin çakıştığını anlayabilir.

### 10.3 Okuma hataları

Liste veya detay yüklenemezse:

- mevcut sayfa düzeni korunur
- görünür hata mesajı gösterilir
- varsa son başarılı veri istemci tarafında React Query davranışı ile görünmeye devam edebilir

---

## 11. Test stratejisi

### 11.1 API / entegrasyon testleri

En az aşağıdaki akışlar doğrulanmalıdır:

- kaynak ürün oluşturma
- duplicate kaynak link engeli
- kaynak ürün detayını getirme
- kaynak ürün güncelleme
- Etsy link ekleme
- duplicate Etsy link engeli
- Etsy link silme
- başlık, not ve Etsy linki üzerinden arama

### 11.2 Web testleri

En az aşağıdaki kullanıcı akışları doğrulanmalıdır:

- yeni kayıt formunun başarıyla gönderilmesi
- liste ekranında arama yapılması
- detay ekranında not güncellenmesi
- Etsy link eklenmesi
- Etsy link silinmesi

### 11.3 Kabul testi

Temel manuel smoke test:

1. Kullanıcı yeni bir Shopier veya kişisel site kaynağı ekler.
2. Kayıt listede görünür.
3. Detay ekranına girip not ekler veya günceller.
4. Etsy'de oluşturduğu ilan linkini aynı kayda ekler.
5. Liste ekranında Etsy linki ile arama yapar.
6. Aynı kaynak ürün kaydını başarıyla bulur.

---

## 12. Kapsam dışı bırakılanlar

Bu ilk iterasyonda aşağıdakiler kapsam dışıdır:

- otomatik Shopier veya kişisel site scraping
- Etsy API entegrasyonu
- Etsy ilanını otomatik oluşturma veya otomatik geri bağlama
- varyant bazlı eşleştirme
- Trendyol takip akışı ile birleşik tek liste
- favori, kategori, refresh veya fiyat/stok takibi
- çöp kutusu / soft delete yaşam döngüsü

Bu sınırlar, ilk teslimatı sade ve net tutmak için bilinçli olarak korunacaktır.

---

## 13. Sonuç

Onaylanan çözüm, mevcut Trendyol ürün takip modülünden ayrı bir "Kaynak Ürünler" modülü kurmaktır. Bu modül, manuel kayıtla çalışan kaynak arşivi olarak hizmet verecek; ürünlerin bulutta kaybolmadan saklanmasını sağlayacak; kaynak ürün ile Etsy ilanı arasında birden fazla link üzerinden eşleştirme kurulmasına izin verecek; ayrıca Etsy linkiyle arama yaparak kaynağın tekrar bulunmasını mümkün kılacaktır.

Bu yaklaşım, mevcut sistemde gereksiz karmaşa yaratmadan kullanıcının gerçek çalışma biçimine uyan ikinci bir ürün akışı ekler: biri Trendyol takip için, diğeri ise dış kaynaklardan toplanan ürünleri Etsy ilanlarıyla ilişkilendiren kalıcı arşiv için.
