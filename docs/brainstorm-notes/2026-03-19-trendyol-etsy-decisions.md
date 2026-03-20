# 2026-03-19 Trendyol -> Etsy dashboard karar notları

## Nihai kararlar
- Ürün kaynağı: Trendyol ürün linkleri
- Kullanım senaryosu: Kullanıcının kendi ürettiği / hak sahibi olduğu ürünleri Trendyol linkleri üzerinden takip edip Etsy için optimize eden iç araç
- Uygulama tipi: internette çalışan sunuculu web uygulaması
- Kullanıcı modeli: tek kullanıcı
- İlk sürüm ölçeği: 50-500 ürün
- Ürün ekleme yöntemi: tek tek link yapıştırma
- Güncelleme sıklığı: 5 saatte bir
- Takip edilecek veriler:
  - ürün temel bilgileri
  - varyasyon bazlı stok durumu
  - güncel fiyat
  - fiyat değişim geçmişi
  - en düşük fiyat
  - en yüksek fiyat
- Fiyat aynıysa gereksiz yeni history kaydı açılmayacak
- Dashboard: güncel durum, değişim geçmişi, stok/fiyat görünümü
- Bildirim: sadece uygulama içi bildirim merkezi
- Etsy entegrasyonu: otomatik listing yok
- Etsy içerik üretimi: manuel tetikleme ile "yeniden üret"
- Dil akışı: Türkçe analiz, İngilizce Etsy çıktısı
- Üretilen alanlar kullanıcı tarafından her zaman düzenlenebilir olacak

## AI ile ilgili nihai kararlar
- Doğrudan OpenAI API billing kullanılmayacak
- Kullanıcının mevcut ChatGPT/Workspace hesabı kullanılmak isteniyor
- Resmi API gibi doğrudan backend'e bağlama doğrulanmadı
- Kabul edilen çözüm: Hosted dashboard + Local AI Connector mimarisi
- AI üretimi sunucuda değil, kullanıcının cihazındaki local connector üzerinden çalışacak
- Web uygulamasındaki "Üret" butonları hazır promptları local connector'a gönderecek
- Local connector kullanıcının ChatGPT/Workspace hesabıyla giriş yapabilecek
- Hesap değiştirme ihtiyacı var: logout/login ile başka hesaba geçilebilmeli
- Hedef deneyim: uygulama içinde başlık/açıklama/tag üret butonları
- Codex entegrasyonu ürün kapsamında yok

## Scraping / altyapı kararları
- Trendyol satıcı API kullanılmayacak
- Ürün linkleri taranacak
- Temel yaklaşım: HTTP fetch + parser
- Gerekirse ileride sınırlı browser fallback düşünülebilir ama ana yöntem olmayacak
- Ücretsiz/çok düşük maliyetli altyapı tercih edilecek

## Etsy/SEO notları
- Resmi Etsy kaynakları tasarım girdisi olarak kullanılacak
- Başlıklar kısa, açık, taranabilir olacak
- En önemli ürün özellikleri başta olacak
- 13 tag kullanılacak
- Tag başına 20 karakter sınırı dikkate alınacak
- Title/tags/attributes/description birlikte ele alınacak

## Açık tasarım işi
- Bölüm 1 mimari, Local AI Connector çözümüyle revize edildi
- Sıradaki adım: Bölüm 2 veri modeli + stok/fiyat akışı + AI connector akışı

## Görsel tasarım kararı
- Kullanıcının verdiği referans HTML/CSS tasarımları bağlayıcı referans kabul edildi
- Uygulamanın görsel dili bu referanslara göre kurulacak
- Temel görsel sistem:
  - koyu lacivert sol sidebar (#051125 / #1B263B)
  - açık yüzeyler / cam efekti topbar
  - vurgu rengi turuncu (#F1641E)
  - tipografi: Manrope + Inter
  - yumuşak kartlar, rounded-xl, editorial / premium dashboard hissi
- Sayfalar için referans kümeleri mevcut:
  - dashboard genel bakış
  - ürün takip merkezi
  - SEO analysis/editor split pane
- Açık soru: hangi referans ekran birincil görsel baz olacak
- Ana görsel baz ekran seçimi: Link Tracking Center
- Yani ürün odaklı ana iskelet kullanılacak:
  - üstte link ekleme alanı
  - filtre/segment kontrolü
  - ürün kartları / liste görünümü
  - ürün detayına inen akış
- Dashboard ve SEO Editor ekranları da bu görsel dilin türevleri olacak
