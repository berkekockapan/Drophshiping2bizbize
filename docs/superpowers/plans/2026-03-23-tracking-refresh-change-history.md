# Tracking Refresh Change History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Manuel ve zamanlanmis yenilemelerde urunlerin son durumunu tek yerde tutarken, sadece gercek degisiklikler icin alan bazli history ve her refresh icin audit kaydi olusturmak.

**Architecture:** D1 semasina `product_refresh_audits` ve `product_content_history` ekleyip mevcut `price_history` ve `stock_history` kayitlarini audit kimligiyle bagla. Ortak `processRefreshJob` hattini icerik + fiyat + stok difflerini tek yerde hesaplayacak sekilde genislet, sonra detay endpoint'inde audit/content/price/stock kaynaklarini birlestirip web tarafinda tek bir `Degisiklik Gecmisi` timeline'i render et.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker queue/waitUntil, D1/SQLite, React, TanStack Query, Tailwind CSS, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-23-tracking-refresh-change-history-design.md`
- Son durumun kaynagi olmaya devam edecek tablolar: `products`, `product_current_state`, `product_variants`
- History yalnizca `title`, `description`, `images`, urun fiyat, varyant fiyat, varyant stok alanlarini kapsar.
- `NO_CHANGE` ve hata audit'leri timeline'da satir olarak gorunur; degisiklik ureten `SUCCESS` audit'leri ayri satir olarak render edilmez.
- Mevcut urunler icin geriye donuk history backfill yapma; ilk yeni refresh'ten itibaren audit/history biriksin.
- `apps/api/drizzle/0002_manual_refresh_runs.sql` mevcut oldugu icin yeni migration `0003_...` ile baslamali.
- Mevcut `priceHistory` / `stockHistory` response alanlarini simdilik koru; yeni `changeTimeline` bunlara ek olarak gelsin.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### API schema and persistence
- Create: `apps/api/drizzle/0003_product_refresh_change_history.sql` - `product_refresh_audits`, `product_content_history`, `price_history.refresh_audit_id`, `stock_history.refresh_audit_id`
- Modify: `apps/api/src/db/schema.ts` - yeni tablolar ve yeni kolonlari Drizzle schema'ya ekle
- Create: `apps/api/src/db/repositories/refreshAuditRepo.ts` - audit ve content history yazma/okuma sorgulari
- Modify: `apps/api/src/db/repositories/historyRepo.ts` - `refresh_audit_id` ve varyant fiyat history yazimi
- Modify: `apps/api/src/db/repositories/productsRepo.ts` - refresh snapshot'ina mevcut title/description/images ve varyant fiyat bilgilerini ekle
- Modify: `apps/api/tests/integration/schema.test.ts` - yeni tablo/kolon beklentileri

### Refresh diff and execution pipeline
- Modify: `apps/api/src/modules/sync/diffProductState.ts` - content diff, varyant fiyat diff, `lastChangeAt`, `changedFields`
- Modify: `apps/api/src/modules/sync/applyProductRefresh.ts` - audit olusturma, no-change/success/error persistence, repo orkestrasyonu
- Modify: `apps/api/src/modules/tracking/processManualRefreshRun.ts` - `source=MANUAL` ve `manualRefreshRunId` ile refresh cagir
- Modify: `apps/api/src/modules/scheduler/processRefreshJob.ts` - `source=SCHEDULED` ile refresh cagir
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts` - no-change, content history, varyant fiyat history senaryolari
- Create: `apps/api/tests/integration/processRefreshQueueBatch.test.ts` - queue batch'inin `SCHEDULED` audit kaydi yazdigini dogrula
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts` - manual run kaynak baglantisini ve audit iliskisini dogrula

### Detail timeline API
- Create: `apps/api/src/modules/tracking/buildProductChangeTimeline.ts` - audit/content/price/stock kaynaklarini tek timeline'a map et
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts` - `changeTimeline` alanini detail response'a ekle
- Modify: `apps/api/tests/integration/listViews.test.ts` - detail response icinde birlesik timeline beklentileri
- Modify: `apps/web/src/app/api.ts` - `ProductDetailResponse.changeTimeline` tipleri

### Product detail UI
- Create: `apps/web/src/features/product/components/ChangeTimeline.tsx` - tek timeline UI'i
- Create: `apps/web/src/features/product/components/ChangeTimeline.test.tsx` - karisik timeline item render testleri
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx` - iki kolonlu history yerine tam genislik timeline kullan
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - yeni bolum ve item metinlerini assert et
- Delete: `apps/web/src/features/product/components/HistoryTimeline.tsx` - artik kullanilmayan eski iki-panelli history component'i

## Task 1: Add D1 persistence for refresh audits and selective change history

**Files:**
- Create: `apps/api/drizzle/0003_product_refresh_change_history.sql`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`

- [ ] **Step 1: Extend the schema test with the new tables and history link columns**

```ts
const tables = database
  .prepare("select name from sqlite_master where type = 'table' order by name")
  .all() as Array<{ name: string }>;

const priceColumns = database.prepare("pragma table_info(price_history)").all() as Array<{ name: string }>;
const stockColumns = database.prepare("pragma table_info(stock_history)").all() as Array<{ name: string }>;

expect(tables).toEqual(
  expect.arrayContaining([
    { name: "product_refresh_audits" },
    { name: "product_content_history" },
  ]),
);
expect(priceColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "refresh_audit_id" })]));
expect(stockColumns).toEqual(expect.arrayContaining([expect.objectContaining({ name: "refresh_audit_id" })]));
```

- [ ] **Step 2: Run the focused schema test to verify it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts`
Expected: FAIL because the new tables and columns do not exist yet.

- [ ] **Step 3: Add the SQL migration**

```sql
create table product_refresh_audits (
  id text primary key not null,
  product_id text not null,
  source text not null,
  manual_refresh_run_id text,
  status text not null,
  change_count integer not null default 0,
  changed_fields_json text,
  error_message text,
  checked_at integer not null,
  created_at integer not null
);

create table product_content_history (
  id text primary key not null,
  product_id text not null,
  refresh_audit_id text not null,
  field_key text not null,
  previous_value_raw text,
  new_value_raw text,
  changed_at integer not null,
  created_at integer not null
);

alter table price_history add column refresh_audit_id text;
alter table stock_history add column refresh_audit_id text;

create index product_refresh_audits_product_checked_at_idx
  on product_refresh_audits (product_id, checked_at desc);
create index product_content_history_product_changed_at_idx
  on product_content_history (product_id, changed_at desc);
```

- [ ] **Step 4: Register the new tables in `schema.ts`**

```ts
export const productRefreshAudits = sqliteTable("product_refresh_audits", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  source: text("source").notNull(),
  manualRefreshRunId: text("manual_refresh_run_id"),
  status: text("status").notNull(),
  changeCount: integer("change_count").notNull().default(0),
  changedFieldsJson: text("changed_fields_json"),
  errorMessage: text("error_message"),
  checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 5: Re-run the schema test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts`
Expected: PASS with both new tables and both `refresh_audit_id` columns present.

- [ ] **Step 6: Commit the persistence groundwork**

```bash
git add apps/api/drizzle/0003_product_refresh_change_history.sql apps/api/src/db/schema.ts apps/api/tests/integration/schema.test.ts
git commit -m "feat: add refresh audit persistence"
```

## Task 2: Persist `NO_CHANGE` audits and content-field history from the shared refresh pipeline

**Files:**
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Create: `apps/api/src/db/repositories/refreshAuditRepo.ts`
- Modify: `apps/api/src/modules/sync/diffProductState.ts`
- Modify: `apps/api/src/modules/sync/applyProductRefresh.ts`
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts`

- [ ] **Step 1: Add a failing integration test for `NO_CHANGE` and content history**

```ts
it("writes a NO_CHANGE audit without content rows when tracked fields stay the same", async () => {
  const { env, sqlite } = createTestEnv();
  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
      now: new Date("2026-03-20T00:00:00.000Z"),
    },
  );

  await processRefreshJob(
    env,
    { productId: seeded.product.id },
    {
      source: "MANUAL",
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
      now: new Date("2026-03-20T01:00:00.000Z"),
    },
  );

  const audit = sqlite
    .prepare(
      `select source, status, change_count as changeCount
       from product_refresh_audits
       where product_id = ?
       order by created_at desc
       limit 1`,
    )
    .get(seeded.product.id);
  const contentRows = sqlite
    .prepare("select count(*) as count from product_content_history where product_id = ?")
    .get(seeded.product.id) as { count: number };

  expect(audit).toEqual({ source: "MANUAL", status: "NO_CHANGE", changeCount: 0 });
  expect(contentRows.count).toBe(0);
});
```

```ts
it("writes TITLE, DESCRIPTION, and IMAGES history rows only for changed content", async () => {
  const changedHtml = basicProductHtml
    .replace("Oversize Hoodie", "Oversize Hoodie Renewed")
    .replace("Soft oversized hoodie.", "Soft oversized hoodie. Yeni sezon kumas.")
    .replace("hoodie-1.jpg", "hoodie-3.jpg");

  // seed + refresh, then assert field_key rows
});
```

- [ ] **Step 2: Run the focused refresh test to confirm it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/processRefreshJob.test.ts`
Expected: FAIL because no audit/content tables are written and `ProcessRefreshJobOptions` has no source metadata yet.

- [ ] **Step 3: Expand the refresh snapshot so the diff layer can compare content fields**

```ts
async getRefreshSnapshot(productId: string) {
  const product = await db.prepare(
    `select id, trendyol_url as trendyolUrl, parse_status as parseStatus,
            title, description_raw as descriptionRaw, images_raw as imagesRaw
     from products
     where id = ?
     limit 1`,
  ).bind(productId).first();

  // keep currentState + variants, but include title/description/imagesRaw in the returned snapshot
}
```

- [ ] **Step 4: Add a focused `refreshAuditRepo` for writes and reads**

```ts
export function createRefreshAuditRepo(db: D1Database) {
  return {
    async insertAudit(input: {
      productId: string;
      source: "MANUAL" | "SCHEDULED";
      manualRefreshRunId: string | null;
      status: "SUCCESS" | "NO_CHANGE" | "PARSE_ERROR" | "FETCH_ERROR";
      changeCount: number;
      changedFields: string[];
      errorMessage: string | null;
      checkedAt: number;
    }) {
      const id = crypto.randomUUID();
      await db.prepare(
        `insert into product_refresh_audits (
          id, product_id, source, manual_refresh_run_id, status, change_count,
          changed_fields_json, error_message, checked_at, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).bind(
        id,
        input.productId,
        input.source,
        input.manualRefreshRunId,
        input.status,
        input.changeCount,
        JSON.stringify(input.changedFields),
        input.errorMessage,
        input.checkedAt,
        input.checkedAt,
      ).run();

      return { id };
    },
  };
}
```

- [ ] **Step 5: Extend the diff contract to include normalized content changes**

```ts
export interface ContentHistoryChange {
  fieldKey: "TITLE" | "DESCRIPTION" | "IMAGES";
  previousValueRaw: string | null;
  newValueRaw: string | null;
  changedAt: number;
}

export interface ProductStateDiff {
  currentState: { /* existing fields */ };
  contentHistory: ContentHistoryChange[];
  priceHistory: PriceHistoryChange[];
  stockHistory: StockHistoryChange[];
  changedFields: string[];
  notifications: SyncNotification[];
}
```

```ts
function normalizeText(value: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? null;
}
```

- [ ] **Step 6: Wire `applyProductRefresh` to write audits and content history**

```ts
const diff = diffProductState(previousSnapshot, incomingSnapshot);

await productsRepo.updateProductSnapshot(product.id, parsed, diff.currentState, now);

const audit = await refreshAuditRepo.insertAudit({
  productId: product.id,
  source: options.source ?? "MANUAL",
  manualRefreshRunId: options.manualRefreshRunId ?? null,
  status: diff.changedFields.length > 0 ? "SUCCESS" : "NO_CHANGE",
  changeCount: diff.changedFields.length,
  changedFields: diff.changedFields,
  errorMessage: null,
  checkedAt: now.getTime(),
});

await refreshAuditRepo.insertContentHistory(product.id, audit.id, diff.contentHistory);
await historyRepo.insertPriceHistory(product.id, audit.id, diff.priceHistory);
await historyRepo.insertStockHistory(product.id, audit.id, diff.stockHistory);
```

- [ ] **Step 7: Re-run the focused refresh test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/processRefreshJob.test.ts`
Expected: PASS with one `NO_CHANGE` audit row and content history rows only for changed fields.

- [ ] **Step 8: Commit the shared refresh persistence changes**

```bash
git add apps/api/src/db/repositories/productsRepo.ts apps/api/src/db/repositories/refreshAuditRepo.ts apps/api/src/modules/sync/diffProductState.ts apps/api/src/modules/sync/applyProductRefresh.ts apps/api/tests/integration/processRefreshJob.test.ts
git commit -m "feat: record refresh audits and content history"
```

## Task 3: Track variant price changes and propagate refresh source metadata through manual and scheduled entry points

**Files:**
- Modify: `apps/api/src/db/repositories/historyRepo.ts`
- Modify: `apps/api/src/modules/sync/diffProductState.ts`
- Modify: `apps/api/src/modules/tracking/processManualRefreshRun.ts`
- Modify: `apps/api/src/modules/scheduler/processRefreshJob.ts`
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts`
- Create: `apps/api/tests/integration/processRefreshQueueBatch.test.ts`
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts`

- [ ] **Step 1: Add failing tests for variant price history and refresh source**

```ts
expect(
  sqlite.prepare(
    `select variant_id as variantId, previous_price as previousPrice, new_price as newPrice, refresh_audit_id as refreshAuditId
     from price_history
     where product_id = ?
     order by changed_at desc`,
  ).all(seeded.product.id),
).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      variantId: expect.any(String),
      refreshAuditId: expect.any(String),
    }),
  ]),
);
```

```ts
const audits = sqlite
  .prepare(
    `select source, manual_refresh_run_id as manualRefreshRunId
     from product_refresh_audits
     where product_id = ?
     order by created_at desc`,
  )
  .all(productId);

expect(audits[0]).toEqual(expect.objectContaining({ source: "MANUAL", manualRefreshRunId: started.run.id }));
```

```ts
it("writes scheduled audits when queue batches are processed", async () => {
  // seed product, create fake batch with one message, call processRefreshQueueBatch, then assert source = 'SCHEDULED'
});
```

- [ ] **Step 2: Run the focused tests to confirm they fail**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/processRefreshJob.test.ts tests/integration/manualRefreshRuns.test.ts tests/integration/processRefreshQueueBatch.test.ts`
Expected: FAIL because variant price rows still collapse to product-level history and the source metadata is not plumbed through manual/scheduled callers.

- [ ] **Step 3: Extend `PriceHistoryChange` so it can carry variant-level events**

```ts
export interface PriceHistoryChange {
  variantId: string | null;
  previousPrice: number | null;
  newPrice: number | null;
  changedAt: number;
  changeReason: "PRODUCT_PRICE_CHANGED" | "VARIANT_PRICE_CHANGED";
}
```

```ts
if (previousVariant.currentPrice !== variant.price) {
  priceHistory.push({
    variantId: previousVariant.id,
    previousPrice: previousVariant.currentPrice,
    newPrice: variant.price,
    changedAt: incoming.checkedAt,
    changeReason: "VARIANT_PRICE_CHANGED",
  });
}
```

- [ ] **Step 4: Write `refresh_audit_id` and variant ids in `historyRepo`**

```ts
async insertPriceHistory(productId: string, refreshAuditId: string, entries: PriceHistoryChange[]) {
  for (const entry of entries) {
    await db.prepare(
      `insert into price_history (
        id, product_id, variant_id, previous_price, new_price, changed_at, change_reason, refresh_audit_id
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      crypto.randomUUID(),
      productId,
      entry.variantId,
      entry.previousPrice,
      entry.newPrice,
      entry.changedAt,
      entry.changeReason,
      refreshAuditId,
    ).run();
  }
}
```

- [ ] **Step 5: Propagate `MANUAL` and `SCHEDULED` source metadata from entry points**

```ts
await processRefreshJob(
  env,
  { productId: item.productId },
  {
    ...options,
    source: "MANUAL",
    manualRefreshRunId: activeRun.id,
  },
);
```

```ts
await applyRefreshJob(env, message.body, {
  source: "SCHEDULED",
});
```

- [ ] **Step 6: Re-run the focused API tests**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/processRefreshJob.test.ts tests/integration/manualRefreshRuns.test.ts tests/integration/processRefreshQueueBatch.test.ts`
Expected: PASS with variant-level price rows, audit links, and correct manual/scheduled source values.

- [ ] **Step 7: Commit the refresh source and variant history work**

```bash
git add apps/api/src/db/repositories/historyRepo.ts apps/api/src/modules/sync/diffProductState.ts apps/api/src/modules/tracking/processManualRefreshRun.ts apps/api/src/modules/scheduler/processRefreshJob.ts apps/api/tests/integration/processRefreshJob.test.ts apps/api/tests/integration/manualRefreshRuns.test.ts apps/api/tests/integration/processRefreshQueueBatch.test.ts
git commit -m "feat: track refresh source and variant price history"
```

## Task 4: Expose a merged `changeTimeline` from the product detail API

**Files:**
- Create: `apps/api/src/modules/tracking/buildProductChangeTimeline.ts`
- Modify: `apps/api/src/db/repositories/refreshAuditRepo.ts`
- Modify: `apps/api/src/db/repositories/historyRepo.ts`
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`
- Modify: `apps/web/src/app/api.ts`

- [ ] **Step 1: Extend the detail integration test with a failing `changeTimeline` expectation**

```ts
expect(detailJson.changeTimeline).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      type: "PRODUCT_PRICE_CHANGED",
      summary: expect.stringContaining("Urun fiyati degisti"),
    }),
    expect.objectContaining({
      type: "VARIANT_STOCK_CHANGED",
      summary: expect.stringContaining("stok"),
    }),
  ]),
);
```

```ts
await processRefreshJob(
  env,
  { productId: seeded.product.id },
  {
    source: "MANUAL",
    fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
    now: new Date("2026-03-20T03:00:00.000Z"),
  },
);

// Expect one REFRESH_NO_CHANGE item plus later change items in reverse chronological order
```

- [ ] **Step 2: Run the detail integration test and confirm it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts`
Expected: FAIL because `changeTimeline` is not returned yet.

- [ ] **Step 3: Add repository list methods for audit and content history**

```ts
async listRefreshAudits(productId: string) {
  return (
    await db.prepare(
      `select id, product_id as productId, source, manual_refresh_run_id as manualRefreshRunId,
              status, change_count as changeCount, changed_fields_json as changedFieldsJson,
              error_message as errorMessage, checked_at as checkedAt
       from product_refresh_audits
       where product_id = ?
       order by checked_at desc`,
    ).bind(productId).all()
  ).results;
}
```

- [ ] **Step 4: Build a dedicated merger for timeline items**

```ts
export function buildProductChangeTimeline(input: {
  audits: RefreshAuditRow[];
  contentHistory: ContentHistoryRow[];
  priceHistory: PriceHistoryRow[];
  stockHistory: StockHistoryRow[];
  variants: Array<{ id: string; variantKey: string; option1: string | null; option2: string | null; option3: string | null }>;
}) {
  const variantLabels = new Map(
    input.variants.map((variant) => [variant.id, [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey]),
  );

  return [
    ...input.audits
      .filter((audit) => audit.status !== "SUCCESS")
      .map((audit) => toAuditTimelineItem(audit)),
    ...input.contentHistory.map((entry) => toContentTimelineItem(entry)),
    ...input.priceHistory.map((entry) => toPriceTimelineItem(entry, variantLabels)),
    ...input.stockHistory.map((entry) => toStockTimelineItem(entry, variantLabels)),
  ].sort((left, right) => right.changedAt - left.changedAt);
}
```

- [ ] **Step 5: Return `changeTimeline` from the detail builder and type it in the web client**

```ts
return {
  product: { /* existing fields */ },
  currentState: detail.currentState,
  variants,
  priceHistory: await historyRepo.listPriceHistory(productId),
  stockHistory: await historyRepo.listStockHistory(productId),
  changeTimeline: buildProductChangeTimeline({
    audits: await refreshAuditRepo.listRefreshAudits(productId),
    contentHistory: await refreshAuditRepo.listContentHistory(productId),
    priceHistory: await historyRepo.listPriceHistory(productId),
    stockHistory: await historyRepo.listStockHistory(productId),
    variants: detail.variants,
  }),
  notifications: await notificationsRepo.listNotifications(productId),
};
```

- [ ] **Step 6: Re-run the detail integration test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts`
Expected: PASS with a reverse-chronological `changeTimeline` containing both `REFRESH_NO_CHANGE` and field-level changes.

- [ ] **Step 7: Commit the detail API contract**

```bash
git add apps/api/src/modules/tracking/buildProductChangeTimeline.ts apps/api/src/db/repositories/refreshAuditRepo.ts apps/api/src/db/repositories/historyRepo.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/tests/integration/listViews.test.ts apps/web/src/app/api.ts
git commit -m "feat: expose product change timeline"
```

## Task 5: Replace the dual history panels with a full-width change timeline on the product detail page

**Files:**
- Create: `apps/web/src/features/product/components/ChangeTimeline.tsx`
- Create: `apps/web/src/features/product/components/ChangeTimeline.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Delete: `apps/web/src/features/product/components/HistoryTimeline.tsx`

- [ ] **Step 1: Add a failing component test for mixed timeline items**

```tsx
it("renders no-change, content, and variant events in one list", () => {
  render(
    <ChangeTimeline
      items={[
        {
          id: "audit_1",
          type: "REFRESH_NO_CHANGE",
          changedAt: Date.parse("2026-03-20T12:00:00.000Z"),
          summary: "Yenileme yapildi, degisiklik bulunamadi",
          details: null,
        },
        {
          id: "content_1",
          type: "TITLE_CHANGED",
          changedAt: Date.parse("2026-03-20T11:00:00.000Z"),
          summary: "Baslik degisti",
          before: "Oversize Hoodie",
          after: "Oversize Hoodie Renewed",
        },
      ]}
    />,
  );

  expect(screen.getByText(/degisiklik gecmisi/i)).toBeInTheDocument();
  expect(screen.getByText(/yenileme yapildi, degisiklik bulunamadi/i)).toBeInTheDocument();
  expect(screen.getByText(/oversize hoodie renewed/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Update the page test to expect the full-width timeline and remove the old dual headings**

```tsx
expect(await screen.findByText(/degisiklik gecmisi/i)).toBeInTheDocument();
expect(screen.queryByText(/fiyat gecmisi/i)).not.toBeInTheDocument();
expect(screen.queryByText(/stok gecmisi/i)).not.toBeInTheDocument();
```

- [ ] **Step 3: Run the focused web tests to confirm they fail**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ChangeTimeline.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: FAIL because `ChangeTimeline` does not exist and the page still renders the old split history layout.

- [ ] **Step 4: Implement the new timeline component**

```tsx
export function ChangeTimeline({ items }: { items: ProductDetailResponse["changeTimeline"] }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">Takip Gecmisi</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">Degisiklik Gecmisi</h2>
        </div>
        <p className="text-sm text-slate-500">{items.length} olay</p>
      </div>

      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-2xl bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-900">{item.summary}</p>
              <p className="text-xs text-slate-500">{formatDateTime(item.changedAt)}</p>
            </div>
            {item.details ? <p className="mt-2 text-sm text-slate-600">{item.details}</p> : null}
            {item.before || item.after ? <pre className="mt-3 overflow-x-auto rounded-xl bg-white p-3 text-xs text-slate-600">{/* before/after */}</pre> : null}
          </article>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Swap `ProductDetailPage` to the new full-width section and remove the old component**

```tsx
<>
  <ProductSummary detail={detailQuery.data} />
  <VariantTable variants={detailQuery.data.variants} />
  <ChangeTimeline items={detailQuery.data.changeTimeline} />
</>
```

- [ ] **Step 6: Re-run the focused web tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ChangeTimeline.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with the single full-width `Degisiklik Gecmisi` section rendered.

- [ ] **Step 7: Commit the product detail UI**

```bash
git add apps/web/src/features/product/components/ChangeTimeline.tsx apps/web/src/features/product/components/ChangeTimeline.test.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/src/features/product/components/HistoryTimeline.tsx
git commit -m "feat: show unified product change timeline"
```

## Task 6: Run end-to-end regression checks for the full refresh-history workflow

**Files:**
- Modify as needed: `apps/api/tests/integration/listViews.test.ts`
- Modify as needed: `apps/api/tests/integration/manualRefreshRuns.test.ts`
- Modify as needed: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Run the focused API suite that covers schema, refresh execution, manual runs, queue batches, and detail views**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/processRefreshJob.test.ts tests/integration/processRefreshQueueBatch.test.ts tests/integration/manualRefreshRuns.test.ts tests/integration/listViews.test.ts`
Expected: PASS with audit persistence, source propagation, and merged timeline coverage all green.

- [ ] **Step 2: Run the focused web suite for the product detail page**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ChangeTimeline.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with the new timeline UI and no references to the retired dual-history layout.

- [ ] **Step 3: If a regression fails, fix the smallest layer that owns it and re-run only the failing command first**

```bash
pnpm --filter @trendyol-etsy/api test -- tests/integration/<failing-file>.test.ts
pnpm --filter @trendyol-etsy/web test -- src/features/product/<failing-file>.test.tsx
```

- [ ] **Step 4: Commit any final regression-only fixes**

```bash
git add apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/manualRefreshRuns.test.ts apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "test: cover refresh change history regressions"
```
