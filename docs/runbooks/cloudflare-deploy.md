# Cloudflare Deploy Runbook

## Ön Koşullar
- Cloudflare hesabı ve Worker + D1 + Queue kaynakları
- Wrangler kimlik doğrulaması (`wrangler login`)
- Queue consumer ve cron trigger tanımlarının `apps/api/wrangler.toml` içinde aktif olması
- OpenAI tarafında bu proje için oluşturulmuş OAuth uygulaması (`client_id`, opsiyonel `client_secret`, kayıtlı callback URL)

## OpenAI OAuth Konfigürasyonu (Cloudflare)
1. OpenAI Dashboard'da proje için bir OAuth uygulaması oluşturun.
2. Uygulamanın callback/redirect URL alanına şu adresi ekleyin:
   - `https://<worker-domain>/ai-profiles/openai/callback`
3. Aşağıdaki secret/variable değerlerini Worker'a tanımlayın:
   - `OPENAI_OAUTH_CLIENT_ID`
   - `OPENAI_OAUTH_CLIENT_SECRET` (uygulama tipine göre gerekliyse)
   - `OPENAI_OAUTH_REDIRECT_URI`
   - `OPENAI_OAUTH_ENCRYPTION_KEY`
4. Örnek komutlar:
   - `npx wrangler secret put OPENAI_OAUTH_CLIENT_ID --config apps/api/wrangler.toml`
   - `npx wrangler secret put OPENAI_OAUTH_CLIENT_SECRET --config apps/api/wrangler.toml`
   - `npx wrangler secret put OPENAI_OAUTH_REDIRECT_URI --config apps/api/wrangler.toml`
   - `npx wrangler secret put OPENAI_OAUTH_ENCRYPTION_KEY --config apps/api/wrangler.toml`
5. Çok kritik not:
   - `~/.codex/auth.json` dosyasındaki `client_id` bu proje için kullanılmamalı. Bu değer Codex istemcisine aittir ve custom redirect ile `unknown_error` üretebilir.

## Deploy Akışı
1. Dry run:
   - `npx pnpm --filter @trendyol-etsy/api run deploy --dry-run`
2. Gerçek deploy:
   - `npx pnpm --filter @trendyol-etsy/api run deploy`
3. Sağlık kontrolü:
   - `GET /health`
4. Kritik rotaları doğrulayın:
   - `/tracking/products`
   - `/drafts/:productId`
   - `/ai-profiles`
5. Scheduler/queue doğrulaması:
   - Cron tetiklerinin Worker üzerinde göründüğünü kontrol edin.
   - `trendyol-refresh` queue consumer'ın bağlı olduğunu doğrulayın.

## Rollback
- Son bilinen stabil commit'e dönüp tekrar deploy edin.
- Sorun giderilene kadar scheduler tetiklerini geçici kapatın.
