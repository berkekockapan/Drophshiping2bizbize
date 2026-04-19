# Dropshipingtakip2 Local Cloud Runbook

Bu runbook, `dropshipingtakip2` kopyasını ikinci ve bağımsız Cloudflare Worker + D1 kaynaklarına bağlamak için kullanılır. İlk kurulumda mevcut cloud verisi yalnızca bir kez taşınır; bundan sonra bu sistem ayrı çalışır.

## Hedef kaynaklar

- Worker (prod): `dropshipingtakip2-api`
- Worker (remote dev): `dropshipingtakip2-api-dev`
- D1 (prod): `dropshipingtakip2-prod`
- D1 (remote dev): `dropshipingtakip2-dev`
- Queue (prod): `dropshipingtakip2-refresh`
- Queue (remote dev): `dropshipingtakip2-refresh-dev`
- Pages project: `dropshipingtakip2-web`

## Aktif kaynak kimlikleri

- Production D1 ID: `384c8b3b-2382-47ff-bdae-8a7a8fa82c96`
- Remote dev D1 ID: `5cb5ded7-cbf6-4d14-a307-6bfee2030366`
- Production Worker URL: `https://dropshipingtakip2-api.berkekockapan35.workers.dev`
- Production Pages URL: `https://dropshipingtakip2-web.pages.dev`
- Latest Pages deployment URL: `https://eab3e6c1.dropshipingtakip2-web.pages.dev`
- OpenAI / OAuth secret değerleri: daha sonra ayrı Worker secret yüzeyi ile girilecek

## 1) Cloudflare oturumunu doğrula

```bash
pnpm --filter @trendyol-etsy/api exec wrangler whoami
```

Eğer giriş yoksa önce login ol:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler login
```

## 2) Cloud kaynaklarını oluştur

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 create dropshipingtakip2-prod
pnpm --filter @trendyol-etsy/api exec wrangler d1 create dropshipingtakip2-dev
pnpm --filter @trendyol-etsy/api exec wrangler queues create dropshipingtakip2-refresh
pnpm --filter @trendyol-etsy/api exec wrangler queues create dropshipingtakip2-refresh-dev
```

Komut çıktılarındaki `database_id` değerlerini `apps/api/wrangler.toml` içinde ilgili alanlara yerleştir.

## 3) API worker yapılandırması

`apps/api/wrangler.toml` şu kuralları korumalıdır:

- Top-level Worker adı `dropshipingtakip2-api` olmalı
- Remote dev Worker adı `dropshipingtakip2-api-dev` olmalı
- Production D1 binding'i `dropshipingtakip2-prod` olmalı
- Remote dev D1 binding'i `dropshipingtakip2-dev` olmalı
- Queue producer ve consumer binding'leri hem top-level hem `env.dev` altında açıkça tanımlı olmalı
- Production ve remote dev queue adları farklı olmalı; aksi halde ikinci consumer deploy'u hata verir
- Cron tetikleyicisi saat başı çalışmalı: `0 * * * *`

## 4) Migrasyon ve deploy akışı

Production migration:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply dropshipingtakip2-prod --remote
```

Remote dev migration:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply dropshipingtakip2-dev --remote --env dev
```

Production deploy:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler deploy
```

Remote dev deploy:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler deploy --env dev
```

## 5) Web env bağlantısı

Web uygulaması ikinci Worker’a bağlanacak şekilde ayrı bir env dosyası kullanmalıdır:

```env
VITE_API_BASE_URL=https://dropshipingtakip2-api.berkekockapan35.workers.dev
VITE_API_PROXY_TARGET=http://127.0.0.1:8787
```

Production build için aynı değer `apps/web/.env.production` içinde de sabitlenmiştir.

## 5.1) Pages deploy

Production frontend'i her bilgisayardan erişilebilir yapmak için:

```bash
VITE_API_BASE_URL=https://dropshipingtakip2-api.berkekockapan35.workers.dev pnpm --filter @trendyol-etsy/web build
pnpm exec wrangler pages deploy /Users/berke/dropshipingtakip2/apps/web/dist --project-name dropshipingtakip2-web --branch main --commit-dirty=true --commit-message "Deploy dropshipingtakip2 web"
```

Kalıcı frontend URL'si:

- `https://dropshipingtakip2-web.pages.dev`

## 6) Secret stratejisi

İlk kurulumda entegrasyonlar kapalı tutulur. Bu yüzden:

- Çekirdek ürün takip akışı secret gerektirmeden doğrulanır
- OpenAI / OAuth / connector secret'ları ikinci Worker için daha sonra ayrı ayrı girilir
- Mevcut sistemin secret'ları kopyalanmaz

## 7) Smoke test

1. API health endpoint'ini doğrula.
2. Web ana ekranını aç.
3. Queue tabanlı refresh akışının yeni queue adına bağlandığını kontrol et.
4. Temel CRUD ve ayar akışlarının yeni D1 üzerinde çalıştığını doğrula.

## 8) Güvenlik notu

- Mevcut Worker, D1 veya queue adları bu sistem için yeniden kullanılmamalı.
- `apps/api/wrangler.toml` içindeki D1 ID'leri yalnızca doğrulanmış Cloudflare kaynaklarına işaret etmelidir.
- İlk veri taşımasından sonra bu sistem ile eski sistem arasında sürekli senkron kurulmamalı.
