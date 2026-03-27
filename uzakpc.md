# uzakpc

Bu dosya, projeyi uzaktan yayınladığımız Windows makineyi (`uzakpc`) unutmamak için kısa operasyon hafızasıdır.

## Sistem Tanımı

- Ad: `uzakpc`
- Rol: Projeyi çalıştıran uzak Windows makine
- Yayın modeli: `web (vite)` + `api (wrangler)` + `ngrok`
- Hedef: Güncel kodu dışarıya `https://...ngrok...` linkiyle açmak

## Hangi Dal?

- Varsayılan ve istenen dal: `main`
- `windows-selfhost-ngrok-no-ai` dalı farklı davranır (AI menüsünü gizleyen self-host MVP akışı).
- `uzakpc` için normalde `main` kullanılmalı.

## Güncel Kodu Zorla Senkronlama (Windows)

```powershell
cd C:\dropshiping-win
git fetch origin
git reset --hard origin/main
git clean -fd
git rev-parse --short HEAD
git rev-parse --short origin/main
```

`HEAD` ve `origin/main` aynı değilse, güncel kod çalışmıyor demektir.

## Temiz Yeniden Başlatma Sırası

Önce eski süreçleri kapat:

```powershell
taskkill /IM node.exe /F
taskkill /IM ngrok.exe /F
taskkill /IM caddy.exe /F
```

Sonra 3 terminal ile aç:

1) API terminali

```powershell
cd C:\dropshiping-win
$env:Path += ";C:\Program Files\Git\bin"
pnpm.cmd install
pnpm.cmd dev:api
```

Beklenen: `Ready on http://127.0.0.1:8787`

2) Web terminali

```powershell
cd C:\dropshiping-win
pnpm.cmd dev:web
```

Beklenen: `Local: http://127.0.0.1:5173/`

3) Dış erişim terminali

```powershell
cd C:\dropshiping-win
ngrok http 5173
```

Beklenen: `Forwarding https://...`

## Hızlı Sağlık Kontrolü

- Local web: `http://127.0.0.1:5173`
- Local API health: `http://127.0.0.1:8787/health`
- Dış erişim: ngrok’un verdiği `https://...` URL

## Sık Karşılaşılan Sorunlar

### 1) `bash is not recognized`

API terminalinde çalıştır:

```powershell
$env:Path += ";C:\Program Files\Git\bin"
```

### 2) `wrangler is not recognized`

Global yerine proje içinden çağır:

```powershell
cd C:\dropshiping-win\apps\api
pnpm.cmd exec wrangler dev --port 8787
```

### 3) Web açık ama `ECONNREFUSED 127.0.0.1:8787`

API çalışmıyor demektir. Önce API terminalini ayağa kaldır.

### 4) `ngrok endpoint already online` (ERR_NGROK_334)

Eski ngrok sürecini kapat:

```powershell
taskkill /IM ngrok.exe /F
```

### 5) `ngrok agent too old` (ERR_NGROK_121)

```powershell
ngrok update
ngrok version
```

## Operasyon Notları

- `uzakpc` için “güncel değil” şikayetinde ilk kontrol her zaman commit eşleşmesidir.
- Kod güncel olsa bile eski süreçler açık kalırsa eski davranış görülebilir; bu yüzden süreç temizliği kritik.
- Gerekirse ngrok authtoken döndür (rotate) ve yeniden `ngrok config add-authtoken ...` çalıştır.

