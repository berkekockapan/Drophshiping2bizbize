# Local Connector Runbook

## Amaç

Bu rehber, Windows masaüstünde connector → API → web zincirinin nasıl çalıştığını ve `dropshiping2bizbize` için hedef port standardını açıklar.

## Hedef port standardı

- Connector: `4318`
- API: `8788`
- Web dev: `5174`
- Web preview: `4175`

## Geçici repo gerçeği

21 Nisan 2026 itibarıyla bazı script ve config dosyalarında hâlâ şu legacy değerler görülebilir:

- Connector `4318`
- API `8788`
- Web dev `5174`
- Web preview `4175`

Bu runbook hedef standardı tarif eder. Script çalıştırmadan önce gerçek dosya durumunu kontrol edin ve görülen farkı drift olarak not edin.

## Varsayılan masaüstü davranışı

1. Kullanıcı akışı masaüstü launcher ile başlar.
2. Launcher connector → API → web sırasıyla servisleri açar.
3. `AI Bağlantıları` sayfası teknik detay göstermek zorunda değildir.
4. `Gelişmiş Ayarlar` yalnızca override/debug içindir.

## Kurulum önkoşulları

1. Windows makinede Node, pnpm ve Git kurulu olmalı.
2. Repo bağımlılıkları kurulu olmalı; eksikse `pnpm install` çalıştırın.
3. Gerçek browser tabanlı connector gerekiyorsa Playwright Chromium hazır olmalı.

Örnek kurulum komutu:

```powershell
pnpm --filter <connector-package> exec playwright install chromium
```

- Hedef paket adı: `@dropshiping2bizbize/connector`
- Geçici repo gerçeği: bugün `@dropshiping2bizbize/connector` gerekebilir

## Start / stop scriptleri

Repo içindeki resmi Windows akışı şu dosyalarla yönetilir:

- `scripts/windows/start-dev.ps1`
- `scripts/windows/stop-dev.ps1`

Hedef davranış:

1. Gerekli log ve PID klasörlerini hazırlar.
2. Önkoşulları fail-fast kontrol eder.
3. Eski servis pencerelerini kapatır.
4. Connector → API → web sırasıyla servisleri başlatır.
5. `http://127.0.0.1:4318/health`, `http://127.0.0.1:8788/health` ve `http://127.0.0.1:5174` için bekler.

> Eğer mevcut scriptler bugün hâlâ `4318/8788/5174` bekliyorsa bu Faz C boşluğudur; doküman standardı değiştirilmiş, script henüz değiştirilmemiştir.

## AI Bağlantıları akışı

1. `AI Bağlantıları` sayfasını açın.
2. Teknik hedef alanları varsayılan olarak göstermeyin.
3. Gerekirse yalnızca override URL'leri düzenleyin.
4. `OpenAI ile Bağlan` ile yeni oturum başlatın.
5. Bağlantı hazır olduğunda tek aktif hesap özeti görünmelidir.

## Sorun giderme

- `Yerel bağlantı servisi hazır değil` görüyorsanız ilgili logları kontrol edin.
- Port çakışması varsa hedef port standardını baz alın.
- `pnpm` veya `bash` bulunamıyorsa Git for Windows ve Corepack kurulumunu doğrulayın.
- `dropshiping-win` veya legacy repo klasörüne işaret eden herhangi bir yol görürseniz bunu konfigürasyon drift'i kabul edin.


