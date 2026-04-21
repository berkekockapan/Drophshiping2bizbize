# Mac Yerel Geliştirme ve Desktop Launcher Runbook

## Amaç

Bu doküman, `dropshiping2bizbize` reposunu yeni bir Mac üzerinde ayağa kaldırmak ve günlük geliştirme akışını tek yerden tarif etmek için hazırlanmıştır.

## Hedef kimlik ve port standardı

- Repo klasör hedefi: `~/Projects/dropshiping2bizbize`
- Scope hedefi: `@dropshiping2bizbize/*`
- API: `http://127.0.0.1:8788/health`
- Connector: `http://127.0.0.1:4318/health`
- Web dev: `http://127.0.0.1:5174`
- Web preview: `http://127.0.0.1:4175`

## Geçici repo gerçeği

21 Nisan 2026 itibarıyla script/config dosyalarında hâlâ `@dropshiping2bizbize/*` ve `8788/5174/4175/4318` değerleri görülebilir. Bu runbook hedef standardı anlatır; fiili değerler farklıysa bunu Faz B/C drift'i olarak raporlayın.

## İlk kurulum

### 1) Gerekli araçları kur

```bash
xcode-select --install
```

Gerekirse:

```bash
brew install git
```

Node 22 önerilir. `pnpm@10.32.1` etkin olmalıdır.

### 2) Repoyu hazırla

Örnek çalışma dizini:

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone <repo-url>
cd dropshiping2bizbize
```

> `<repo-url>` bu repo için doğru `origin` adresi olmalıdır. Dokümantasyon turunda URL sabitlemesi yapılmadığı için yanlış repo klonlamayın.

### 3) pnpm'i etkinleştir

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

```bash
cp apps/connector/.env.example apps/connector/.env
```

Hedef içerik standardı:

```env
CONNECTOR_HOST=127.0.0.1
CONNECTOR_PORT=4318
CONNECTOR_PROVIDER=mock
CONNECTOR_STATE_DIR=.state
```

> Eğer örnek dosya bugün `4318` içeriyorsa bu config drift'idir; doküman standardı `4318`dir.

### 6) İsteğe bağlı: gerçek browser tabanlı connector

```bash
pnpm --filter <connector-package> exec playwright install chromium
```

## Desktop launcher kurulumu

Repo içindeki yardımcı scriptler:

- `scripts/macos/create-desktop-launchers.sh`
- `scripts/macos/start-dev.sh`
- `scripts/macos/stop-dev.sh`
- `scripts/macos/run-service.sh`

Launcher üretimi:

```bash
bash scripts/macos/create-desktop-launchers.sh
```

Hedef adlandırma:

- `~/Desktop/dropshiping2bizbize-start.command`
- `~/Desktop/dropshiping2bizbize-stop.command`

> Script bugün eski dosya adı üretirse bu da isimlendirme drift'idir; operasyonel hedef yukarıdaki addır.

## Günlük kullanım

### Başlatma

Hedef davranış:

1. Gerekli klasörleri oluşturur.
2. `apps/connector/.env` yoksa üretir.
3. API, connector ve web servislerini açar.
4. Tarayıcıda `http://127.0.0.1:5174` adresini açar.

### Durdurma

PID dosyalarına göre servisleri kapatır ve temizlik yapar.

## Manuel çalıştırma

```bash
bash scripts/macos/start-dev.sh
bash scripts/macos/stop-dev.sh
```

## Sağlık kontrolleri

```bash
curl http://127.0.0.1:8788/health
curl http://127.0.0.1:4318/health
open http://127.0.0.1:5174
```

## Sorun giderme

- Port doluysa hedef port standardını baz alın.
- `pnpm` yoksa `corepack` adımlarını tekrar uygulayın.
- `node_modules` eksikse `pnpm install` çalıştırın.
- Legacy repo yolu (`dropshiping-win`, `dropshipingtakip2`) görürseniz bunun tarihsel kalıntı olduğunu not edin.

## Ajan için uygulama sırası

1. Repo klasörüne git.
2. `corepack enable`
3. `corepack prepare pnpm@10.32.1 --activate`
4. `pnpm install`
5. `apps/connector/.env` yoksa oluştur.
6. Gerekirse Playwright Chromium kur.
7. `bash scripts/macos/create-desktop-launchers.sh`
8. `bash scripts/macos/start-dev.sh`
9. `curl http://127.0.0.1:8788/health`
10. `curl http://127.0.0.1:4318/health`
11. `open http://127.0.0.1:5174`
12. Üretilen launcher adlarının hedef repo kimliğiyle uyumlu olup olmadığını raporla.


