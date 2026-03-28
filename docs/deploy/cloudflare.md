# Cloudflare Workers + D1 + Pages Deploy Rehberi

Bu doküman `apps/api` uygulamasını Cloudflare Worker olarak, `apps/web` uygulamasını Cloudflare Pages üzerinde yayınlamak için gereken kalıcı kurulum akışını toplar. `apps/connector` bu kapsamda deploy edilmez.

## Canli veri kurali

- Production kullanicilari sadece deploy edilmis Pages + deploy edilmis Worker + `trendyol-etsy-prod` uzerinden calisir.
- `trendyol-etsy-prod` canli veri icin tek dogruluk kaynagidir.
- `trendyol-etsy-dev`, lokal `wrangler dev` ve lokal D1 sadece gelistirme ve test amaclidir; canli veri kaynagi degildir.
- `VITE_API_BASE_URL` production Pages ortaminda bos birakilmaz ve canli Worker domainine isaret eder.

## Hedef kaynaklar

- Worker (production): `trendyol-etsy-api`
- Worker (remote dev): `trendyol-etsy-api-dev`
- D1 (production): `trendyol-etsy-prod`
- D1 (remote dev): `trendyol-etsy-dev`
- Queue: `trendyol-refresh`
- Pages project: `trendyol-etsy-web`
- Connector: deploy edilmeyecek

## Ortam modeli

Cloudflare Wrangler ortamları ayrı Worker isimleri üretir (`<name>-<environment>`). Bu nedenle production Worker adını `trendyol-etsy-api` olarak korumak için kök `wrangler.toml` production kabul edildi; remote dev veritabanı ve isteğe bağlı dev Worker ayrımı `env.dev` altında tutuldu.

- Top-level Worker: `trendyol-etsy-api` -> production D1 (`trendyol-etsy-prod`)
- `--env dev`: `trendyol-etsy-api-dev` -> remote dev D1 (`trendyol-etsy-dev`)
- Lokal `wrangler dev`: aynı config ile çalışır ama D1 erişimi yerel geliştirme depolamasında simüle edilir

> Not: Migration dosyaları `apps/api/drizzle` altında olduğu için `wrangler.toml` içinde `migrations_dir = "drizzle"` tanımlıdır.

## 1) Cloudflare kaynaklarını oluştur

Önce Wrangler ile oturum aç:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler login
```

Ardından kaynakları oluştur:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 create trendyol-etsy-dev
pnpm --filter @trendyol-etsy/api exec wrangler d1 create trendyol-etsy-prod
pnpm --filter @trendyol-etsy/api exec wrangler queues create trendyol-refresh
```

Bu komutların çıktısındaki D1 `database_id` değerlerini `apps/api/wrangler.toml` içine yerleştir:

- `REPLACE_PROD_DB_ID`
- `REPLACE_DEV_DB_ID`

## 2) API Worker yapılandırması

`apps/api/wrangler.toml` şu kurallarla yönetilir:

- Production deploy için top-level binding'ler kullanılır
- Remote dev deploy için `env.dev` binding'leri kullanılır
- Queue producer/consumer binding'leri hem top-level hem `env.dev` içinde açıkça tanımlıdır; çünkü Cloudflare ortamlarında binding'ler kalıtılmaz
- Cron tetiği her saat başı çalışır: `0 * * * *`

API Worker, D1 ve Queue Cloudflare hesabında çalışır; lokal bilgisayar yalnızca geliştirme ve deploy için kullanılır.

## 3) Uzak D1 migration akışı

Production migration:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-prod --remote
```

Remote dev migration:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-dev --remote --env dev
```

Veri taşıma gerekiyorsa önerilen akış:

1. Lokal tablo içeriklerini export et
2. Remote D1 veritabanına migration uygula
3. Gerekli seed/import script'i ile veriyi aktar
4. Uzak veriyi `SELECT` sorguları ile doğrula

## 4) API deploy ve doğrulama

Production API deploy:

```bash
pnpm cf:deploy:api
```

İsteğe bağlı remote dev deploy:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler deploy --env dev
```

Deploy sonrası health check:

```bash
curl https://<worker-subdomain>.workers.dev/health
```

Beklenen cevap:

```json
{"ok":true}
```

API public çalışır ve CORS basit tutulur:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,PATCH,PUT,DELETE,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type`

Binary dönen uçlarda da ek credential kullanılmadığı için bu CORS politikası yeterlidir.

## 5) Frontend deploy akışı

Pages projesi için önerilen ayarlar:

- Project name: `trendyol-etsy-web`
- Root directory: `apps/web`
- Build command: `pnpm build`
- Build output directory: `dist`
- Node version: `22.x`
- Environment variable: `VITE_API_BASE_URL=https://<worker-subdomain>.workers.dev`

İsteğe bağlı yerel build doğrulaması:

```bash
pnpm cf:build:web
```

Davranış farkı:

- Local: Vite proxy ile `/owners` vb. istekler `http://127.0.0.1:8787` adresine gider
- Production: Tarayıcı `VITE_API_BASE_URL` üzerinden doğrudan Cloudflare Worker'a gider

## 6) Connector kapsamı ve desteklenen akışlar

Cloudflare deploy kapsamında desteklenen ana akışlar:

- owner bazlı ürün listesi
- ürün detayları
- kategori yönetimi
- bildirimler
- ayarlar
- manual refresh
- scheduled refresh

`AI Bağlantıları` ekranı menüde kalabilir ancak geçici olarak bilgilendirme modundadır:

- masaüstü connector akışı için vardır
- Cloudflare deploy kapsamında şimdilik aktif kullanılmaz
- ana takip akışını engellemez

OpenAI OAuth / masaüstü connector detayları gerekirse ek rehber için `docs/runbooks/cloudflare-deploy.md` dosyasına bakılabilir.

## 7) Smoke test kontrol listesi

- Pages ana sayfa açılıyor mu?
- `https://<worker-subdomain>.workers.dev/health` çağrısı dönüyor mu?
- Ürün listesi geliyor mu?
- Yeni ürün eklenebiliyor mu?
- Ayarlar kaydediliyor mu?
- Manual refresh run kuyruğa düşüyor mu?

## 8) Günlük çalışma modeli

- Günlük geliştirme lokal ortamda yapılır
- Değişiklikler lokalde test edilir
- Sonra Worker ve Pages yeniden deploy edilir
- Canlı sistem ancak deploy sonrası yeni sürümü görür

## 9) Rollback

- Son çalışan commit'e dön
- API Worker'ı yeniden deploy et
- Web için yeni build/deploy al
- Production D1 verisini silme; yalnızca kodu geri sar


## 10) Time Travel ve geri donus

Bookmark durumunu gor:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel info trendyol-etsy-prod
```

Geri donus uygula:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel restore trendyol-etsy-prod --bookmark=<bookmark>
```

Veri merkezli bir degisiklik veya bootstrap oncesinde mevcut durumu gormek icin:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 info trendyol-etsy-prod
```

## 11) Basari kriterleri

Bu iş tamamlanmış sayılırsa:

- Uygulama farklı bilgisayardan açılabilir
- Bilgisayar kapalıyken veri erişimi sürer
- Ürün ekleme, listeleme ve ayar kaydetme çalışır
- Veriler uzak D1 üzerinde kalıcı tutulur
- Connector kullanılmasa da ana iş akışı çalışır

## 11) Cloudflare notları

- Cloudflare duyurusuna göre Queues, **4 Şubat 2026** itibarıyla Workers Free plan içinde kullanılabiliyor.
- Cron trigger'lar da Workers Free plan kapsamında kullanılabiliyor; ancak Free plan CPU ve tetik limitleri geçerli.
- Bu projede tek bir cron kullanıldığı için planlanan `0 * * * *` tetik yapısı ücretsiz plan sınırlarıyla uyumludur.

## 12) Resmi referanslar

- Cloudflare Wrangler configuration: <https://developers.cloudflare.com/workers/wrangler/configuration/>
- Cloudflare Workers environments: <https://developers.cloudflare.com/workers/wrangler/environments/>
- Cloudflare D1 migrations: <https://developers.cloudflare.com/d1/reference/migrations/>
- Cloudflare Queues Free plan changelog: <https://developers.cloudflare.com/changelog/post/2026-02-04-queues-free-plan/>
- Cloudflare Workers pricing: <https://developers.cloudflare.com/workers/platform/pricing/>
- Cloudflare Workers limits: <https://developers.cloudflare.com/workers/platform/limits/>
- Cloudflare Pages build configuration: <https://developers.cloudflare.com/pages/configuration/build-configuration/>
