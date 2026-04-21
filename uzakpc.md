# uzakpc operasyon hafızası

Son güncelleme: 2026-04-21  
Bu dosya, `uzakpc` (Windows server) üzerindeki hedef operasyon standardını unutmamak için tutulur.

> 21 Nisan 2026 uygulaması sonrasında repo, port ve Cloudflare kimliği `dropshiping2bizbize` standardına taşınmıştır. Sunucuda eski klasör adları görülebilir; operasyonel referans olarak kullanılmazlar.

## 1) Hedef mimari

Varsayılan çalışma şekli `Cloud` odaklıdır:

- Repo kimliği: `dropshiping2bizbize`
- Önerilen sunucu klasörü: `C:\dropshiping2bizbize`
- Web preview: `http://127.0.0.1:4175`
- API: Cloudflare Worker `dropshiping2bizbize-api`
- Dış erişim: `ngrok http 4175`

Pratik anlamı:

- Web, doğrudan Cloud API'ye (`VITE_API_BASE_URL`) bağlanır.
- Dış dünyaya tek giriş ngrok URL'sidir.
- `dropshiping-win` ile klasör, hesap veya kaynak paylaşımı yapılmaz.

## 2) Hedef Cloudflare kaynakları

- Account: `berkekockapan3535@gmail.com`
- Account ID: `102eaec87235c67e6d7524d859bd92dd`
- Worker prod: `dropshiping2bizbize-api`
- Worker dev: `dropshiping2bizbize-api-dev`
- D1 prod: `dropshiping2bizbize-prod`
- D1 dev: `dropshiping2bizbize-dev`
- Queue prod: `dropshiping2bizbize-refresh`
- Queue dev: `dropshiping2bizbize-refresh-dev`

Web env hedefi:

- `VITE_API_BASE_URL=https://dropshiping2bizbize-api.berkekockapan3535.workers.dev`

## 3) Eski izler nasıl yorumlanır?

Sunucuda veya eski notlarda şu tür kalıntılar görülebilir:

- `C:\dropshipingtakip2`
- `C:\dropshiping-win`
- `dropshipingtakip2-*`
- `@trendyol-etsy/*`
- eski portlar `8787`, `5173`, `4174`, `4317`

Bunlar yalnızca tarihsel kalıntı kabul edilir. Operasyonel hedef bu dosyada yazan `dropshiping2bizbize` standardıdır.

## 4) Kritik Windows scriptleri için beklenen davranış

- `scripts/windows/start-server.bat`
  - Bu repo içindeki resmi tek-tık başlangıç girişidir.
  - Cloud modda restart scriptini çağırır.
  - `origin/main` ile senkronizasyon, install, migration, deploy, health check, preview ve ngrok zincirini yürütür.
  - Hedefte web preview `4175` için bekler.
  - Yanlış proje klasörüne veya yanlış Cloudflare hesabına deploy etmez.

- `scripts/windows/restart-main-server.ps1`
  - Sadece bu projeye ait pencereleri kapatır.
  - Cloud API health kontrolü yapar.
  - Web preview (`4175`) açıp hazır olmasını bekler.
  - ngrok'u `4175` portuna bağlar.

- `scripts/windows/stop-main-server.ps1`
  - Yalnızca bu projeye ait pencereleri kapatır.

- `scripts/windows/stop-server.bat`
  - Bu repo içindeki resmi tek-tık durdurma girişidir.
  - `stop-main-server.ps1` üstünden aktif preview/ngrok pencerelerini kapatır.

## 5) Standart operasyon akışı

### 5.1 İlk kurulumda local secret dosyalarını hazırla

- `apps/api/.cloudflare.env` dosyası repo-bazlı Cloudflare token içermelidir.
- `scripts/windows/.ngrok.local.ps1` dosyası gerekirse `NGROK_AUTHTOKEN` içermelidir.
- Örnek dosyalar:
  - `apps/api/.cloudflare.env.example`
  - `scripts/windows/.ngrok.local.example.ps1`

### 5.2 Servisi başlat / durdur

```powershell
Set-Location C:\dropshiping2bizbize
.\scripts\windows\stop-server.bat
.\scripts\windows\start-server.bat
```

`start-server.bat` zaten kendi içinde:

1. `git fetch origin`
2. `git checkout main`
3. `git reset --hard origin/main`
4. `git clean -fd`
5. `pnpm install`
6. production migration
7. production deploy
8. cloud health check
9. web preview
10. ngrok

zincirini yürütür; ayrıca manuel `git pull` adımı gerektirmez.

## 6) Hızlı doğrulama listesi

1. Cloud API health OK: `https://dropshiping2bizbize-api.berkekockapan3535.workers.dev/health`
2. Local preview cevap veriyor: `http://127.0.0.1:4175`
3. ngrok penceresinde `Forwarding https://... -> http://localhost:4175` görünüyor.
4. Tarayıcıda ngrok URL açılıyor.

## 7) Güvenlik kuralları

- Yanlış Cloudflare hesabında işlem yapma.
- `dropshiping-win` klasörü veya kaynaklarını bu proje için kullanma.
- Secret dosyalarını commit etme.
- Veri etkileyen adımlarda `docs/runbooks/cloudflare-data-safety.md` kontrol listesini uygula.

## 8) Tarihsel not

Sunucuda `C:\dropshiping-win` veya `C:\dropshipingtakip2` klasörleri bulunabilir; bunlar operasyonel source-of-truth değildir.
Aktif standart bu dosya ve `docs/deploy/cloudflare.md` içindeki `dropshiping2bizbize` kimliğidir.
