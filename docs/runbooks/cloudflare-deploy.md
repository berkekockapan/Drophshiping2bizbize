# Cloudflare Deploy Runbook

## Ön Koşullar
- Cloudflare hesabı ve Worker + D1 + Queue kaynakları
- Wrangler kimlik doğrulaması (`wrangler login`)

## Deploy Akışı
1. Dry run:
   - `npx pnpm --filter @trendyol-etsy/api deploy --dry-run`
2. Gerçek deploy:
   - `npx pnpm --filter @trendyol-etsy/api deploy`
3. Sağlık kontrolü:
   - `GET /health`
4. Kritik rotaları doğrulayın:
   - `/tracking/products`
   - `/drafts/:productId`
   - `/ai-profiles`

## Rollback
- Son bilinen stabil commit'e dönüp tekrar deploy edin.
- Sorun giderilene kadar scheduler tetiklerini geçici kapatın.