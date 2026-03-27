# Owner-Scoped Products Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `berke` ve `kaan` icin birbirine karismayan owner-scoped urun listeleri, detay/bildirim/cop kutusu izolasyonu ve soft-delete restore/hard-delete akislarini teslim etmek.

**Architecture:** Ortak owner contract'i `packages/shared` altinda tanimlanacak; D1 semasi ve repository katmani `owner_key` + `deleted_at` farkindaligiyla calisacak; Hono route'lari `/owners/:ownerKey/...` altina tasinacak. React router ve shell, secili owner baglamini URL ve son-secim hafizasi uzerinden koruyacak; tracking, detay, bildirim, SEO ve cop kutusu sorgulari yalnizca secili owner verisini okuyacak.

**Tech Stack:** TypeScript, Hono, Cloudflare Workers/D1, React, React Router, TanStack Query, Tailwind CSS, Vitest, Playwright

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-27-owner-scoped-products-shared-ai-providers-design.md`
- Bu spec iki bagimsiz alt sistem iceriyor; bu plan sadece owner-scoped products akislarini kapsar. `AI Baglantilari` icin ayri plan: `docs/superpowers/plans/2026-03-27-shared-ai-provider-configs.md`
- Bu iterasyonda ayri bir `owners` tablosu yerine ortak `ownerKeySchema` + SQL `check (...)` kisiti kullan. Ihtiyac sabit iki owner ile sinirli oldugu icin bu, seeded referans tablosundan daha kucuk ve daha dusuk riskli.
- `productId` global unique kalmaya devam etsin; fakat product bazli her okuma owner filtresiyle yapilsin. `owner_key` uyusmuyorsa `404` don.
- Soft delete icin `products.deleted_at` ve `products.deleted_reason` kullan; aktif duplicate engeli `unique(owner_key, trendyol_url) where deleted_at is null` ile saglansin.
- Zamanlanmis refresh tum owner'lari dolasabilir; ancak sadece `deleted_at is null` olan aktif urunleri kuyruga alsin.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### Shared owner contract and API surface
- Create: `packages/shared/src/contracts/owners.ts` - `ownerKeySchema`, label sozlugu ve owner yardimcilari
- Modify: `packages/shared/src/contracts/tracking.ts` - owner-scoped route payloadlari, trash response tipleri, detail/list owner alanlari
- Modify: `packages/shared/src/index.ts` - yeni owner contract export'lari

### API schema and persistence
- Create: `apps/api/drizzle/0007_owner_scoped_products.sql` - `products.owner_key`, `deleted_at`, `deleted_reason`, owner-scoped unique index, `notifications.owner_key`, `manual_refresh_runs.owner_key`
- Modify: `apps/api/src/db/schema.ts` - yeni kolonlar ve indeksler
- Modify: `apps/api/src/db/repositories/productsRepo.ts` - owner-aware list/detail/trash/restore/hard-delete sorgulari
- Modify: `apps/api/src/db/repositories/notificationsRepo.ts` - owner-scoped bildirim yazma/okuma
- Modify: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts` - owner-scoped refresh run kayitlari
- Modify: `apps/api/src/db/repositories/historyRepo.ts` - hard delete kapsaminda temizlenecek urun-gecmis sorgulari ayni owner contract'iyla uyumlu kalsin
- Modify: `apps/api/src/db/repositories/refreshAuditRepo.ts` - hard delete sirasinda audit/content history temizligi icin owner-safe delete yardimcilari
- Modify: `apps/api/tests/integration/schema.test.ts` - yeni kolon/index beklentileri

### API product/trash routes and services
- Modify: `apps/api/src/index.ts` - top-level owner route mount'lari
- Create: `apps/api/src/routes/owners.ts` - `ownerKey` dogrulama ve owner-scoped endpoint grubu
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts` - owner parametresi ve trash duplicate davranisi
- Modify: `apps/api/src/modules/tracking/deleteTrackedProduct.ts` - kalici silme yerine soft delete
- Create: `apps/api/src/modules/tracking/restoreTrackedProduct.ts` - cop kutusundan geri yukleme
- Create: `apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts` - ikinci silmede fiziksel temizleme
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts` - owner ve trash ayri view'lari
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts` - owner mismatch 404 ve owner alanlari
- Modify: `apps/api/src/modules/tracking/setTrackedProductFavorite.ts` - owner filtresi zorunlulugu
- Modify: `apps/api/src/modules/tracking/startManualRefreshRun.ts` - owner-scoped run baslatma
- Modify: `apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts` - ayni owner icinde retry
- Modify: `apps/api/src/modules/tracking/buildManualRefreshRunView.ts` - aktif/manual run owner filtresi
- Modify: `apps/api/src/modules/tracking/processManualRefreshRun.ts` - owner sahibi disina cikmayan run isleme
- Modify: `apps/api/src/modules/sync/applyProductRefresh.ts` - soft-deleted product refresh edilmesin
- Modify: `apps/api/src/modules/scheduler/enqueueTrackedProducts.ts` - sadece aktif owner kayitlari kuyruga girsin
- Modify: `apps/api/src/routes/products.ts` - detail/image/etsy-prep endpoint'lerini owner-scoped path altinda kullanilacak sekilde ayarla
- Modify: `apps/api/src/routes/drafts.ts` - draft endpoint'lerini owner-scoped urun path'i ile calistir
- Modify: `apps/api/tests/integration/trackingActions.test.ts` - duplicate, trash, restore, hard delete, owner mismatch
- Modify: `apps/api/tests/integration/listViews.test.ts` - owner list/detail/notifications/trash izolasyonu
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts` - owner-scoped manual refresh run davranisi
- Modify: `apps/api/tests/integration/draftFlows.test.ts` - owner mismatch oldugunda draft/etsy-prep `404`

### Web owner-aware routing and pages
- Modify: `apps/web/src/app/router.tsx` - owner-scoped route deseni ve root redirect
- Modify: `apps/web/src/app/shell/AppShell.tsx` - `Urunler > Berke / Kaan` nav, owner-aware `Bildirimler` ve `Cop Kutusu`
- Modify: `apps/web/src/app/api.ts` - owner parametreli fetch helper'lari ve trash endpoint'leri
- Create: `apps/web/src/features/shared/lib/ownerRouteState.ts` - son owner secimini saklama/okuma
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx` - owner parametreli liste/add/favorite/delete/refresh
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx` - owner route ve owner-aware query key assert'leri
- Create: `apps/web/src/features/tracking/routes/TrashPage.tsx` - restore + hard delete UI
- Create: `apps/web/src/features/tracking/routes/TrashPage.test.tsx` - cop kutusu akislari
- Modify: `apps/web/src/features/tracking/components/AddLinkForm.tsx` - owner baglamiyla ekleme ve duplicate-in-trash mesaji
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx` - owner-aware detail linkleri ve soft-delete dili
- Modify: `apps/web/src/features/tracking/components/BulkRefreshControl.tsx` - owner-aware refresh endpoint'leri
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx` - owner-aware detail ve prep gecisi
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - owner route deseni ve back linkleri
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx` - owner back linkleri ve owner rozeti
- Modify: `apps/web/src/features/notifications/routes/NotificationsPage.tsx` - owner-scoped bildirim sorgusu
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx` - owner-scoped draft endpoint'leri

### Regression docs and e2e
- Create: `docs/superpowers/runbooks/2026-03-27-owner-scoped-local-d1-reset.md` - local D1 backup/reset/migration adimlari
- Modify: `apps/web/tests/e2e/tracking.spec.ts` - owner nav, trash, restore akisi

## Task 1: Add the shared owner contract and owner-scoped schema metadata

**Files:**
- Create: `packages/shared/src/contracts/owners.ts`
- Modify: `packages/shared/src/index.ts`
- Create: `apps/api/drizzle/0007_owner_scoped_products.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`

- [ ] **Step 1: Extend the schema integration test with owner/trash expectations**

```ts
const productsColumns = database.prepare("pragma table_info(products)").all() as Array<{ name: string; dflt_value: string | null }>;
const notificationsColumns = database.prepare("pragma table_info(notifications)").all() as Array<{ name: string; dflt_value: string | null }>;
const manualRunColumns = database.prepare("pragma table_info(manual_refresh_runs)").all() as Array<{ name: string; dflt_value: string | null }>;
const productIndexes = database.prepare("pragma index_list(products)").all() as Array<{ name: string; partial: number }>;

expect(productsColumns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" }),
    expect.objectContaining({ name: "deleted_at" }),
    expect.objectContaining({ name: "deleted_reason" }),
  ]),
);
expect(notificationsColumns).toEqual(
  expect.arrayContaining([expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" })]),
);
expect(manualRunColumns).toEqual(
  expect.arrayContaining([expect.objectContaining({ name: "owner_key", dflt_value: "'berke'" })]),
);
expect(productIndexes).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "products_owner_trendyol_active_unique", partial: 1 }),
    expect.objectContaining({ name: "products_owner_deleted_created_idx" }),
  ]),
);
```

- [ ] **Step 2: Run the schema test to confirm the new columns and indexes are still missing**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts`
Expected: FAIL with missing `owner_key`, `deleted_at`, or `products_owner_trendyol_active_unique`

- [ ] **Step 3: Add the owner contract plus the D1 migration and Drizzle schema entries**

```ts
// packages/shared/src/contracts/owners.ts
import { z } from "zod";

export const ownerKeySchema = z.enum(["berke", "kaan"]);
export type OwnerKey = z.infer<typeof ownerKeySchema>;

export const ownerOptions = [
  { key: "berke", label: "Berke" },
  { key: "kaan", label: "Kaan" },
] as const satisfies ReadonlyArray<{ key: OwnerKey; label: string }>;

export function getOwnerLabel(ownerKey: OwnerKey) {
  return ownerOptions.find((item) => item.key === ownerKey)?.label ?? ownerKey;
}
```

```sql
-- apps/api/drizzle/0007_owner_scoped_products.sql
alter table products add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
alter table products add column deleted_at integer;
alter table products add column deleted_reason text;

drop index if exists products_trendyol_url_unique;
create unique index products_owner_trendyol_active_unique
  on products(owner_key, trendyol_url)
  where deleted_at is null;
create index products_owner_deleted_created_idx
  on products(owner_key, deleted_at, created_at);

alter table notifications add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
update notifications
set owner_key = coalesce((select owner_key from products where products.id = notifications.product_id), 'berke');
create index notifications_owner_created_idx on notifications(owner_key, created_at);

alter table manual_refresh_runs add column owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan'));
create index manual_refresh_runs_owner_status_created_idx on manual_refresh_runs(owner_key, status, created_at);
```

```ts
// apps/api/src/db/schema.ts
ownerKey: text("owner_key").notNull().default("berke"),
deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
deletedReason: text("deleted_reason"),

ownerTrendyolActiveUnique: uniqueIndex("products_owner_trendyol_active_unique")
  .on(table.ownerKey, table.trendyolUrl)
  .where(sql`${table.deletedAt} is null`),
ownerDeletedCreatedIdx: index("products_owner_deleted_created_idx").on(table.ownerKey, table.deletedAt, table.createdAt),
```

- [ ] **Step 4: Re-run the schema test and typecheck after the migration/schema changes**

Run: `pnpm --filter @trendyol-etsy/api test -- schema.test.ts && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS, and `schema.test.ts` shows the new owner/trash metadata

- [ ] **Step 5: Commit the shared owner contract and migration**

```bash
git add packages/shared/src/contracts/owners.ts packages/shared/src/index.ts apps/api/drizzle/0007_owner_scoped_products.sql apps/api/src/db/schema.ts apps/api/tests/integration/schema.test.ts
git commit -m "feat: add owner scoped product schema"
```

## Task 2: Make repositories and tracking services owner-aware with soft delete and restore

**Files:**
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/db/repositories/notificationsRepo.ts`
- Modify: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts`
- Modify: `apps/api/src/db/repositories/refreshAuditRepo.ts`
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/deleteTrackedProduct.ts`
- Create: `apps/api/src/modules/tracking/restoreTrackedProduct.ts`
- Create: `apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts`
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Modify: `apps/api/src/modules/tracking/setTrackedProductFavorite.ts`
- Modify: `apps/api/src/modules/tracking/startManualRefreshRun.ts`
- Modify: `apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts`
- Modify: `apps/api/src/modules/tracking/buildManualRefreshRunView.ts`
- Modify: `apps/api/src/modules/tracking/processManualRefreshRun.ts`
- Modify: `apps/api/src/modules/sync/applyProductRefresh.ts`
- Modify: `apps/api/src/modules/scheduler/enqueueTrackedProducts.ts`
- Modify: `apps/api/tests/integration/trackingActions.test.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts`

- [ ] **Step 1: Add owner/trash integration tests for duplicate isolation, restore, and hard delete**

```ts
const berke = await createTrackedProduct(
  env,
  { ownerKey: "berke", trendyolUrl: seedUrl },
  { fetchImpl, now: new Date("2026-03-27T08:00:00.000Z") },
);
const kaan = await createTrackedProduct(
  env,
  { ownerKey: "kaan", trendyolUrl: seedUrl },
  { fetchImpl, now: new Date("2026-03-27T08:01:00.000Z") },
);

await deleteTrackedProduct(env.DB, "berke", berke.product.id, new Date("2026-03-27T09:00:00.000Z"));

expect(await createProductsRepo(env.DB).listTrackingCards("berke")).toHaveLength(0);
expect(await createProductsRepo(env.DB).listTrashCards("berke")).toEqual([
  expect.objectContaining({ id: berke.product.id, ownerKey: "berke" }),
]);
expect(await createProductsRepo(env.DB).listTrackingCards("kaan")).toEqual([
  expect.objectContaining({ id: kaan.product.id, ownerKey: "kaan" }),
]);

await restoreTrackedProduct(env.DB, "berke", berke.product.id, new Date("2026-03-27T09:05:00.000Z"));
await permanentlyDeleteTrackedProduct(env.DB, "berke", berke.product.id);

expect(await createProductsRepo(env.DB).getProductDetail("berke", berke.product.id)).toBeNull();
expect(await createProductsRepo(env.DB).getProductDetail("kaan", kaan.product.id)).not.toBeNull();
```

- [ ] **Step 2: Run the focused integration tests to capture the missing owner-aware service behavior**

Run: `pnpm --filter @trendyol-etsy/api test -- trackingActions.test.ts listViews.test.ts manualRefreshRuns.test.ts`
Expected: FAIL because `createTrackedProduct` has no `ownerKey`, delete is still hard delete, and list/detail queries are not owner-scoped

- [ ] **Step 3: Implement owner-aware repository methods and soft-delete services**

```ts
// apps/api/src/modules/tracking/createTrackedProduct.ts
export interface CreateTrackedProductInput {
  ownerKey: OwnerKey;
  trendyolUrl: string;
}

export class DuplicateProductError extends Error {
  constructor(
    public readonly normalizedUrl: string,
    public readonly reason: "ACTIVE_DUPLICATE" | "TRASH_DUPLICATE",
    public readonly trashedProductId: string | null,
  ) {
    super(
      reason === "TRASH_DUPLICATE"
        ? `Tracked product already exists in trash for ${normalizedUrl}`
        : `Tracked product already exists for ${normalizedUrl}`,
    );
  }
}

const existing = await env.DB
  .prepare(
    `select id, deleted_at as deletedAt
     from products
     where owner_key = ? and trendyol_url = ?
     limit 1`,
  )
  .bind(input.ownerKey, normalizedUrl)
  .first<{ id: string; deletedAt: number | null }>();

if (existing?.deletedAt == null) {
  throw new DuplicateProductError(normalizedUrl, "ACTIVE_DUPLICATE", null);
}
if (existing?.deletedAt != null) {
  throw new DuplicateProductError(normalizedUrl, "TRASH_DUPLICATE", existing.id);
}
```

```ts
// apps/api/src/db/repositories/productsRepo.ts
async listTrackingCards(ownerKey: OwnerKey, filters = {}) {
  return db
    .prepare(
      `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.title, p.brand,
              p.status, p.parse_status as parseStatus, p.images_raw as imagesRaw, p.is_favorite as isFavorite,
              p.deleted_at as deletedAt,
              pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
              pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
              pcs.last_checked_at as lastCheckedAt
       from products p
       left join product_current_state pcs on pcs.product_id = p.id
       where p.owner_key = ? and p.deleted_at is null
       order by coalesce(pcs.last_checked_at, p.updated_at) desc, p.created_at desc`,
    )
    .bind(ownerKey)
    .all();
}

async listTrashCards(ownerKey: OwnerKey) {
  return db
    .prepare(
      `select id, owner_key as ownerKey, trendyol_url as trendyolUrl, title, brand, deleted_at as deletedAt
       from products
       where owner_key = ? and deleted_at is not null
       order by deleted_at desc, created_at desc`,
    )
    .bind(ownerKey)
    .all();
}
```

```ts
// apps/api/src/modules/tracking/deleteTrackedProduct.ts
export async function deleteTrackedProduct(db: D1Database, ownerKey: OwnerKey, productId: string, now = new Date()) {
  const existing = await db
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();

  if (!existing) {
    return false;
  }

  await db
    .prepare("update products set deleted_at = ?, deleted_reason = ?, updated_at = ? where id = ?")
    .bind(now.getTime(), "user_deleted", now.getTime(), productId)
    .run();

  return true;
}
```

```ts
// apps/api/src/modules/tracking/restoreTrackedProduct.ts
export async function restoreTrackedProduct(db: D1Database, ownerKey: OwnerKey, productId: string, now = new Date()) {
  const existing = await db
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is not null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();

  if (!existing) {
    return false;
  }

  await db
    .prepare("update products set deleted_at = null, deleted_reason = null, updated_at = ? where id = ?")
    .bind(now.getTime(), productId)
    .run();

  return true;
}
```

```ts
// apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts
const deleteStatements = [
  ["product_variants", "product_id"],
  ["product_current_state", "product_id"],
  ["price_history", "product_id"],
  ["stock_history", "product_id"],
  ["product_refresh_audits", "product_id"],
  ["product_content_history", "product_id"],
  ["notifications", "product_id"],
  ["etsy_drafts", "product_id"],
] as const;
```

- [ ] **Step 4: Re-run the targeted API tests and the API typecheck**

Run: `pnpm --filter @trendyol-etsy/api test -- trackingActions.test.ts listViews.test.ts manualRefreshRuns.test.ts && pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS, including restore/hard-delete coverage and owner-specific manual refresh counts

- [ ] **Step 5: Commit the owner-aware persistence and service layer**

```bash
git add apps/api/src/db/repositories/productsRepo.ts apps/api/src/db/repositories/notificationsRepo.ts apps/api/src/db/repositories/manualRefreshRunsRepo.ts apps/api/src/db/repositories/refreshAuditRepo.ts apps/api/src/modules/tracking/createTrackedProduct.ts apps/api/src/modules/tracking/deleteTrackedProduct.ts apps/api/src/modules/tracking/restoreTrackedProduct.ts apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts apps/api/src/modules/tracking/buildTrackingListView.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/src/modules/tracking/setTrackedProductFavorite.ts apps/api/src/modules/tracking/startManualRefreshRun.ts apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts apps/api/src/modules/tracking/buildManualRefreshRunView.ts apps/api/src/modules/tracking/processManualRefreshRun.ts apps/api/src/modules/sync/applyProductRefresh.ts apps/api/src/modules/scheduler/enqueueTrackedProducts.ts apps/api/tests/integration/trackingActions.test.ts apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/manualRefreshRuns.test.ts
git commit -m "feat: add owner aware tracking services"
```

## Task 3: Expose owner-scoped API routes for products, notifications, drafts, and trash

**Files:**
- Modify: `packages/shared/src/contracts/tracking.ts`
- Modify: `apps/api/src/index.ts`
- Create: `apps/api/src/routes/owners.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/api/src/routes/drafts.ts`
- Modify: `apps/api/tests/integration/trackingActions.test.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`

- [ ] **Step 1: Add route-level tests for owner mismatch, trash endpoints, and owner-scoped draft/detail URLs**

```ts
const detail404 = await app.request(
  `http://localhost/owners/kaan/products/${berkeProduct.product.id}`,
  undefined,
  env,
);
const trashResponse = await app.request("http://localhost/owners/berke/trash", undefined, env);
const restoreResponse = await app.request(
  `http://localhost/owners/berke/trash/products/${berkeProduct.product.id}/restore`,
  { method: "POST" },
  env,
);
const hardDeleteResponse = await app.request(
  `http://localhost/owners/berke/trash/products/${berkeProduct.product.id}`,
  { method: "DELETE" },
  env,
);
const draft404 = await app.request(
  `http://localhost/owners/kaan/products/${berkeProduct.product.id}/draft`,
  undefined,
  env,
);

expect(detail404.status).toBe(404);
expect(trashResponse.status).toBe(200);
expect(restoreResponse.status).toBe(200);
expect(hardDeleteResponse.status).toBe(204);
expect(draft404.status).toBe(404);
```

- [ ] **Step 2: Run route-focused integration tests before wiring the new owner router**

Run: `pnpm --filter @trendyol-etsy/api test -- trackingActions.test.ts listViews.test.ts draftFlows.test.ts`
Expected: FAIL because `/owners/:ownerKey/...` routes are not mounted and the old global endpoints still return data without owner validation

- [ ] **Step 3: Mount a dedicated owner router and move product-related endpoints under it**

```ts
// apps/api/src/index.ts
export function createApp(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/owners/:ownerKey", createOwnersRouter(options));
  app.route("/ai-profiles", createAiProfilesRouter());
  app.route("/settings", createSettingsRouter());
  return app;
}
```

```ts
// apps/api/src/routes/owners.ts
function parseOwnerKey(value: string | undefined) {
  const parsed = ownerKeySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

app.get("/products", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) return c.json({ error: "Kayit bulunamadi" }, 404);

  const favoriteQuery = c.req.query("favorite");
  const favorite = favoriteQuery === "true" ? true : favoriteQuery === "false" ? false : undefined;

  return c.json(await buildTrackingListView(c.env.DB, ownerKey, { favorite }));
});

app.post("/products", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) return c.json({ error: "Kayit bulunamadi" }, 404);

  const body = await c.req.json<{ trendyolUrl?: string }>().catch(() => null);
  if (!body?.trendyolUrl) {
    return c.json({ error: "trendyolUrl is required" }, 400);
  }

  try {
    return c.json(await createTrackedProduct(c.env, { ownerKey, trendyolUrl: body.trendyolUrl }, options), 201);
  } catch (error) {
    if (error instanceof DuplicateProductError && error.reason === "TRASH_DUPLICATE") {
      return c.json(
        {
          error: "Bu link cop kutusunda. Yeni kayit acmak yerine geri yukleyin.",
          code: "PRODUCT_IN_TRASH",
          trashedProductId: error.trashedProductId,
        },
        409,
      );
    }
    throw error;
  }
});

app.get("/trash", async (c) => c.json(await buildTrashListView(c.env.DB, ownerKey)));
app.post("/trash/products/:productId/restore", async (c) => {
  const restored = await restoreTrackedProduct(c.env.DB, ownerKey, c.req.param("productId"));
  if (!restored) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  return c.json({ ok: true });
});
app.delete("/trash/products/:productId", async (c) => {
  const deleted = await permanentlyDeleteTrackedProduct(c.env.DB, ownerKey, c.req.param("productId"));
  if (!deleted) {
    return c.json({ error: "Kayit bulunamadi" }, 404);
  }

  return c.body(null, 204);
});
app.get("/notifications", async (c) => c.json({ items: await createNotificationsRepo(c.env.DB).listNotifications(ownerKey) }));
app.route("/", createProductsRouter());
app.route("/", createDraftsRouter());
```

```ts
// packages/shared/src/contracts/tracking.ts
export const ownerScopedParamsSchema = z.object({ ownerKey: ownerKeySchema, productId: z.string().min(1) });

export const trashListItemSchema = trackingListItemSchema.extend({
  ownerKey: ownerKeySchema,
  deletedAt: z.number().int().nonnegative(),
});

export const trashListResponseSchema = z.object({
  items: z.array(trashListItemSchema),
  total: z.number().int().nonnegative(),
});
```

- [ ] **Step 4: Re-run route integration tests and the full API suite impacted by owner-scoped paths**

Run: `pnpm --filter @trendyol-etsy/api test -- trackingActions.test.ts listViews.test.ts draftFlows.test.ts manualRefreshRuns.test.ts`
Expected: PASS, including `404` on owner mismatch and working `/owners/:ownerKey/trash` restore/hard-delete endpoints

- [ ] **Step 5: Commit the owner-scoped API surface**

```bash
git add packages/shared/src/contracts/tracking.ts apps/api/src/index.ts apps/api/src/routes/owners.ts apps/api/src/routes/products.ts apps/api/src/routes/drafts.ts apps/api/tests/integration/trackingActions.test.ts apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/draftFlows.test.ts
git commit -m "feat: add owner scoped product routes"
```

## Task 4: Update the web router, shell, tracking pages, detail pages, and trash UI for owner scope

**Files:**
- Modify: `apps/web/src/app/router.tsx`
- Modify: `apps/web/src/app/shell/AppShell.tsx`
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/shared/lib/ownerRouteState.ts`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`
- Create: `apps/web/src/features/tracking/routes/TrashPage.tsx`
- Create: `apps/web/src/features/tracking/routes/TrashPage.test.tsx`
- Modify: `apps/web/src/features/tracking/components/AddLinkForm.tsx`
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx`
- Modify: `apps/web/src/features/tracking/components/BulkRefreshControl.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx`
- Modify: `apps/web/src/features/notifications/routes/NotificationsPage.tsx`
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`

- [ ] **Step 1: Add web tests for owner navigation, owner-aware fetches, and the trash page**

```tsx
renderWithProviders(<AppRouter />, { route: "/owners/berke/products" });
expect(await screen.findByRole("link", { name: /berke/i })).toHaveAttribute("href", "/owners/berke/products");
expect(screen.getByRole("link", { name: /kaan/i })).toHaveAttribute("href", "/owners/kaan/products");
expect(screen.getByRole("link", { name: /cop kutusu/i })).toHaveAttribute("href", "/owners/berke/trash");

renderWithProviders(<TrashPage />, {
  route: "/owners/berke/trash",
  path: "/owners/:ownerKey/trash",
});
expect(await screen.findByText(/cop kutusu/i)).toBeInTheDocument();
expect(globalThis.fetch).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/trash"), expect.anything());
```

- [ ] **Step 2: Run the web unit tests before moving the router and API helpers to owner-scoped URLs**

Run: `pnpm --filter @trendyol-etsy/web test -- TrackingCenterPage.test.tsx ProductDetailPage.test.tsx TrashPage.test.tsx`
Expected: FAIL because the router still points to `/`, `/products/:productId`, and there is no trash page or owner param in fetch calls

- [ ] **Step 3: Move the web app to owner-scoped routes and add the trash page**

```tsx
// apps/web/src/app/router.tsx
<Routes>
  <Route path="/" element={<Navigate to={getDefaultOwnerPath()} replace />} />
  <Route path="/owners/:ownerKey/products" element={<TrackingCenterPage />} />
  <Route path="/owners/:ownerKey/products/:productId" element={<ProductDetailPage />} />
  <Route path="/owners/:ownerKey/products/:productId/seo" element={<SeoEditorPage />} />
  <Route path="/owners/:ownerKey/notifications" element={<NotificationsPage />} />
  <Route path="/owners/:ownerKey/trash" element={<TrashPage />} />
  <Route path="/connections" element={<AIConnectionsPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Routes>
```

```tsx
// apps/web/src/app/shell/AppShell.tsx
const ownerItems = ownerOptions.map((owner) => ({
  ...owner,
  productsHref: `/owners/${owner.key}/products`,
  notificationsHref: `/owners/${owner.key}/notifications`,
  trashHref: `/owners/${owner.key}/trash`,
}));
```

```ts
// apps/web/src/app/api.ts
export async function fetchTrackingView(ownerKey: OwnerKey, options: { favoriteOnly?: boolean } = {}) {
  const search = new URLSearchParams();
  if (options.favoriteOnly) search.set("favorite", "true");
  const suffix = search.toString() ? `?${search.toString()}` : "";
  return parseJson<TrackingViewResponse>(await fetchWithTimeout(`/owners/${ownerKey}/products${suffix}`));
}

export async function fetchTrashView(ownerKey: OwnerKey) {
  return parseJson<TrashListResponse>(await fetchWithTimeout(`/owners/${ownerKey}/trash`));
}

export async function restoreTrackedProduct(ownerKey: OwnerKey, productId: string) {
  return parseJson<{ ok: true }>(
    await fetchWithTimeout(`/owners/${ownerKey}/trash/products/${productId}/restore`, { method: "POST" }),
  );
}
```

```tsx
// apps/web/src/features/tracking/routes/TrashPage.tsx
export function TrashPage() {
  const { ownerKey } = useParams<{ ownerKey: OwnerKey }>();
  const trashQuery = useQuery({
    queryKey: ["tracking-trash", ownerKey],
    enabled: Boolean(ownerKey),
    queryFn: () => fetchTrashView(ownerKey as OwnerKey),
  });

  return (
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white px-6 py-7 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Cop Kutusu</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">Silinen urunler</h1>
      </section>
      {trashQuery.data?.items.map((item) => (
        <article key={item.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-lg font-semibold text-slate-900">{item.title ?? "Basliksiz urun"}</p>
          <div className="mt-4 flex gap-3">
            <button type="button" onClick={() => restoreMutation.mutate(item.id)}>Geri Yukle</button>
            <button type="button" onClick={() => hardDeleteMutation.mutate(item.id)}>Kalici Sil</button>
          </div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Re-run the web unit tests plus typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- TrackingCenterPage.test.tsx ProductDetailPage.test.tsx TrashPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS, including owner-scoped fetch URLs, shell links, and trash restore/hard-delete UI

- [ ] **Step 5: Commit the owner-scoped web routing and trash UI**

```bash
git add apps/web/src/app/router.tsx apps/web/src/app/shell/AppShell.tsx apps/web/src/app/api.ts apps/web/src/features/shared/lib/ownerRouteState.ts apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx apps/web/src/features/tracking/routes/TrashPage.tsx apps/web/src/features/tracking/routes/TrashPage.test.tsx apps/web/src/features/tracking/components/AddLinkForm.tsx apps/web/src/features/tracking/components/ProductCard.tsx apps/web/src/features/tracking/components/BulkRefreshControl.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/src/features/product/components/ProductSummary.tsx apps/web/src/features/notifications/routes/NotificationsPage.tsx apps/web/src/features/drafts/routes/SeoEditorPage.tsx
git commit -m "feat: add owner scoped web navigation"
```

## Task 5: Add migration/runbook coverage and owner-scoped end-to-end regression tests

**Files:**
- Create: `docs/superpowers/runbooks/2026-03-27-owner-scoped-local-d1-reset.md`
- Modify: `apps/web/tests/e2e/tracking.spec.ts`

- [ ] **Step 1: Add an e2e scenario that proves owner isolation, trash restore, and hard delete**

```ts
await page.goto("/owners/berke/products");
await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
await page.getByRole("button", { name: "Ekle" }).click();
await page.getByRole("link", { name: /kaan/i }).click();
await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
await page.getByRole("button", { name: "Ekle" }).click();

await page.getByRole("link", { name: /berke/i }).click();
await page.getByRole("button", { name: /^sil$/i }).click();
await page.getByRole("link", { name: /cop kutusu/i }).click();
await expect(page.getByText(/oversize hoodie/i)).toBeVisible();
await page.getByRole("button", { name: /geri yukle/i }).click();
await page.getByRole("button", { name: /^sil$/i }).click();
await page.getByRole("link", { name: /cop kutusu/i }).click();
await page.getByRole("button", { name: /kalici sil/i }).click();

await page.getByRole("link", { name: /kaan/i }).click();
await expect(page.getByText(/oversize hoodie/i)).toBeVisible();
```

- [ ] **Step 2: Run the Playwright spec and verify the migration/runbook doc is still missing**

Run: `pnpm test:e2e -- --grep "owner isolation"`
Expected: FAIL because the app still boots from old routes or there is no `Cop Kutusu` page yet

- [ ] **Step 3: Document the local D1 backup/reset flow and update the e2e network fixtures for owner URLs**

```md
# Local D1 backup/reset before owner-scoped migration

1. Stop any running `wrangler dev` process.
2. Create a timestamped backup folder:
   `New-Item -ItemType Directory -Force .backup`
3. Copy the current local D1 files:
   `Copy-Item .wrangler/state/v3/d1 .backup/d1-before-owner-scope-2026-03-27 -Recurse`
4. If temiz baslangic gerekiyorsa local state'i sil:
   `Remove-Item .wrangler/state/v3/d1 -Recurse -Force`
5. Migrations'i yeniden uygula:
   `pnpm --filter @trendyol-etsy/api dev`
```

```ts
// apps/web/tests/e2e/tracking.spec.ts
const makeItem = (id: string, ownerKey: "berke" | "kaan", trendyolUrl: string) => ({
  id,
  ownerKey,
  trendyolUrl,
  title: "Oversize Hoodie",
  brand: "North Apparel",
  status: "ACTIVE",
  parseStatus: "OK",
  thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
  currentPrice: 42990,
  minPrice: 42990,
  maxPrice: 42990,
  inStockVariantCount: 3,
  totalVariantCount: 3,
  isFavorite: false,
});
const berkeItems: Array<ReturnType<typeof makeItem>> = [];
const kaanItems: Array<ReturnType<typeof makeItem>> = [];
const berkeTrash: Array<ReturnType<typeof makeItem> & { deletedAt: number }> = [];

await page.route("**/owners/berke/products*", async (route) => {
  const method = route.request().method();
  const pathname = new URL(route.request().url()).pathname;

  if (method === "GET" && pathname === "/owners/berke/products") {
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: { trackedCount: berkeItems.length, activeCount: berkeItems.length, reviewNeededCount: 0 }, items: berkeItems, filters: {} }),
    });
  }

  if (method === "POST" && pathname === "/owners/berke/products") {
    berkeItems.push(makeItem("berke_prod_1", "berke", seedUrl));
    return route.fulfill({
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: { id: "berke_prod_1", ownerKey: "berke", trendyolUrl: seedUrl, sourceProductId: "123", title: "Oversize Hoodie", variantCount: 3 } }),
    });
  }

  if (method === "DELETE" && pathname === "/owners/berke/products/berke_prod_1") {
    const [deleted] = berkeItems.splice(0, 1);
    if (deleted) {
      berkeTrash.push({ ...deleted, deletedAt: Date.now() });
    }
    return route.fulfill({ status: 204, body: "" });
  }

  return route.continue();
});
await page.route("**/owners/kaan/products*", async (route) => {
  const method = route.request().method();
  const pathname = new URL(route.request().url()).pathname;

  if (method === "GET" && pathname === "/owners/kaan/products") {
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary: { trackedCount: kaanItems.length, activeCount: kaanItems.length, reviewNeededCount: 0 }, items: kaanItems, filters: {} }),
    });
  }

  if (method === "POST" && pathname === "/owners/kaan/products") {
    kaanItems.push(makeItem("kaan_prod_1", "kaan", seedUrl));
    return route.fulfill({
      status: 201,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: { id: "kaan_prod_1", ownerKey: "kaan", trendyolUrl: seedUrl, sourceProductId: "123", title: "Oversize Hoodie", variantCount: 3 } }),
    });
  }

  return route.continue();
});
await page.route("**/owners/berke/trash*", async (route) => {
  const method = route.request().method();

  if (method === "GET") {
    return route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: berkeTrash, total: berkeTrash.length }),
    });
  }

  if (method === "POST") {
    const restored = berkeTrash.shift();
    if (restored) {
      const { deletedAt, ...activeItem } = restored;
      void deletedAt;
      berkeItems.push(activeItem);
    }
    return route.fulfill({ status: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true }) });
  }

  berkeTrash.splice(0, 1);
  return route.fulfill({ status: 204, body: "" });
});
await page.route("**/owners/kaan/trash*", async (route) => {
  return route.fulfill({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: [], total: 0 }),
  });
});
```

- [ ] **Step 4: Run the focused regression matrix for API, web, and e2e owner flows**

Run: `pnpm --filter @trendyol-etsy/api test -- trackingActions.test.ts listViews.test.ts draftFlows.test.ts manualRefreshRuns.test.ts && pnpm --filter @trendyol-etsy/web test -- TrackingCenterPage.test.tsx ProductDetailPage.test.tsx TrashPage.test.tsx && pnpm test:e2e -- --grep "owner isolation"`
Expected: PASS across API unit/integration, web unit tests, and the Playwright owner isolation flow

- [ ] **Step 5: Commit the runbook and owner-scoped regression coverage**

```bash
git add docs/superpowers/runbooks/2026-03-27-owner-scoped-local-d1-reset.md apps/web/tests/e2e/tracking.spec.ts
git commit -m "test: cover owner scoped trash workflow"
```

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-27-owner-scoped-products.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
