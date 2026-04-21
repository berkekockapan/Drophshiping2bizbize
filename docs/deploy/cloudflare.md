# Cloudflare Workers + D1 + Pages Deploy Rehberi

> Bu belge, **21 Nisan 2026** itibarıyla `dropshiping2bizbize` için gerçek operasyonel Cloudflare referansını tutar. Kod, konfigürasyon ve deploy yüzeyi hedef hesapla hizalanmıştır.

## 1) Hedef kimlik

- Repo kimliği: `dropshiping2bizbize`
- Hedef Cloudflare hesabı: `berkekockapan3535@gmail.com`
- Hedef `account_id`: `102eaec87235c67e6d7524d859bd92dd`
- Ayrı tutulacak kardeş repo: `dropshiping-win`

## 2) Aktif kaynak isimleri

- Worker (production): `dropshiping2bizbize-api`
- Worker (dev): `dropshiping2bizbize-api-dev`
- D1 (production): `dropshiping2bizbize-prod`
  - `database_id = "aab63623-ff50-4109-b927-e2fff3f45fbc"`
- D1 (dev): `dropshiping2bizbize-dev`
  - `database_id = "ea8b4312-d2f8-47d0-91bd-8b10745c47ff"`
- Queue (production): `dropshiping2bizbize-refresh`
- Queue (dev): `dropshiping2bizbize-refresh-dev`
- Paket scope: `@dropshiping2bizbize/*`
- Yerel port standardı: API `8788`, web dev `5174`, web preview `4175`, connector `4318`

## 3) Aktif deploy uçları

- Production worker: `https://dropshiping2bizbize-api.berkekockapan3535.workers.dev`
- Dev worker: `https://dropshiping2bizbize-api-dev.berkekockapan3535.workers.dev`

Health check beklentisi:

```json
{"ok":true}
```

## 4) Başlamadan önce zorunlu kontroller

1. `wrangler whoami` çıktısında hedef email ve `account_id` göründüğünü doğrulayın.
2. Veri etkileyen bir adım varsa önce `docs/runbooks/cloudflare-data-safety.md` kontrol listesini uygulayın.
3. `dropshiping-win` hesabına ait worker/D1/queue isimlerini bu repo için kullanmayın.
4. Production deploy öncesi `apps/api/wrangler.toml` içindeki `account_id`, D1 ve queue adlarını doğrulayın.

## 5) Çalışan paket filtreleri

- API: `@dropshiping2bizbize/api`
- Web: `@dropshiping2bizbize/web`
- Connector: `@dropshiping2bizbize/connector`

Örnekler:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler whoami
pnpm --filter @dropshiping2bizbize/api exec wrangler deploy
pnpm --filter @dropshiping2bizbize/web build
```

## 6) Cloudflare kaynak oluşturma komutları

Yeni hesap veya sıfır kurulum gerekirse:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 create dropshiping2bizbize-prod
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 create dropshiping2bizbize-dev
pnpm --filter @dropshiping2bizbize/api exec wrangler queues create dropshiping2bizbize-refresh
pnpm --filter @dropshiping2bizbize/api exec wrangler queues create dropshiping2bizbize-refresh-dev
```

## 7) Worker yapılandırma kuralları

`apps/api/wrangler.toml` için aktif beklenti:

- `name = "dropshiping2bizbize-api"`
- `account_id = "102eaec87235c67e6d7524d859bd92dd"`
- top-level D1 = `dropshiping2bizbize-prod`
- top-level queue = `dropshiping2bizbize-refresh`
- `env.dev.name = "dropshiping2bizbize-api-dev"`
- `env.dev` D1 = `dropshiping2bizbize-dev`
- `env.dev` queue = `dropshiping2bizbize-refresh-dev`
- dev cron tetikleyicisi şu an boş bırakılmıştır: `[env.dev.triggers] crons = []`

Son madde, dev deploy sırasında hesap planı kısıtı nedeniyle bilinçli olarak uygulanmıştır.

## 8) D1 migration akışı

Production:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 migrations apply dropshiping2bizbize-prod --remote
```

Dev:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 migrations apply dropshiping2bizbize-dev --remote --env dev
```

## 9) API deploy ve doğrulama

Production deploy:

```bash
pnpm cf:deploy:api
```

Dev deploy:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler deploy --env dev
```

Doğrulama:

```bash
curl https://dropshiping2bizbize-api.berkekockapan3535.workers.dev/health
curl https://dropshiping2bizbize-api-dev.berkekockapan3535.workers.dev/health
```

## 10) Frontend notları

- Production `VITE_API_BASE_URL` production worker alan adına gitmelidir.
- Yerel geliştirme standardı: web `5174`, API `8788`, connector `4318`
- Yerel preview standardı: `4175`
- Web, production ortamında doğrudan Cloudflare Worker'a bağlanır.

## 11) Smoke test kontrol listesi

- `wrangler whoami` doğru hesabı gösteriyor mu?
- Worker health endpoint dönüyor mu?
- Web uygulaması API ile konuşuyor mu?
- Refresh akışı doğru queue adına yazıyor mu?
- Hiçbir adım `dropshiping-win` hesabındaki kaynaklara temas etmiyor mu?

## 12) Rollback ve Time Travel

Kod rollback'i veri rollback'inden önce düşünülür.

Bilgi komutu:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 time-travel info dropshiping2bizbize-prod
```

Geri dönüş komutu:

```bash
pnpm --filter @dropshiping2bizbize/api exec wrangler d1 time-travel restore dropshiping2bizbize-prod --bookmark=<bookmark>
```

> `time-travel restore` veri etkileyebileceği için `docs/runbooks/cloudflare-data-safety.md` ve açık kullanıcı onayı olmadan uygulanmaz.

## 13) Operasyonel referans zinciri

1. `docs/runbooks/cloudflare-data-safety.md`
2. `docs/runbooks/2026-04-21-proje-ayristirma-plani.md`
3. `docs/deploy/cloudflare.md`
4. `docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md`
5. `docs/superpowers/HISTORICAL-NOTE.md`
