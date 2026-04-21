# Central Cloud Persistence Rollout

> Bu runbook, `dropshiping2bizbize` için production D1'i tek resmi canlı veri kaynağı olarak kullanıma alma akışını toplar.
> 21 Nisan 2026 ayrıştırma uygulaması sonrasında hedef hesap, worker, D1, queue, package scope ve port standardı aktif hale gelmiştir.

## 1. Hedef canlı veri modeli

- Canlı kullanımda yalnızca deploy edilmiş Pages + deploy edilmiş Worker + `dropshiping2bizbize-prod` kullanılır.
- `dropshiping2bizbize-prod` tek resmi veri kaynağıdır.
- Lokal D1, `dropshiping2bizbize-dev` ve `wrangler dev` canlı veri kaynağı değildir.
- `VITE_API_BASE_URL` production Pages ortamında hedef worker domainine ayarlanmış olmalıdır.
- Hedef Cloudflare hesabı `berkekockapan3535@gmail.com` / `102eaec87235c67e6d7524d859bd92dd` olmalıdır.

## 2. Rollout öncesi durdurma kriterleri

Aşağıdaki maddelerden biri sağlanmıyorsa rollout'u durdurun:

- `wrangler whoami` hedef hesabı göstermiyorsa
- `apps/api/wrangler.toml` hedef worker/D1/queue isimlerinden sapıyorsa
- `account_id` sabitlenmemişse
- Veri etkileyen bir komut için açık kullanıcı onayı yoksa

## 3. Başlamadan önce kontrol

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 info dropshiping2bizbize-prod
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 time-travel info dropshiping2bizbize-prod
```

Ek olarak:

1. Kritik kayıtları ve owner bazlı örnek verileri not alın.
2. Smoke test yapacak iki cihazı hazır edin.
3. Gerekirse `docs/runbooks/cloudflare-data-safety.md` kontrol listesini tamamlayın.

## 4. Rollout sırasında

1. Production migration uygula:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 migrations apply dropshiping2bizbize-prod --remote
```

2. Production API deploy et.
3. Pages ortam değişkeninde `VITE_API_BASE_URL=https://dropshiping2bizbize-api.berkekockapan3535.workers.dev` olduğunu doğrula.
4. Web uygulamasını deploy et.
5. Health check çalıştır.

## 5. İki cihaz smoke test

1. Cihaz A'da bir owner sayfasını aç.
2. Cihaz A'dan yeni bir kayıt ekle.
3. Cihaz B'de aynı owner listesini aç.
4. En geç 10 saniye içinde güncel kaydın göründüğünü doğrula.
5. Cihaz A'da favori, kategori veya draft değişikliği yap.
6. Cihaz B'de merkezi verinin tekrar çekildiğini doğrula.
7. Bildirim, çöp kutusu ve refresh akışlarının da aynı production D1 üzerinde çalıştığını kontrol et.

## 6. Time Travel ve geri dönüş

Kod hatasında önce son sağlam commit'i yeniden deploy et.

Gerekirse önce bookmark bilgisini kontrol et:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 time-travel info dropshiping2bizbize-prod
```

Ardından yalnızca açık kullanıcı onayı varsa geri dönüş uygula:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 time-travel restore dropshiping2bizbize-prod --bookmark=<bookmark>
```

Geri dönüş sonrası smoke test'i yeniden çalıştır.

## 7. Başarı kriteri

- Production veri yalnızca `dropshiping2bizbize-prod` üzerinden okunup yazılır.
- İki cihazdaki ekranlar merkezi veriyle senkron kalır.
- Doğru hesap dışında hiçbir Cloudflare kaynağına temas edilmez.
- Lokal/dev ortam canlı veri yerine geçmez.
