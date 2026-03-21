# Tracking Kartı Görseli ve Detay Galerisi Tasarımı

**Tarih:** 2026-03-21  
**Durum:** Tasarım onaylandı, planlama öncesi kullanıcı review bekleniyor  
**Kapsam:** Takip merkezindeki ürün kartlarına küçük resim eklenmesi ve ürün detay ekranında galeri gösterimi

---

## 1. Amaç

Bu değişikliğin amacı, takip edilen ürünlerin ana sayfada yalnızca metin ve fiyat/stok kutularıyla görünmesi yerine görsel olarak da ayırt edilebilir hale gelmesidir. Kullanıcı, kart üzerinde ürünün ilk ana görselini küçük resim olarak görmeli; küçük resim veya başlığa tıkladığında ürün detay ekranına geçebilmelidir. Ürün detay ekranında ise ilk görsel büyük önizleme olarak, diğer görseller de küçük galeri biçiminde gösterilmelidir.

---

## 2. Onaylanan ürün kararları

- Ana sayfa kartında kullanılacak görsel, çekilen ürünün **ilk ana görseli** olacaktır.
- Ana sayfada **yalnızca küçük resim ve başlık** tıklanabilir olacaktır.
- Kartın fiyat/stok alanları tıklanabilir olmayacaktır.
- Detay sayfasında ilk görsel **büyük önizleme** olarak gösterilecektir.
- Varsa diğer görseller **küçük galeri** olarak gösterilecektir.
- Hiç görsel yoksa hem kartta hem detayda düzeni bozmayan bir placeholder gösterilecektir.

---

## 3. Mevcut durum

Mevcut kod tabanında görsel verisi için temel altyapı zaten vardır:

- Scraper katmanı ürün için `images` dizisi üretmektedir.
- `products` kaydında `images_raw` alanı tutulmaktadır.
- Ürün detay görünümü `product.images` alanını dönebilmektedir.
- Tracking list görünümü ise bugün kartlar için yalnızca metinsel özet alanları döndürmektedir.

Bu nedenle ihtiyaç, yeni bir scraping modeli kurmaktan çok, mevcut görsel verisini liste görünümüne kontrollü biçimde taşımak ve web arayüzünde uygun sunumu eklemektir.

---

## 4. Seçilen yaklaşım

Üç aday yaklaşım içinden şu yaklaşım seçilmiştir:

- Tracking list API, kart kullanımı için açık bir `thumbnailImage` alanı dönecektir.
- Product detail API, tam galeri için mevcut `product.images` alanını kullanmaya devam edecektir.

Bu seçimle liste ekranı yalnızca ihtiyacı olan tek küçük resmi alır; detay ekranı ise tüm görselleri kullanır. Böylece liste ve detayın sorumlulukları ayrılır, veri niyeti daha açık hale gelir, ileride fallback veya görsel seçme kurallarını değiştirmek daha güvenli olur.

---

## 5. Veri ve API tasarımı

### 5.1 Veri kaynağı

Görsel kaynağı mevcut scraper çıktısı olacaktır:

- `parseTrendyolProduct` ürün için `images: string[]` üretir.
- Bu dizi `products.images_raw` içinde saklanmaya devam eder.

Yeni veritabanı tablosu veya migration hedeflenmemektedir.

### 5.2 Tracking list yanıtı

Tracking list öğesine aşağıdaki yeni alan eklenecektir:

- `thumbnailImage: string | null`

Kurallar:

- `images_raw` parse edilirse ve ilk eleman geçerli bir URL ise bu değer kullanılır.
- Dizi boşsa veya parse edilemiyorsa `null` döner.

Bu alan kart görünümü için türetilmiş alan olarak değerlendirilir; detay galerisi için kaynak alan olmayacaktır.

### 5.3 Product detail yanıtı

Product detail yanıtında mevcut `product.images: string[] | null` alanı korunacaktır.

Kurallar:

- Dizi sırası scraper’dan geldiği gibi korunur.
- İlk eleman varsayılan büyük önizleme için kullanılır.
- Diğer elemanlar galeri küçük resimleri olarak gösterilir.

---

## 6. Arayüz tasarımı

### 6.1 Tracking kartı

`ProductCard` içinde üst bölüm düzeni güncellenecektir:

- Sol bölümde sabit boyutlu küçük resim alanı bulunacaktır.
- Küçük resmin yanında ürün başlığı ve marka yer alacaktır.
- Küçük resim ayrı link, başlık ayrı link veya ortak erişilebilir link yapısı ile `/products/:productId` hedefine gidecektir.
- Fiyat ve stok kutuları mevcut yerleşimde kalacaktır.

Davranış:

- Sadece küçük resim ve başlık tıklanabilir olacaktır.
- Kartın tamamı tıklanabilir yapılmayacaktır.
- Görsel yüklenemezse placeholder kutusu gösterilecek ve yerleşim sabit kalacaktır.

Erişilebilirlik:

- Görsel `alt` değeri ürün başlığını yansıtacaktır.
- Başlık klavye ile odaklanabilir link olarak kalacaktır.
- Placeholder durumunda anlamsız boş görsel yerine dekoratif/sade sunum tercih edilecektir.

### 6.2 Ürün detay ekranı

`ProductSummary` bölümü galeri destekleyecek şekilde genişletilecektir:

- Üst bölümde büyük bir seçili görsel alanı olacaktır.
- Altında veya yanında küçük galeri görselleri listelenecektir.
- İlk açılışta seçili görsel `product.images[0]` olacaktır.
- Kullanıcı galeri küçük resmine tıkladığında büyük önizleme o görsele dönecektir.
- Görsel yoksa galeri alanı yerine sade placeholder/metin gösterilecektir.

Sayfanın diğer alanları değişmeden kalacaktır:

- fiyat özet kartları
- takip bilgisi
- açıklama
- varyasyon tablosu
- fiyat geçmişi / stok geçmişi

---

## 7. Hata yönetimi ve fallback davranışı

### 7.1 Liste görünümünde

Aşağıdaki durumlar görsel yokmuş gibi ele alınacaktır:

- `images_raw` parse edilememesi
- boş dizi
- ilk görsel URL’inin eksik veya kullanılamaz olması

Bu durumlarda kartta placeholder gösterilir; kartın geri kalanı normal çalışır.

### 7.2 Detay görünümünde

Aşağıdaki durumlar galerisiz görünüm olarak ele alınacaktır:

- `product.images` alanının `null` gelmesi
- boş dizi gelmesi
- seçili görselin yüklenememesi

Bu durumda sayfa hata vermez; sadece görsel alanı fallback görünümüne döner.

---

## 8. Uygulama sınırları

Bu çalışma aşağıdakileri kapsamaz:

- görsel indirme / yerel cache altyapısı
- farklı çözünürlükte görsel türetme
- kullanıcıya hangi görselin öne çıkarılacağını seçtirme
- lightbox, zoom veya tam ekran galeri
- kartta çoklu görsel carousel

Bu özellikler gerektiğinde sonraki iterasyonda ayrıca ele alınabilir.

---

## 9. Test stratejisi

### 9.1 API / entegrasyon

Liste ve detay görünümü testleri aşağıdakileri doğrulamalıdır:

- tracking list öğesi `thumbnailImage` döner
- ürün detay yanıtı mevcut `product.images` galerisini korur
- görsel yoksa API `null` veya boş galeriyle güvenli davranır

### 9.2 Web bileşen testleri

Bileşen ve sayfa testleri aşağıdakileri doğrulamalıdır:

- tracking kartında küçük resim ve başlık görünür
- yalnızca küçük resim ve başlık detay sayfasına yönlenir
- detay sayfası ilk görseli büyük önizleme olarak açar
- küçük galeri görseline tıklanınca büyük önizleme değişir
- görsel yoksa placeholder görünür

### 9.3 E2E

Ana akış doğrulaması:

1. kullanıcı ürünü ekler
2. tracking kartında küçük resmi görür
3. başlık veya küçük resme tıklayıp detay ekranına gider
4. detay ekranında büyük görsel ve küçük galeri görür
5. galeri seçimi büyük önizlemeyi değiştirir

---

## 10. Planlamaya hazır uygulama başlıkları

Bu tasarımın uygulanması muhtemelen şu iş paketlerine ayrılacaktır:

1. liste görünümü sözleşmesi ve repo türetme alanı (`thumbnailImage`)
2. frontend tracking kartı görsel ve link davranışı
3. detay ekranı galeri durumu ve seçim mantığı
4. testlerin güncellenmesi

Bu kapsam, tek bir plan dokümanında ele alınabilecek kadar küçüktür ve mevcut mimariyle uyumludur.
