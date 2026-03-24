# Local Connector Runbook

## Amaç
Yerel AI connector servisini güvenli şekilde çalıştırmak.

## Adımlar
1. `apps/connector/.env.example` dosyasını kopyalayıp `.env` oluşturun.
2. `.env` içinde uygun provider'ı seçin.
   - `CONNECTOR_PROVIDER=mock` hızlı geliştirme ve test için uygundur.
   - gerçek ChatGPT web oturumu için `CONNECTOR_PROVIDER=chatgpt-web` kullanın.
   - Connector açılışta `apps/connector/.env` dosyasını otomatik yükler.
3. Servisi başlatın:
   - `npx pnpm --filter @trendyol-etsy/connector run dev`
4. Sağlık kontrolü yapın:
   - `GET http://127.0.0.1:4317/health`
   - yanıt artık `activeProfile` ve varsa `connectionAttempt` bilgisini de döner.
5. Gerçek OpenAI / ChatGPT web bağlantısını başlatın:
   - uygulamada `AI Bağlantıları > OpenAI ile Bağlan` aksiyonunu kullanın.
   - açılan tarayıcıda ChatGPT girişini tamamlayın.
   - giriş tamamlandıktan sonra connector `/connections/openai/attempts/:attemptId` üzerinden durumu `completed` olarak raporlar.
6. Hesap yönetimini doğrulayın:
   - bağlı hesap listesi `GET http://127.0.0.1:4317/profiles` ile görülebilir.
   - aktif hesap değiştirmek için `POST /profiles/:id/activate`
   - yeniden bağlanmak için `POST /profiles/:id/reconnect`
   - bağlantıyı kaldırmak için `DELETE /profiles/:id`
7. Kalıcı oturum klasörlerini kontrol edin:
   - profil metadata `CONNECTOR_STATE_DIR/profiles.json`
   - bağlantı denemeleri `CONNECTOR_STATE_DIR/connection-attempts.json`
   - profile özel browser storage `CONNECTOR_STATE_DIR/profiles/<profile-id>/`

## Güvenlik Notları
- Oturum sırlarını API'ye göndermeyin.
- `chatgpt-web` sağlayıcısını yalnızca güvenilir yerel makinelerde kullanın.
- `CONNECTOR_STATE_DIR/profiles/<profile-id>/` altında tutulan browser storage klasörlerini başka makinelere taşımayın.
