# Local Connector Runbook

## Amaç
Yerel AI connector servisini güvenli şekilde çalıştırmak.

## Adımlar
1. `apps/connector/.env.example` dosyasını kopyalayıp `.env` oluşturun.
2. Connector açılışta `apps/connector/.env` dosyasını otomatik yükler.
3. Varsayılan provider `chatgpt-web` olarak gelir.
4. Test veya demo amaçlı `mock` kullanmak istiyorsanız `.env` içinde `CONNECTOR_PROVIDER=mock` ayarlayın.
   - Bu durumda `AI Bağlantıları` ekranı test modu uyarısı gösterir ve `Mock Workspace` gerçek hesap gibi sunulmaz.
5. Servisi başlatın:
   - `npx pnpm --filter @trendyol-etsy/connector run dev`
6. Sağlık kontrolü yapın:
   - `GET http://127.0.0.1:4317/health`
7. Gerçek hesabı UI üzerinden bağlayın (`chatgpt-web` kullanıyorsanız):
   - uygulamada `AI Bağlantıları > OpenAI ile Bağlan` butonunu kullanın.
   - açılan tarayıcıda ChatGPT girişini tamamlayın.
   - bağlantı denemesi tamamlandığında hesap listeye düşer ve aktif hesap olarak işaretlenir.
8. Hesap yönetimini doğrulayın:
   - bağlı hesap listesi `GET http://127.0.0.1:4317/profiles` ile görülebilir.
   - aktif hesap değiştirmek için `POST /profiles/:id/activate`
   - yeniden bağlanmak için `POST /profiles/:id/reconnect`
   - bağlantıyı kaldırmak için `DELETE /profiles/:id`

## Güvenlik Notları
- Oturum sırlarını API'ye göndermeyin.
- `chatgpt-web` sağlayıcısını yalnızca güvenilir yerel makinelerde kullanın.
