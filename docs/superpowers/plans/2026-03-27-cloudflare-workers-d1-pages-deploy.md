# Cloudflare Workers + D1 + Pages Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `apps/web` ve `apps/api` uygulamalarını Cloudflare üzerinde kalıcı olarak yayınlamak; verileri uzak D1 veritabanında tutmak; `apps/connector` parçasını şimdilik devre dışı bırakmak.

**Architecture:** `apps/api` Cloudflare Worker olarak yayınlanacak ve uzak D1 + Queue binding’leri kullanacak. `apps/web` Cloudflare Pages’e statik site olarak deploy edilecek; frontend istekleri doğrudan Worker URL’sine gidecek. Güvenlik gereksinimi şimdilik düşük olduğu için API public kalacak ve CORS basit tutulacak.

**Tech Stack:** Cloudflare Workers, Cloudflare D1, Cloudflare Queues, Cloudflare Pages, Wrangler, Vite, Hono, React

---

## File Structure

### Mevcut dosyalar
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\wrangler.toml` — Worker, D1, Queue ve cron tanımları
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\worker.ts` — fetch/scheduled/queue handler’ları
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\index.ts` — Hono uygulama giriş noktası
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\drizzle\*.sql` — migration dosyaları
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\app\api.ts` — frontend’in tüm API çağrıları
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\vite.config.ts` — lokal proxy ayarı
- `C:\Users\berke\Desktop\Projelerim\dropshiping-win\package.json` — ortak script’ler

### Oluşturulacak / güncellenecek dosyalar
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\app\api.ts`
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\vite.config.ts`
- Create: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\.env.example`
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\index.ts`
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\wrangler.toml`
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\package.json`
- Create: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`

---

### Task 1: Cloudflare kaynaklarını ve ortam ayrımını hazırlama

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\wrangler.toml`
- Create: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`

- [ ] **Step 1: Hedef kaynakları netleştir**

Aşağıdaki kaynaklar tanımlanacak:

```text
Worker: trendyol-etsy-api
D1 (prod): trendyol-etsy-prod
D1 (preview/dev): trendyol-etsy-dev
Queue: trendyol-refresh
Pages project: trendyol-etsy-web
Connector: deploy edilmeyecek
```

- [ ] **Step 2: `wrangler.toml` içinde lokal ve uzak yapılandırmayı ayır**

Eklenecek yapı örneği:

```toml
name = "trendyol-etsy-api"
main = "src/worker.ts"
compatibility_date = "2026-03-20"

[[d1_databases]]
binding = "DB"
database_name = "trendyol-etsy-dev"
database_id = "REPLACE_DEV_DB_ID"

[[queues.producers]]
binding = "REFRESH_QUEUE"
queue = "trendyol-refresh"

[[queues.consumers]]
queue = "trendyol-refresh"
max_batch_size = 25
max_batch_timeout = 30

[env.production]
[[env.production.d1_databases]]
binding = "DB"
database_name = "trendyol-etsy-prod"
database_id = "REPLACE_PROD_DB_ID"
```

- [ ] **Step 3: Kurulum komutlarını dokümana yaz**

Belgelenecek komutlar:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler login
pnpm --filter @trendyol-etsy/api exec wrangler d1 create trendyol-etsy-dev
pnpm --filter @trendyol-etsy/api exec wrangler d1 create trendyol-etsy-prod
pnpm --filter @trendyol-etsy/api exec wrangler queues create trendyol-refresh
```

- [ ] **Step 4: Queue + cron’un ücretsiz planda kullanılabilir olduğunu doğrula ve not düş**

Dokümana kısa not:

```text
API Worker, D1 ve Queue Cloudflare hesabında çalışacak; lokal bilgisayar sadece geliştirme ve deploy için kullanılacak.
```

---

### Task 2: Frontend’i Worker URL’sine bağlama

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\app\api.ts`
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\vite.config.ts`
- Create: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\.env.example`

- [ ] **Step 1: API base URL helper ekle**

`apps/web/src/app/api.ts` içinde tüm `fetchWithTimeout` çağrılarını tek noktadan yönetecek helper tanımlanacak:

```ts
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/+$/, "");

function toApiUrl(path: string) {
  if (!API_BASE_URL) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
```

- [ ] **Step 2: `fetchWithTimeout` çağrılarını helper üzerinden geçir**

Fonksiyonun fetch satırı şu yapıya çevrilecek:

```ts
return await fetch(toApiUrl(input), {
  ...init,
  signal: controller.signal,
});
```

- [ ] **Step 3: Lokal geliştirme davranışını koru**

`VITE_API_BASE_URL` boşken mevcut proxy mantığı çalışmaya devam edecek. `apps/web/.env.example` içine şu örnek eklenecek:

```env
VITE_API_BASE_URL=
VITE_API_PROXY_TARGET=http://127.0.0.1:8787
```

- [ ] **Step 4: Vite config’i yorumlarla netleştir**

`apps/web/vite.config.ts` içinde şu mantık korunacak:

```ts
// Lokal geliştirmede /owners vb. istekleri 127.0.0.1:8787'ye proxy et.
// Production'da Pages tarafında VITE_API_BASE_URL kullanılır.
```

---

### Task 3: API’yi public cross-origin kullanıma hazırlama

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\api\src\index.ts`

- [ ] **Step 1: Basit CORS middleware ekle**

`apps/api/src/index.ts` içine minimum public CORS davranışı eklenecek:

```ts
app.use("*", async (c, next) => {
  c.header("Access-Control-Allow-Origin", "*");
  c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  c.header("Access-Control-Allow-Headers", "Content-Type");

  if (c.req.method === "OPTIONS") {
    return c.body(null, 204);
  }

  await next();
});
```

- [ ] **Step 2: Health endpoint’i uzak doğrulama için kullan**

Deploy sonrası doğrulama için şu istek çalışmalı:

```bash
curl https://<worker-subdomain>.workers.dev/health
```

Beklenen cevap:

```json
{"ok":true}
```

- [ ] **Step 3: Blob/indirme uçlarını CORS ile doğrula**

`downloadProductImage` gibi binary dönen endpoint’lerde ek auth veya credentials kullanılmadığı için `Access-Control-Allow-Origin: *` yeterli olmalı.

---

### Task 4: D1 migration ve veri taşıma akışını standartlaştırma

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`
- Optional Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\package.json`

- [ ] **Step 1: Remote migration komutlarını belirle**

Dokümana eklenecek komutlar:

```bash
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-dev --remote
pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-prod --remote
```

- [ ] **Step 2: Lokal veriyi gerekirse export/import akışına bağla**

Mevcut lokal sqlite dosyasından veri taşımak gerekirse süreç belgelenecek:

```text
1. Lokal tablo içeriklerini export et
2. Remote D1 boş veritabanına migration uygula
3. Gerekli seed/import script’i ile veri aktar
4. Uzak veriyi select sorgularıyla doğrula
```

- [ ] **Step 3: Script kolaylığı ekle**

Kök `package.json` için örnek script’ler:

```json
{
  "cf:deploy:api": "pnpm --filter @trendyol-etsy/api deploy",
  "cf:build:web": "pnpm --filter @trendyol-etsy/web build"
}
```

---

### Task 5: Frontend deploy akışını tamamla

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`
- Optional Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\package.json`

- [ ] **Step 1: Pages build ayarlarını sabitle**

Pages için hedef değerler:

```text
Project root: apps/web
Build command: pnpm build
Build output: dist
Node version: 22.x
Environment variable: VITE_API_BASE_URL=https://<worker-subdomain>.workers.dev
```

- [ ] **Step 2: Local preview ile production farkını belgeye yaz**

```text
Local: Vite proxy ile /owners -> 127.0.0.1:8787
Production: Browser -> VITE_API_BASE_URL -> Cloudflare Worker
```

- [ ] **Step 3: Deploy sonrası smoke test listesi hazırla**

Kontrol listesi:

```text
- Pages ana sayfa açılıyor mu?
- /health çağrısı dönüyor mu?
- Ürün listesi geliyor mu?
- Yeni ürün eklenebiliyor mu?
- Ayarlar kaydediliyor mu?
- Manual refresh run kuyruğa düşüyor mu?
```

---

### Task 6: Connector’süz üretim davranışını doğrulama

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`
- Optional Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\apps\web\src\features\connections\...`

- [ ] **Step 1: Ürün takip akışının connector’den bağımsız çalıştığını doğrula**

Bu akışların deploy kapsamında destekleneceği açıkça yazılacak:

```text
- owner bazlı ürün listesi
- ürün detayları
- kategori yönetimi
- bildirimler
- ayarlar
- manual refresh / scheduled refresh
```

- [ ] **Step 2: Connector ekranı için geçici politika belirle**

İki seçenekten biri uygulanacak:

```text
A) Bağlantı ekranını olduğu gibi bırak ama “şimdilik kullanılmıyor” notu ekle
B) Menüden gizle ve deploy kapsamı dışı bırak
```

Bu proje için öneri: önce A seçeneği; deploy riski düşük kalır.

---

### Task 7: Son doğrulama, rollback ve çalışma modeli

**Files:**
- Modify: `C:\Users\berke\Desktop\Projelerim\dropshiping-win\docs\deploy\cloudflare.md`

- [ ] **Step 1: Geliştirme modeli dokümana ekle**

```text
- Günlük geliştirme lokal ortamda yapılır
- Değişiklikler lokalde test edilir
- Sonra Worker ve Pages yeniden deploy edilir
- Canlı sistem ancak deploy sonrası yeni sürümü görür
```

- [ ] **Step 2: Rollback yöntemini yaz**

```text
- Son çalışan commit’e dön
- API Worker’ı yeniden deploy et
- Web’i yeniden build + Pages deploy et
- Production D1’i silme; yalnızca kodu geri sar
```

- [ ] **Step 3: Başarı kriterlerini kapat**

Tamamlanmış sayılma şartları:

```text
- Uygulama farklı bilgisayardan açılabiliyor
- Bilgisayar kapalıyken veri erişimi devam ediyor
- Ürün ekleme/listeme/ayar kaydetme çalışıyor
- Veriler uzak D1’de kalıcı tutuluyor
- Connector kullanılmasa da ana iş akışı çalışıyor
```

---

## Self-Review

- Bu plan mevcut karar ile uyumlu: Workers + D1 + Pages kullanılacak, connector deploy edilmeyecek.
- Kritik teknik boşluklar kapsandı: frontend API base URL, API CORS, remote D1 migration, Pages deploy, Worker deploy, smoke test.
- Bilinçli kapsam dışı bırakılan konu: auth/güvenlik sertleştirmesi.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-27-cloudflare-workers-d1-pages-deploy.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
