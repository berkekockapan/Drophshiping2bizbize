# Mac Yerel Geliştirme ve Desktop Launcher Runbook

## Amaç
Bu doküman, projeyi yeni bir Mac üzerinde sıfırdan ayağa kaldırmak, masaüstüne tek tıkla başlat/durdur dosyaları eklemek ve sistemi her gün aynı şekilde çalıştırmak için hazırlanmıştır.

Bu rehber hem kullanıcı hem de ajan için yazıldı. Ben bu dosyayı okuyunca Mac'te ne kurulacağını, hangi sırayla ilerleyeceğimi ve hangi komutları çalıştıracağımı doğrudan anlayabilmeliyim.

## Servisler ve Beklenen Adresler

| Servis | Komut | Adres |
| --- | --- | --- |
| Web | `pnpm dev:web` | `http://127.0.0.1:5173` |
| API | `pnpm dev:api` | `http://127.0.0.1:8787/health` |
| Connector | `pnpm dev:connector` | `http://127.0.0.1:4317/health` |

## İlk Kurulum

### 1) Gerekli araçları kur
Önerilen temel kurulum:

```bash
xcode-select --install
```

Git yoksa:

```bash
brew install git
```

Node 22 önerilir. `nvm` kullanacaksan:

```bash
brew install nvm
mkdir -p ~/.nvm
export NVM_DIR="$HOME/.nvm"
source "$(brew --prefix nvm)/nvm.sh"
nvm install 22
nvm use 22
```

Alternatif olarak resmi Node 22 kurulumu da kullanılabilir.

### 2) Repoyu klonla
Örnek çalışma dizini:

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/berkekockapan/dropshiping-win.git
cd dropshiping-win
```

### 3) pnpm'i etkinleştir
Repo `pnpm@10.32.1` kullanıyor:

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm --version
```

### 4) Bağımlılıkları kur

```bash
pnpm install
```

### 5) Connector `.env` dosyasını hazırla
Varsayılan geliştirme modu `mock` sağlayıcı ile gelir:

```bash
cp apps/connector/.env.example apps/connector/.env
```

Varsayılan içerik:

```env
CONNECTOR_HOST=127.0.0.1
CONNECTOR_PORT=4317
CONNECTOR_PROVIDER=mock
CONNECTOR_STATE_DIR=.state
```

### 6) İsteğe bağlı: gerçek browser tabanlı connector kullanacaksan
`chatgpt-web` sağlayıcısı için Playwright Chromium gerekebilir:

```bash
pnpm --filter @trendyol-etsy/connector exec playwright install chromium
```

## Desktop Launcher Kurulumu

Repo içinde Mac için yardımcı scriptler var:

- `scripts/macos/create-desktop-launchers.sh`
- `scripts/macos/start-dev.sh`
- `scripts/macos/stop-dev.sh`
- `scripts/macos/run-service.sh`

Masaüstüne başlat/durdur dosyalarını üret:

```bash
bash scripts/macos/create-desktop-launchers.sh
```

Bu komut şunları oluşturur:

- `~/Desktop/dropshiping-win-start.command`
- `~/Desktop/dropshiping-win-stop.command`

> Not: Bu `.command` dosyaları oluşturuldukları anda mevcut repo yolunu içine yazar. Repoyu başka klasöre taşırsan bu üretim komutunu tekrar çalıştır.

## Günlük Kullanım

### Başlatma
Masaüstündeki `dropshiping-win-start.command` dosyasına çift tıkla.

Başlatıcı şunları yapar:

1. Gerekli klasörleri oluşturur: `.state/macos-dev/pids` ve `.state/macos-dev/logs`
2. `apps/connector/.env` yoksa `.env.example` dosyasından üretir
3. `pnpm`, `node`, `osascript` ve `open` komutlarını kontrol eder
4. Yerel API veritabanında `products` tablosu var mı diye bakar
5. Şema yoksa `apps/api/drizzle/0000_initial.sql` ile ilk kurulum yapar
6. Önce eski PID dosyalarına göre çalışan servisleri durdurmaya çalışır
7. Ayrı Terminal sekmelerinde şu servisleri açar:
   - API
   - Connector
   - Web
8. Tarayıcıda `http://127.0.0.1:5173` adresini açar

### Durdurma
Masaüstündeki `dropshiping-win-stop.command` dosyasına çift tıkla.

Bu dosya:

1. `.state/macos-dev/pids/*.pid` dosyalarını okur
2. Yaşayan process'lere önce `TERM`, gerekirse `KILL` gönderir
3. PID dosyalarını temizler

## Manuel Çalıştırma

Launcher yerine terminalden de çalıştırabilirsin:

```bash
bash scripts/macos/start-dev.sh
```

```bash
bash scripts/macos/stop-dev.sh
```

## Sağlık Kontrolleri

Servisler açıldıktan sonra doğrulama:

```bash
curl http://127.0.0.1:8787/health
curl http://127.0.0.1:4317/health
open http://127.0.0.1:5173
```

Beklenen sonuçlar:

- API: `{"ok":true}`
- Connector: JSON health cevabı
- Web: Vite geliştirme ekranı

## Loglar ve PID Dosyaları

Runtime dosyaları:

- PID: `.state/macos-dev/pids`
- Log: `.state/macos-dev/logs`

Örnek log izleme:

```bash
tail -f .state/macos-dev/logs/api.log
tail -f .state/macos-dev/logs/web.log
tail -f .state/macos-dev/logs/connector.log
```

## Sorun Giderme

### 1) `.command` dosyası açılmıyor

```bash
chmod +x ~/Desktop/dropshiping-win-start.command
chmod +x ~/Desktop/dropshiping-win-stop.command
```

Gerekirse quarantine temizle:

```bash
xattr -dr com.apple.quarantine ~/Desktop/dropshiping-win-start.command
xattr -dr com.apple.quarantine ~/Desktop/dropshiping-win-stop.command
```

### 2) Port doluysa

```bash
lsof -i :5173 -sTCP:LISTEN
lsof -i :8787 -sTCP:LISTEN
lsof -i :4317 -sTCP:LISTEN
```

Gerekirse ilgili PID'yi kapat:

```bash
kill -TERM <PID>
```

### 3) `pnpm` bulunamadıysa

```bash
corepack enable
corepack prepare pnpm@10.32.1 --activate
```

### 4) `node_modules` eksikse

```bash
pnpm install
```

### 5) Connector `.env` kaybolduysa

```bash
cp apps/connector/.env.example apps/connector/.env
```

### 6) Yerel API veritabanını sıfırlamak gerekirse
Uyarı: yerel geliştirme verisi silinir.

```bash
rm -rf apps/api/.wrangler
```

Sonra tekrar başlat:

```bash
bash scripts/macos/start-dev.sh
```

## Ajan İçin Uygulama Sırası
Kullanıcı Mac'te “bunu yap” dediğinde aşağıdaki sırayı uygula:

1. Repo klasörüne git
2. `corepack enable`
3. `corepack prepare pnpm@10.32.1 --activate`
4. `pnpm install`
5. `apps/connector/.env` yoksa `.env.example` dosyasından oluştur
6. Gerekirse `pnpm --filter @trendyol-etsy/connector exec playwright install chromium`
7. `bash scripts/macos/create-desktop-launchers.sh`
8. `bash scripts/macos/start-dev.sh`
9. `curl http://127.0.0.1:8787/health`
10. `curl http://127.0.0.1:4317/health`
11. `open http://127.0.0.1:5173`
12. Kullanıcıya masaüstünde `dropshiping-win-start.command` ve `dropshiping-win-stop.command` dosyalarının hazır olduğunu bildir

## Kısa Özet
En kısa kurulum akışı:

```bash
git clone https://github.com/berkekockapan/dropshiping-win.git
cd dropshiping-win
corepack enable
corepack prepare pnpm@10.32.1 --activate
pnpm install
cp apps/connector/.env.example apps/connector/.env
bash scripts/macos/create-desktop-launchers.sh
open ~/Desktop/dropshiping-win-start.command
```
