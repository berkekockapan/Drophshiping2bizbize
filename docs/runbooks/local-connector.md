# Local Connector Runbook

## Amaç
Bu rehber, Windows masaüstünde bağlantı zincirinin nasıl çalıştığını ve kullanıcı akışının hangi dosyayla başladığını açıklar. Normal kullanıcı akışı teknik ayarlarla değil, masaüstü launcher ile başlar:

1. `C:\Users\berke\Desktop\Dropshipping-Baslat.bat`
2. Bu dosya repo içindeki `scripts/windows/start-dev.ps1` scriptini çalıştırır
3. Script connector → API → web sırasıyla servisleri başlatır
4. `AI Bağlantıları` sayfası varsayılan olarak teknik alan göstermez
5. `Gelişmiş Ayarlar` yalnızca override/debug içindir

## Varsayılan masaüstü davranışı
- Desktop launcher için önerilen connector provider `chatgpt-web` değeridir.
- `CONNECTOR_PROVIDER=mock` masaüstü akışında varsayılan değildir.
- `CONNECTOR_PROVIDER=mock` ile devam etmek yalnızca test amacıyla `ALLOW_MOCK_DESKTOP=1` açıkken mümkündür.
- `Bağlantıyı Kaldır` yerel session/storage artıklarını temizler; yalnızca UI kaydı silinmez.
- Uygulama yeniden açıldığında geçerli oturum varsa connector bunu yeniden doğrular ve bağlı durumunu geri getirir.

## Kurulum önkoşulları
1. Windows makinede Node, pnpm ve Git yüklü olmalı.
2. Repo bağımlılıkları kurulmuş olmalı; `node_modules` eksikse önce `pnpm install` çalıştırın.
3. Playwright Chromium, gerçek desktop akışı için hazır olmalı. Gerekirse:

```powershell
pnpm --filter @trendyol-etsy/connector exec playwright install chromium
```

## Start / stop scriptleri
Repo içinde resmi Windows akışı şu dosyalarla yönetilir:

- `scripts/windows/start-dev.ps1`
- `scripts/windows/stop-dev.ps1`

Başlatma scripti:

1. proje kökünü çözümler
2. `.state/windows-dev/logs` ve `.state/windows-dev/pids` klasörlerini hazırlar
3. Node / pnpm / bağımlılık / Chromium önkoşullarını fail-fast kontrol eder
4. eski `Dropship Connector`, `Dropship API`, `Dropship Web` pencerelerini kapatır
5. connector → api → web sırasıyla servisleri başlatır
6. `http://127.0.0.1:4317/health`, `http://127.0.0.1:8787/health` ve `http://127.0.0.1:5173` için bekler
7. sağlık doğrulaması tamamlanınca tarayıcıyı açar

Durma scripti:

1. `.state/windows-dev/pids/*.pid` kayıtlarını okur
2. kayıtlı süreçleri kapatır
3. eski servis pencerelerini de temizlemeye çalışır

## AI Bağlantıları akışı
1. `AI Bağlantıları` sayfasını açın.
2. Teknik hedef alanları varsayılan olarak görünmemelidir.
3. Gerekirse `Gelişmiş Ayarlar` bölümünü açın ve yalnızca URL override düzenleyin.
4. `OpenAI ile Bağlan` ile yeni oturum başlatın.
5. Bağlantı hazır olduğunda tek aktif hesap özeti görünür.
6. `Bağlantıyı Kaldır` seçeneği yerel oturum artıklarını da temizler.

## Etsy Prep doğrulaması
1. Ürün detay sayfasında `Etsy'e Yükle` modunu açın.
2. Bağlantı hazır değilse ürün diliyle `OpenAI bağlantısı gerekli` veya `Yerel bağlantı servisi hazır değil` benzeri durum mesajlarını görmelisiniz.
3. Bağlantı hazırsa `Title Üret`, `Description Üret` ve `Tags Üret` aksiyonları local connector üzerinden çalışır.

## Sorun giderme
- `Desktop startup CONNECTOR_PROVIDER=mock...` hatası alıyorsanız `.env` dosyanız desktop-first akışa uygun değildir; `CONNECTOR_PROVIDER=chatgpt-web` yapın veya test için `ALLOW_MOCK_DESKTOP=1` kullanın.
- `Yerel bağlantı servisi hazır değil` görüyorsanız `.state/windows-dev/logs/startup.log`, `connector.log`, `api.log` ve `web.log` dosyalarını kontrol edin.
- `Chromium bulunamadi` hatası alıyorsanız Playwright browser kurulumu eksiktir.
- `pnpm` veya `bash` bulunamıyorsa Git for Windows ve Corepack kurulumunu kontrol edin.

## Loglar
Runtime çıktıları şuralara yazılır:

- `.state/windows-dev/logs/startup.log`
- `.state/windows-dev/logs/connector.log`
- `.state/windows-dev/logs/api.log`
- `.state/windows-dev/logs/web.log`

## Hızlı deneme
Masaüstü akışını manuel olarak denemek için:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\windows\start-dev.ps1
```

Bu komut, `CONNECTOR_PROVIDER=mock` aktifse açık hata ile durmalıdır; bu davranış desktop-first güvenlik kontrolüdür.
