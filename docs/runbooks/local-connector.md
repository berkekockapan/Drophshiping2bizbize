# Local Connector Runbook

## Amaç
Windows üzerindeki CLIProxyAPI hedefini `AI Bağlantıları` ve `Etsy'e Yükle` akışları için hazır hale getirmek.

## Gerekenler
1. Windows makinede CLIProxyAPI servisi çalışıyor olmalı.
2. Servis dış ağ erişimine sahip olmalı; OpenAI OAuth ve inference çağrıları internete çıkabilmeli.
3. Gerekirse makineye RDP veya benzeri bir uzak oturum ile erişebilmelisiniz.

## AI Bağlantıları kurulumu
1. Uygulamada `AI Bağlantıları` sayfasını açın.
2. `Hedef URL` alanına Windows CLIProxyAPI adresini girin.
3. `Management Key` alanına management anahtarını girin.
4. `Inference API Key` alanına browser-side inference için kullanılacak app API key'i girin.
5. İsterseniz hedef için açıklayıcı bir etiket yazın. Varsayılan etiket `Windows` olabilir.
6. `Hedefi Kaydet` ile ayarları saklayın.
7. `OpenAI ile Bağlan` aksiyonunu başlatın.
8. Açılan tarayıcı penceresinde veya Windows oturumunda OAuth girişini tamamlayın.
9. `auth-files` listesinde etkin hesap göründüğünü doğrulayın.

## Etsy prep doğrulaması
1. Bir ürün detayına girip `Etsy'e Yükle` modunu açın.
2. Üst barda `Aktif Bağlantı: Windows • <hesap etiketi>` benzeri bir badge görmeyi bekleyin.
3. `Title Üret`, `Description Üret` veya `Tags Üret` aksiyonlarından birini çalıştırın.
4. İsteklerin Windows hedefindeki `/v1/chat/completions` uç noktasına gittiğini doğrulayın.

## Operasyon notları
- `Management Key` yalnızca management endpoint'leri için kullanılır.
- `Inference API Key` yalnızca `/v1/chat/completions` çağrıları için kullanılır.
- Hızlı ilk render için yalnızca hedef URL ve etiket web tarafında local cache'e yazılır; secret alanlar localStorage'a yazılmaz.
- Etkin auth-file yoksa Etsy prep alan üretimi bloklanır.

## Sorun giderme
- `AI hedef ayarları eksik` görüyorsanız `AI Bağlantıları` sayfasında URL, management key ve inference API key alanlarını tekrar kontrol edin.
- `Üretim için en az bir etkin Codex hesabı gerekli` görüyorsanız Windows tarafındaki auth-file listesini ve etkin hesap durumunu kontrol edin.
- OAuth akışı beklemede kalıyorsa Windows oturumunda girişin tamamlandığını ve CLIProxyAPI'nin auth status endpoint'inin yanıt verdiğini doğrulayın.
- Zaman aşımı alıyorsanız Windows makineden hedef internet erişimini ve servis loglarını kontrol edin.
