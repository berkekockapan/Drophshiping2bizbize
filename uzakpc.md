# uzakpc operasyon hafizasi (guncel)

Son guncelleme: 2026-04-21  
Bu dosya, `uzakpc` (Windows server) ustundeki canli calisma modelini unutmayalim diye hazirlanmistir.

## 1) Aktif Mimari (su an ne calisiyor?)

Su an varsayilan calisma sekli tamamen `Cloud` odaklidir:

- Kod kaynagi: `C:\dropshipingtakip2`
- Web: Windows server uzerinde `vite preview` (`http://127.0.0.1:4174`)
- API: Cloudflare Worker (`dropshipingtakip2-berkecanta-api`)
- Dis erisim: `ngrok http 4174`

Pratikte bu ne demek:

- Lokal `wrangler dev` API sureci acilmiyor (standart start akisinda).
- Web, dogrudan Cloud API'ye (`VITE_API_BASE_URL`) baglaniyor.
- Dis dunyaya tek giris ngrok URL'si.

## 2) Cloudflare Kaynaklari (izole ortam: `berkecanta`)

- Account: `berkekockapan3535@gmail.com`
- Account ID: `102eaec87235c67e6d7524d859bd92dd`
- Worker prod: `dropshipingtakip2-berkecanta-api`
- Worker dev: `dropshipingtakip2-berkecanta-api-dev`
- D1 prod: `dropshipingtakip2-berkecanta-prod` (`f3d48e00-6fc4-4ab5-b57c-170a0964e4bf`)
- D1 dev: `dropshipingtakip2-berkecanta-dev` (`78a15c3d-c290-4564-8586-0a31f7329e99`)
- Queue prod: `dropshipingtakip2-berkecanta-refresh`
- Queue dev: `dropshipingtakip2-berkecanta-refresh-dev`

Izole wrangler config:

- `apps/api/wrangler.isolated.toml`

Web env (Cloud API'ye bakiyor):

- `apps/web/.env.production`
- `apps/web/.env.local`
- `VITE_API_BASE_URL=https://dropshipingtakip2-berkecanta-api.berkekockapan3535.workers.dev`

## 3) Kritik Windows Scriptleri

- `scripts/windows/start-server.bat`
  - Cloud modda restart scriptini cagirir.
  - Varsayilan olarak `-SkipGitSync -SkipInstall -SkipCloudDeploy` ile calisir.
  - `NgrokLocalScriptPath` olarak `scripts/windows/.ngrok.local.ps1` gonderir.
  - `NgrokConfigPath` olarak `scripts/windows/.ngrok.project.yml` ve `NgrokWebPort=4041` gonderir.

- `scripts/windows/restart-main-server.ps1`
  - Sadece bu projeye ait pencereleri kapatir (global `taskkill node/ngrok` yapmaz).
  - Cloud API health kontrolu yapar.
  - Web preview (`4174`) acip hazir olmasini bekler.
  - ngrok'u projeye ozel config ile acar: `ngrok http 4174 --config scripts/windows/.ngrok.project.yml`
  - Public URL'yi `http://127.0.0.1:4041/api/tunnels` uzerinden bekler.
  - Gerekirse local token dosyasindan alip projeye ozel config dosyasini uretir.

- `scripts/windows/stop-server.bat`
  - `stop-main-server.ps1` cagirir.

- `scripts/windows/stop-main-server.ps1`
  - Sadece bu projenin pencerelerini kapatir:
    - `DropshipTakip2 Web (Cloud Preview)`
    - `DropshipTakip2 Web`
    - `DropshipTakip2 API`
    - `DropshipTakip2 ngrok`

- `scripts/windows/configure-ngrok-auth.ps1`
  - Verilen authtoken'i `scripts/windows/.ngrok.local.ps1` icine yazar.
  - Projeye ozel `scripts/windows/.ngrok.project.yml` dosyasini yazar (`web_addr: 127.0.0.1:4041`).
  - Secret dosyasini `.git/info/exclude` ile local ignore eder.
  - `ngrok config check --config ...` ile proje configini dogrular.

## 4) Standart Operasyon Akisi

### 4.1 Sunucuda kodu guncelle

```powershell
Set-Location C:\dropshipingtakip2
git pull --ff-only origin main
```

### 4.2 Ngrok authtoken'i bir kere ayarla

Not:

- Burada gereken deger `Authtoken`dir.
- `API key` ayni sey degildir.

```powershell
Set-Location C:\dropshipingtakip2
powershell -ExecutionPolicy Bypass -File .\scripts\windows\configure-ngrok-auth.ps1 `
  -RepoPath C:\dropshipingtakip2 `
  -NgrokAuthToken "BURAYA_AUTHTOKEN"
```

### 4.3 Servisi baslat / durdur

```powershell
Set-Location C:\dropshipingtakip2
.\scripts\windows\stop-server.bat
.\scripts\windows\start-server.bat
```

## 5) Hizli Dogrulama Checklisti

Baslatmadan sonra:

1. Cloud API health OK:
`https://dropshipingtakip2-berkecanta-api.berkekockapan3535.workers.dev/health`
2. Local preview cevap veriyor:
`http://127.0.0.1:4174`
3. ngrok penceresinde:
`Session Status: online` ve `Forwarding https://... -> http://localhost:4174`
4. Tarayicida ngrok URL aciliyor.

Opsiyonel terminal kontrolu:

```powershell
Invoke-WebRequest "http://127.0.0.1:4174" -UseBasicParsing | Select-Object StatusCode
Invoke-RestMethod "http://127.0.0.1:4041/api/tunnels" | ConvertTo-Json -Depth 5
```

## 6) Sik Hatalar ve Net Cozum

### Hata: `ERR_NGROK_105`

Sebep: placeholder veya bozuk token (`BURAYA_GERCEK_AUTHTOKEN` gibi) kullanimi.

Cozum:

- `scripts/windows/.ngrok.local.ps1` dosyasina gercek authtoken yaz.
- `configure-ngrok-auth.ps1` scriptini tekrar calistir.

### Hata: `ERR_NGROK_107`

Sebep: token formati dogru ama gecersiz/revoke.

Cozum:

- Dashboarddan yeni authtoken al.
- `configure-ngrok-auth.ps1` ile yeniden uygula.

### Durum: `4041 API hatasi: Uzak sunucuya baglanilamiyor`

Sebep: ngrok sureci ayakta degil.

Cozum:

```powershell
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force
ngrok http 4174 --config .\scripts\windows\.ngrok.project.yml
```

### Hata: `tsc is not recognized` veya `node_modules missing`

Sebep: `start-server.bat` varsayilaninda `-SkipInstall` aktif oldugu icin bagimliliklar yoksa build fail eder.

Cozum:

```powershell
Set-Location C:\dropshipingtakip2
pnpm.cmd install
```

Sonra `start-server.bat` tekrar calistir.

## 7) Bilincli Tasarim Notlari

- `start-server.bat` hiz icin sync/install/deploy adimlarini atliyor.
- Uretim benzeri hizli yayinda bu tercih dogru.
- Ama asagidaki senaryolarda full akis calistirilabilir:
  - Yeni commit geldi ve server guncellenmedi.
  - Bagimliliklar degisti.
  - Cloud deploy de ayni akista yapilmak isteniyor.

Full cloud akis ornegi:

```powershell
Set-Location C:\dropshipingtakip2
powershell -ExecutionPolicy Bypass -File .\scripts\windows\restart-main-server.ps1 `
  -RepoPath C:\dropshipingtakip2 `
  -Mode Cloud `
  -CloudApiBaseUrl "https://dropshipingtakip2-berkecanta-api.berkekockapan3535.workers.dev" `
  -CloudWranglerConfigPath "apps/api/wrangler.isolated.toml" `
  -CloudD1ProdName "dropshipingtakip2-berkecanta-prod"
```

## 8) Guvenlik ve Secret Kurallari

- `scripts/windows/.ngrok.local.ps1` secret icerir, commit edilmez.
- `scripts/windows/.ngrok.project.yml` secret icerir, commit edilmez.
- Bu dosya hem `.gitignore` hem `.git/info/exclude` ile korunur.
- Tokenlarin chat/gecmis kaydina dusmesi risklidir; mumkunse rotate edilmelidir.

## 9) Eski Sistemden Kalanlar (kullanilmayacak)

Asagidaki yol artik aktif sistemin parcasi degil:

- `C:\dropshiping-win`

Bu klasor baska bir proje/gecmis kurulum baglami olabilir. Aktif operasyon daima:

- `C:\dropshipingtakip2`
