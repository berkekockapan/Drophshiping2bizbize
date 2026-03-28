# uzakpc

Bu dosya, projeyi uzaktan yayinladigimiz Windows makineyi (`uzakpc`) unutmamak icin kisa operasyon hafizasidir.

## Sistem Tanimi

- Ad: `uzakpc`
- Rol: Projeyi calistiran uzak Windows makine
- Yayin modeli:
  - `Cloud`: `web (build + vite preview @ 4174)` + `Cloud Worker API` + `ngrok`
  - `Local`: `web (vite dev @ 5173)` + `api (wrangler dev @ 8787)` + `ngrok`
- Hedef: `Cloud` modda tek tikla guncel ve prod-benzeri uzaktan yayin acmak

### Cloud mode notu (yeni varsayilan)

- `restart-main-server.ps1` varsayilan olarak `Mode=Cloud` calisir.
- Bu modda script once Cloud API health kontrolu yapar.
- Sonra `VITE_API_BASE_URL` ile `pnpm.cmd --filter @trendyol-etsy/web build` alir.
- Ardindan `vite preview --host 0.0.0.0 --port 4174` ile preview acip `ngrok http 4174` baslatir.
- Build ya da preview health kontrolu basarisizsa script durur; yari-hazir yayin acik birakilmaz.

## Hangi Dal?

- Varsayilan ve istenen dal: `main`
- `windows-selfhost-ngrok-no-ai` dalı farkli davranir (AI menusunu gizleyen self-host MVP akisi).
- `uzakpc` icin normalde `main` kullanilmali.

## Guncel Kodu Zorla Senkronlama (Windows)

```powershell
cd C:\dropshiping-win
git fetch origin
git reset --hard origin/main
git clean -fd
git rev-parse --short HEAD
git rev-parse --short origin/main
```

`HEAD` ve `origin/main` ayni degilse, guncel kod calismiyor demektir.

## Temiz Yeniden Baslatma Sirasi

Once eski surecleri kapat:

```powershell
taskkill /IM node.exe /F
taskkill /IM ngrok.exe /F
taskkill /IM caddy.exe /F
```

Sonra 3 terminal ile ac:

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

3) Dis erisim terminali

```powershell
cd C:\dropshiping-win
ngrok http 5173
```

Beklenen: `Forwarding https://...`

## Tek Tik Restart (Onerilen)

`uzakpc` tarafinda tum temiz restart adimlarini tek komutla calistirmak icin:

```bat
scripts\windows\restart-main-server.bat
```

### Cloud mode notu (yeni varsayilan)

- `restart-main-server.ps1` artik varsayilan olarak `Mode=Cloud` calisir.
- Bu modda lokal API (`wrangler dev`) acilmaz; web, `VITE_API_BASE_URL` ile dogrudan cloud Worker'a baglanir.
- URL kaynagi:
  1. Once `DROPSHIP_CLOUD_API_BASE_URL` ortam degiskeni,
  2. Yoksa `apps/api/wrangler.toml` icindeki `name` alanindan turetilen `https://<name>.workers.dev`.
- Cloud URL yanlis/erisilemezse script hata verip durur (sessizce local moda dusmez).

Bu akista script su sirayi uygular:

1. Eski `node/ngrok/caddy` sureclerini kapatir
2. `main` dalini `origin/main` ile zorla senkronlar
3. `pnpm install` calistirir
4. `Mode=Cloud` ise: once Cloud API health kontrolu yapar, sonra WEB preview, en son ngrok acar
5. `Mode=Local` ise: once API, sonra WEB, en son ngrok acar
6. ngrok public URL'yi terminale yazar

Not: restart scripti `bash.exe` yolunu otomatik bulur; API'yi PATH bagimsiz baslatir.

## Hızlı Sağlık Kontrolü

- Cloud web preview: `http://127.0.0.1:4174`
- Local web dev: `http://127.0.0.1:5173`
- Local API health: `http://127.0.0.1:8787/health`
- Dış erişim: script sonunda loglanan `ngrok public URL`

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
- Kod güncel olsa bile eski süreçler açık kalırsa eski davranış görülebilir; bu yüzden süreç temizliği kritiktir.
- Gerekirse ngrok authtoken döndür (rotate) ve yeniden `ngrok config add-authtoken ...` çalıştır.
