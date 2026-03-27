# Cloudflare Deploy Runbook

> Güncel Worker + D1 + Pages deploy akışı için önce `docs/deploy/cloudflare.md` dosyasını kullanın. Bu runbook yalnızca Cloudflare üzerindeki OpenAI OAuth / masaüstü connector ayrıntılarını tamamlar.

## Ne zaman gerekli?

Bu dosya yalnızca aşağıdaki durumda gereklidir:

- `AI Bağlantıları` ekranındaki OpenAI OAuth callback akışını Cloudflare Worker üzerinden de çalıştırmak istiyorsanız

Ürün takibi, kategori, ayarlar, bildirimler ve refresh akışları için tek başına gerekli değildir.

## OpenAI OAuth konfigürasyonu

1. OpenAI Dashboard'da bu proje için bir OAuth uygulaması oluşturun.
2. Callback / redirect URL olarak şunu ekleyin:
   - `https://<worker-domain>/ai-profiles/openai/callback`
3. Worker secret değerlerini tanımlayın:
   - `OPENAI_OAUTH_CLIENT_ID`
   - `OPENAI_OAUTH_CLIENT_SECRET` (uygulama tipine göre gerekliyse)
   - `OPENAI_OAUTH_REDIRECT_URI`
   - `OPENAI_OAUTH_ENCRYPTION_KEY`

Production Worker için örnek:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_CLIENT_ID
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_CLIENT_SECRET
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_REDIRECT_URI
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_ENCRYPTION_KEY
```

Dev Worker (`--env dev`) için örnek:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_CLIENT_ID --env dev
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_CLIENT_SECRET --env dev
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_REDIRECT_URI --env dev
pnpm --filter @trendyol-etsy/api exec wrangler secret put OPENAI_OAUTH_ENCRYPTION_KEY --env dev
```

## Kritik not

- `~/.codex/auth.json` içindeki `client_id` bu proje için kullanılmamalıdır.
- Bu değer Codex istemcisine aittir ve custom redirect ile `unknown_error` üretebilir.
- Deploy, migration, smoke test ve rollback adımlarının canonical kaynağı `docs/deploy/cloudflare.md` dosyasıdır.
