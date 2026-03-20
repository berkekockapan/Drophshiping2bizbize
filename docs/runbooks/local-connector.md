# Local Connector Runbook

## Amaç
Yerel AI connector servisini güvenli şekilde çalıştırmak.

## Adımlar
1. `apps/connector/.env.example` dosyasını kopyalayıp `.env` oluşturun.
2. Geliştirme için `CONNECTOR_PROVIDER=mock` kullanın.
3. Servisi başlatın:
   - `npx pnpm --filter @trendyol-etsy/connector run dev`
4. Sağlık kontrolü yapın:
   - `GET http://127.0.0.1:4317/health`

## Güvenlik Notları
- Oturum sırlarını API'ye göndermeyin.
- `chatgpt-web` sağlayıcısını yalnızca güvenilir yerel makinelerde kullanın.
