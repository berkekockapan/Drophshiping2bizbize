# Local Cloud Runbook

> **Tarihsel dosya adı notu:** Bu dosyanın adı geçmişten kaldı. Operasyonel içerik artık `dropshiping2bizbize` kimliğini tarif eder; `dropshipingtakip2` referansı filename seviyesinde arşivsel kabul edilmelidir.

Bu runbook, `dropshiping2bizbize` reposunu kendi Cloudflare Worker + D1 + Queue kaynaklarına bağlamak için kullanılır.

## Hedef kimlik

- Cloudflare hesabı: `berkekockapan3535@gmail.com`
- `account_id`: `102eaec87235c67e6d7524d859bd92dd`
- Worker (prod): `dropshiping2bizbize-api`
- Worker (dev): `dropshiping2bizbize-api-dev`
- D1 (prod): `dropshiping2bizbize-prod`
- D1 (dev): `dropshiping2bizbize-dev`
- Queue (prod): `dropshiping2bizbize-refresh`
- Queue (dev): `dropshiping2bizbize-refresh-dev`
- Scope hedefi: `@dropshiping2bizbize/*`
- Port hedefi: API `8788`, web dev `5174`, web preview `4175`, connector `4318`

## Ge�i� notu

21 Nisan 2026 itibarıyla repoda hâlâ legacy isimler, eski scope veya eski portlar bulunabilir. Bu belge hedef standardı anlatır; çalıştırılacak gerçek komutlarda mevcut package adını ve gerçek config değerini doğrulayın.

## 1) Cloudflare oturumunu doğrula

```bash
pnpm --filter <api-package> exec wrangler whoami
```

Beklenen hesap:

- Email: `berkekockapan3535@gmail.com`
- Account ID: `102eaec87235c67e6d7524d859bd92dd`

Giriş yoksa:

```bash
pnpm --filter <api-package> exec wrangler login
```

## 2) Cloud kaynaklarını oluştur

```bash
pnpm --filter <api-package> exec wrangler d1 create dropshiping2bizbize-prod
pnpm --filter <api-package> exec wrangler d1 create dropshiping2bizbize-dev
pnpm --filter <api-package> exec wrangler queues create dropshiping2bizbize-refresh
pnpm --filter <api-package> exec wrangler queues create dropshiping2bizbize-refresh-dev
```

Komut çıktılarındaki `database_id` değerlerini `apps/api/wrangler.toml` içine doğru alanlarla yerleştir.

## 3) API worker yapılandırması

`apps/api/wrangler.toml` hedefte şu kuralları sağlamalıdır:

- Top-level worker adı `dropshiping2bizbize-api`
- Dev worker adı `dropshiping2bizbize-api-dev`
- `account_id = "102eaec87235c67e6d7524d859bd92dd"`
- Production D1 binding'i `dropshiping2bizbize-prod`
- Dev D1 binding'i `dropshiping2bizbize-dev`
- Production queue `dropshiping2bizbize-refresh`
- Dev queue `dropshiping2bizbize-refresh-dev`
- Producer ve consumer binding'leri her iki ortamda açıkça tanımlı olmalı

## 4) Migration ve deploy akışı

Production migration:

```bash
pnpm --filter <api-package> exec wrangler d1 migrations apply dropshiping2bizbize-prod --remote
```

Dev migration:

```bash
pnpm --filter <api-package> exec wrangler d1 migrations apply dropshiping2bizbize-dev --remote --env dev
```

Production deploy:

```bash
pnpm --filter <api-package> exec wrangler deploy
```

Dev deploy:

```bash
pnpm --filter <api-package> exec wrangler deploy --env dev
```

## 5) Web env bağlantısı

Hedef production bağlantısı:

```env
VITE_API_BASE_URL=https://dropshiping2bizbize-api.<worker-subdomain>.workers.dev
```

Hedef local dev bağlantı standardı:

```env
VITE_API_PROXY_TARGET=http://127.0.0.1:8788
```

> Bugün repo içindeki `.env` veya `vite.config.ts` dosyalarında eski portlar görülebilir; bu belge Faz C sonrası hedef standardı ifade eder.

## 6) Secret stratejisi

- Çekirdek ürün takibi akışı önce secret bağımsız doğrulanır.
- OpenAI / OAuth / connector secret'ları sadece bu repo hesabına yazılır.
- `dropshiping-win` veya başka legacy projelerden secret kopyalanmaz.

## 7) Smoke test

1. API health endpoint'ini doğrula.
2. Web ana ekranını aç.
3. Refresh akışının `dropshiping2bizbize-refresh` kuyruğuna yazdığını doğrula.
4. Temel CRUD ve ayar akışlarının `dropshiping2bizbize-prod` üzerinde çalıştığını doğrula.

## 8) Güvenlik notu

- Hedef hesap dışında kaynak kullanma.
- Legacy kaynak adlarını bu repo için yeniden kullanma.
- Veri güvenliği adımları için `docs/runbooks/cloudflare-data-safety.md` kullan.


