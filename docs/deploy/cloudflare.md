# Cloudflare Workers + D1 + Pages Deploy Rehberi

Bu dokuman `apps/api` uygulamasini Cloudflare Worker olarak, `apps/web` uygulamasini Cloudflare Pages uzerinde yayinlamak icin gereken kalici kurulum akislarini toplar. `apps/connector` bu kapsamda deploy edilmez.

## Repo-bazli Cloudflare authentication

Bu repo ayni sunucuda baska Cloudflare projeleri ile birlikte calisacaksa global `wrangler login` veya kullanici-shell seviyesinde ortak `CLOUDFLARE_API_TOKEN` kullanilmaz. Bu proje kendi auth bilgisini sadece repo icinde, git'e girmeyen bir dosyada tutar.

Bu proje icin kullanilacak hesap:

- `berkekockapan3535@gmail.com`

Kurulum:

1. `apps/api/.cloudflare.env.example` dosyasini `apps/api/.cloudflare.env` olarak kopyalayin.
2. `CLOUDFLARE_API_TOKEN` degerini `berkekockapan3535@gmail.com` hesabinda olusturdugunuz token ile doldurun.
3. `CLOUDFLARE_ACCOUNT_ID` degerini mevcut `wrangler.toml` ile ayni birakin.

Ornek:

```env
CLOUDFLARE_API_TOKEN=put_your_cloudflare_api_token_here
CLOUDFLARE_ACCOUNT_ID=102eaec87235c67e6d7524d859bd92dd
```

Bu dosya `.gitignore` icinde ignore edilir. Komutlar auth bilgisini `scripts/cloudflare-auth-run.mjs` uzerinden yukler; boylece ayni sunucudaki baska projelerin Cloudflare hesaplari ile karismaz.

## Canli veri kurali

- Production kullanicilari sadece deploy edilmis Worker + `dropshiping2bizbize-prod` uzerinden calisir.
- `dropshiping2bizbize-prod` canli veri icin tek dogruluk kaynagidir.
- `dropshiping2bizbize-dev`, lokal `wrangler dev` ve lokal D1 sadece gelistirme ve test amaclidir; canli veri kaynagi degildir.
- `VITE_API_BASE_URL` production preview ortaminda canli Worker domainine isaret eder.

## Hedef kaynaklar

- Worker (production): `dropshiping2bizbize-api`
- Worker (remote dev): `dropshiping2bizbize-api-dev`
- D1 (production): `dropshiping2bizbize-prod`
- D1 (remote dev): `dropshiping2bizbize-dev`
- Queue (production): `dropshiping2bizbize-refresh`
- Queue (remote dev): `dropshiping2bizbize-refresh-dev`
- Connector: deploy edilmeyecek

## Ortam modeli

Cloudflare Wrangler ortamlari ayri Worker isimleri uretir (`<name>-<environment>`). Bu nedenle production Worker adini `dropshiping2bizbize-api` olarak korumak icin kok `wrangler.toml` production kabul edildi; remote dev veritabani ve istege bagli dev Worker ayrimi `env.dev` altinda tutuldu.

- Top-level Worker: `dropshiping2bizbize-api` -> production D1 (`dropshiping2bizbize-prod`)
- `--env dev`: `dropshiping2bizbize-api-dev` -> remote dev D1 (`dropshiping2bizbize-dev`)
- Lokal `wrangler dev`: ayni config ile calisir ama D1 erisimi yerel gelistirme depolamasinda simule edilir

## 1) Cloudflare kaynaklarini olustur

Bu projede `wrangler login` zorunlu degildir. Repo-bazli token auth kullanilir.

Ardindan kaynaklari olustur:

```bash
node scripts/cloudflare-auth-run.mjs d1 create dropshiping2bizbize-dev
node scripts/cloudflare-auth-run.mjs d1 create dropshiping2bizbize-prod
node scripts/cloudflare-auth-run.mjs queues create dropshiping2bizbize-refresh
node scripts/cloudflare-auth-run.mjs queues create dropshiping2bizbize-refresh-dev
```

## 2) API Worker yapilandirmasi

`apps/api/wrangler.toml` su kurallarla yonetilir:

- Production deploy icin top-level binding'ler kullanilir
- Remote dev deploy icin `env.dev` binding'leri kullanilir
- Queue producer/consumer binding'leri hem top-level hem `env.dev` icinde acikca tanimlidir; cunku Cloudflare ortamlarinda binding'ler kalitilmaz
- Cron tetigi her saat basi calisir: `0 * * * *`
- Dev cron tetigi plan limiti nedeniyle bos birakilmistir: `[env.dev.triggers] crons = []`

## 3) Uzak D1 migration akisi

Production migration:

```bash
pnpm cf:migrate:api:prod
```

Remote dev migration:

```bash
pnpm cf:migrate:api:dev
```

## 4) API deploy ve dogrulama

Production API deploy:

```bash
pnpm cf:deploy:api
```

Istege bagli remote dev deploy:

```bash
pnpm cf:deploy:api:dev
```

Deploy sonrasi health check:

```bash
curl https://dropshiping2bizbize-api.berkekockapan3535.workers.dev/health
curl https://dropshiping2bizbize-api-dev.berkekockapan3535.workers.dev/health
```

Beklenen cevap:

```json
{"ok":true}
```

## 5) Frontend / preview akisi

- Cloud preview build'i `VITE_API_BASE_URL=https://dropshiping2bizbize-api.berkekockapan3535.workers.dev` ile alinir.
- Yerel preview portu: `4175`
- Yerel dev web portu: `5174`
- Yerel API portu: `8788`
- Ngrok web panel portu: `4041`

## 6) Windows acilis akisi

Guncellenen dosyalar:

- `scripts/windows/start-server.bat`
- `scripts/windows/restart-main-server.ps1`
- `scripts/windows/restart-main-server.Tests.ps1`

`start-server.bat` artik otomatik olarak su zinciri baslatir:

1. repo yolunu otomatik bulur
2. acik eski proje pencerelerini kapatir
3. `git fetch origin`
4. `git checkout main`
5. `git reset --hard origin/main`
6. `git clean -fd`
7. `pnpm install`
8. production migration
9. production deploy
10. cloud health check
11. web preview baslatma
12. ngrok baslatma
13. ozet log yazma

> Dikkat: Bu akis local degisiklikleri siler; cunku `reset --hard` ve `clean -fd` kullanir.

## 7) Hazir komutlar

- Production deploy: `pnpm cf:deploy:api`
- Remote dev deploy: `pnpm cf:deploy:api:dev`
- Production migration: `pnpm cf:migrate:api:prod`
- Remote dev migration: `pnpm cf:migrate:api:dev`
- Web build: `pnpm cf:build:web`

## 8) Smoke test kontrol listesi

- `node scripts/cloudflare-auth-run.mjs whoami --json` dogru hesabi gosteriyor mu?
- Worker health endpoint donuyor mu?
- Web preview API ile konusuyor mu?
- Refresh akisi dogru queue adina yaziyor mu?
- Hicbir adim `dropshiping-win` hesabindaki kaynaklara temas etmiyor mu?
