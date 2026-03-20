# Cloudflare Deploy Runbook

## Ön Koşullar
- Cloudflare hesabı ve Worker + D1 + Queue kaynakları
- Wrangler kimlik doğrulaması (`wrangler login`)
- Queue consumer ve cron trigger tanımlarının `apps/api/wrangler.toml` içinde aktif olması

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
