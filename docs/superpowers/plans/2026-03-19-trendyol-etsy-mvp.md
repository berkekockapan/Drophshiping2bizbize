
# Trendyol to Etsy Workflow MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user web app that tracks Trendyol product links, stores variant-aware stock/price history, and produces editable Etsy drafts through a local AI connector without storing ChatGPT session secrets on the server.

**Architecture:** Bootstrap the repo as a TypeScript pnpm workspace with three deployable surfaces: a Cloudflare Worker API backed by D1/Queues/Cron, a React dashboard for product-first workflows, and a local connector process that owns ChatGPT session state and generation. Keep scraping, diff/history logic, UI state, and connector integration behind shared contracts so Trendyol HTML churn or connector changes do not leak across the whole system.

**Tech Stack:** TypeScript, pnpm workspaces, Hono, Cloudflare Workers, D1, Queues, Cron Triggers, Drizzle ORM, Cheerio, React, Vite, Tailwind CSS, TanStack Router, TanStack Query, Fastify, Playwright, Zod, Vitest, Playwright E2E

---

## Implementation Notes

- The repository currently contains only planning artifacts, so this plan bootstraps the application from scratch.
- The repo is not yet a Git repository; Task 1 initializes Git so the later commit steps are executable.
- The connector should expose a stable local HTTP API on `http://127.0.0.1:4317` and the web app should talk to it directly for health, profiles, and generation; the server only stores non-sensitive profile metadata and generated drafts.
- To keep the MVP buildable, the connector must support both a deterministic `mock` provider for tests/dev and a `chatgpt-web` provider behind the same interface for real local runs.
- Use `@executing-plans` if this plan is executed inline.

## File Structure

### Root workspace
- Create: `package.json` — root scripts for install, dev, test, lint, typecheck, and workspace filtering.
- Create: `pnpm-workspace.yaml` — workspace membership for `apps/*` and `packages/*`.
- Create: `tsconfig.base.json` — shared compiler options and path aliases.
- Create: `.gitignore` — ignore `node_modules`, `.wrangler`, `.dev.vars`, Playwright auth state, connector local state, and build artifacts.
- Create: `.editorconfig` — normalize whitespace and line endings.
- Create: `vitest.workspace.ts` — workspace-aware test project configuration.
- Create: `playwright.config.ts` — browser E2E configuration for the dashboard flows.

### Shared contracts
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/schemas/product.ts` — enums and zod schemas for product, variant, parse, and notification states.
- Create: `packages/shared/src/schemas/draft.ts` — zod schemas for Etsy draft payloads and overwrite rules.
- Create: `packages/shared/src/schemas/settings.ts` — single-user settings schema (`refreshIntervalHours`, prompt preferences).
- Create: `packages/shared/src/contracts/tracking.ts` — DTOs for add-link, list, detail, notifications.
- Create: `packages/shared/src/contracts/connector.ts` — DTOs for health, profiles, activate-profile, generate-request/response.

### API worker
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/wrangler.toml`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/index.ts` — Hono app factory and route registration.
- Create: `apps/api/src/worker.ts` — `fetch`, `queue`, and `scheduled` entrypoints.
- Create: `apps/api/src/config/bindings.ts` — typed Cloudflare env bindings.
- Create: `apps/api/src/config/logger.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/schema.ts` — D1 schema for `products`, `product_variants`, `product_current_state`, `price_history`, `stock_history`, `notifications`, `etsy_drafts`, `ai_profiles`, `app_settings`.
- Create: `apps/api/drizzle/0000_initial.sql`
- Create: `apps/api/src/db/repositories/productsRepo.ts`
- Create: `apps/api/src/db/repositories/historyRepo.ts`
- Create: `apps/api/src/db/repositories/notificationsRepo.ts`
- Create: `apps/api/src/db/repositories/draftsRepo.ts`
- Create: `apps/api/src/db/repositories/settingsRepo.ts`
- Create: `apps/api/src/modules/tracking/normalizeTrendyolUrl.ts`
- Create: `apps/api/src/modules/tracking/extractSourceProductId.ts`
- Create: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Create: `apps/api/src/modules/tracking/buildTrackingListView.ts`
- Create: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Create: `apps/api/src/modules/scraping/fetchTrendyolHtml.ts`
- Create: `apps/api/src/modules/scraping/parseTrendyolProduct.ts`
- Create: `apps/api/src/modules/scraping/parseErrors.ts`
- Create: `apps/api/src/modules/sync/diffProductState.ts`
- Create: `apps/api/src/modules/sync/applyProductRefresh.ts`
- Create: `apps/api/src/modules/scheduler/enqueueTrackedProducts.ts`
- Create: `apps/api/src/modules/scheduler/processRefreshJob.ts`
- Create: `apps/api/src/modules/ai/buildDraftPrompt.ts`
- Create: `apps/api/src/modules/ai/mergeGeneratedDraft.ts`
- Create: `apps/api/src/modules/ai/syncProfileMetadata.ts`
- Create: `apps/api/src/routes/health.ts`
- Create: `apps/api/src/routes/tracking.ts`
- Create: `apps/api/src/routes/products.ts`
- Create: `apps/api/src/routes/drafts.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Create: `apps/api/src/routes/settings.ts`
- Create: `apps/api/src/routes/aiProfiles.ts`

### API tests and fixtures
- Create: `apps/api/tests/fixtures/trendyol/basic-product.html`
- Create: `apps/api/tests/fixtures/trendyol/product-with-variants.html`
- Create: `apps/api/tests/fixtures/trendyol/product-unavailable.html`
- Create: `apps/api/tests/unit/normalizeTrendyolUrl.test.ts`
- Create: `apps/api/tests/unit/parseTrendyolProduct.test.ts`
- Create: `apps/api/tests/unit/diffProductState.test.ts`
- Create: `apps/api/tests/unit/buildDraftPrompt.test.ts`
- Create: `apps/api/tests/unit/mergeGeneratedDraft.test.ts`
- Create: `apps/api/tests/integration/schema.test.ts`
- Create: `apps/api/tests/integration/addTrackedProduct.test.ts`
- Create: `apps/api/tests/integration/processRefreshJob.test.ts`
- Create: `apps/api/tests/integration/listViews.test.ts`
- Create: `apps/api/tests/integration/draftFlows.test.ts`
### Web app
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/postcss.config.cjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles/index.css`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/queryClient.ts`
- Create: `apps/web/src/app/api.ts`
- Create: `apps/web/src/app/shell/AppShell.tsx`
- Create: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Create: `apps/web/src/features/tracking/components/AddLinkForm.tsx`
- Create: `apps/web/src/features/tracking/components/ProductCard.tsx`
- Create: `apps/web/src/features/tracking/components/TrackingFilters.tsx`
- Create: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Create: `apps/web/src/features/product/components/ProductSummary.tsx`
- Create: `apps/web/src/features/product/components/VariantTable.tsx`
- Create: `apps/web/src/features/product/components/HistoryTimeline.tsx`
- Create: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`
- Create: `apps/web/src/features/drafts/components/DraftEditor.tsx`
- Create: `apps/web/src/features/drafts/components/SourceProductPanel.tsx`
- Create: `apps/web/src/features/notifications/routes/NotificationsPage.tsx`
- Create: `apps/web/src/features/notifications/components/NotificationList.tsx`
- Create: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Create: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Create: `apps/web/src/features/settings/routes/SettingsPage.tsx`
- Create: `apps/web/src/features/settings/components/SettingsForm.tsx`
- Create: `apps/web/src/features/shared/components/StatusBadge.tsx`
- Create: `apps/web/src/features/shared/components/StatCard.tsx`

### Web tests
- Create: `apps/web/src/test/test-utils.tsx`
- Create: `apps/web/src/features/tracking/components/AddLinkForm.test.tsx`
- Create: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`
- Create: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Create: `apps/web/src/features/drafts/components/DraftEditor.test.tsx`
- Create: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`
- Create: `apps/web/tests/e2e/tracking.spec.ts`
- Create: `apps/web/tests/e2e/draft-generation.spec.ts`

### Local connector
- Create: `apps/connector/package.json`
- Create: `apps/connector/tsconfig.json`
- Create: `apps/connector/.env.example`
- Create: `apps/connector/src/index.ts`
- Create: `apps/connector/src/server.ts`
- Create: `apps/connector/src/config.ts`
- Create: `apps/connector/src/store/profileStore.ts`
- Create: `apps/connector/src/providers/base.ts`
- Create: `apps/connector/src/providers/mockProvider.ts`
- Create: `apps/connector/src/providers/chatgptWebProvider.ts`
- Create: `apps/connector/src/browser/browserSession.ts`
- Create: `apps/connector/src/browser/runPrompt.ts`
- Create: `apps/connector/src/routes/health.ts`
- Create: `apps/connector/src/routes/profiles.ts`
- Create: `apps/connector/src/routes/generate.ts`
- Create: `apps/connector/tests/unit/profileStore.test.ts`
- Create: `apps/connector/tests/unit/mockProvider.test.ts`
- Create: `apps/connector/tests/integration/server.test.ts`

### Operational docs
- Create: `docs/runbooks/local-connector.md`
- Create: `docs/runbooks/cloudflare-deploy.md`
- Create: `docs/runbooks/trendyol-fixture-refresh.md`

## Task 1: Bootstrap the monorepo and developer tooling

**Files:**
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `vitest.workspace.ts`
- Create: `playwright.config.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/connector/package.json`
- Create: `apps/connector/tsconfig.json`
- Test: `apps/api/tests/integration/workspaceSmoke.test.ts`

- [ ] **Step 1: Initialize Git and write the root workspace files**

```bash
git init
```

```json
{
  "name": "trendyol-etsy-workflow",
  "private": true,
  "packageManager": "pnpm@10",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "typecheck": "pnpm -r typecheck"
  }
}
```

- [ ] **Step 2: Write the failing workspace smoke test**

```ts
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/index";

describe("workspace smoke", () => {
  it("creates an app with a health route", async () => {
    const app = createApp();
    const res = await app.request("/health");
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 3: Run the smoke test to verify it fails**

Run: `npx pnpm run test -- --run apps/api/tests/integration/workspaceSmoke.test.ts`  
Expected: FAIL with module resolution errors for `apps/api/src/index.ts`

- [ ] **Step 4: Add workspace package manifests, TS config, and placeholder package exports**

```ts
export * from "./contracts/tracking";
export * from "./contracts/connector";
export * from "./schemas/product";
export * from "./schemas/draft";
```

- [ ] **Step 5: Add the minimal API app factory and health route**

```ts
import { Hono } from "hono";

export function createApp() {
  const app = new Hono();
  app.get("/health", (c) => c.json({ ok: true }));
  return app;
}
```

- [ ] **Step 6: Run install, typecheck, and the smoke test**

Run: `npx pnpm install && npx pnpm run typecheck && npx pnpm run test -- --run apps/api/tests/integration/workspaceSmoke.test.ts`  
Expected: PASS with `1 passed`

- [ ] **Step 7: Commit the bootstrap**

```bash
git add .gitignore .editorconfig package.json pnpm-workspace.yaml tsconfig.base.json vitest.workspace.ts playwright.config.ts packages/shared apps/api apps/web apps/connector
git commit -m "chore: bootstrap trendyol etsy workspace"
```
## Task 2: Create the Cloudflare API foundation and D1 schema

**Files:**
- Create: `apps/api/wrangler.toml`
- Create: `apps/api/drizzle.config.ts`
- Create: `apps/api/src/worker.ts`
- Create: `apps/api/src/config/bindings.ts`
- Create: `apps/api/src/db/client.ts`
- Create: `apps/api/src/db/schema.ts`
- Create: `apps/api/drizzle/0000_initial.sql`
- Create: `apps/api/src/db/repositories/productsRepo.ts`
- Create: `apps/api/src/db/repositories/historyRepo.ts`
- Create: `apps/api/src/db/repositories/notificationsRepo.ts`
- Create: `apps/api/src/db/repositories/draftsRepo.ts`
- Create: `apps/api/src/db/repositories/settingsRepo.ts`
- Test: `apps/api/tests/integration/schema.test.ts`

- [ ] **Step 1: Write the failing schema integration test**

```ts
it("creates all MVP tables", async () => {
  const tables = await listTables(env.DB);
  expect(tables).toEqual(
    expect.arrayContaining([
      "products",
      "product_variants",
      "product_current_state",
      "price_history",
      "stock_history",
      "notifications",
      "etsy_drafts",
      "ai_profiles",
      "app_settings"
    ])
  );
});
```

- [ ] **Step 2: Run the schema test to verify it fails**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/schema.test.ts`  
Expected: FAIL because the migration and schema files do not exist yet

- [ ] **Step 3: Define the D1 tables, enums, and indexes**

```ts
export const products = sqliteTable("products", {
  id: text("id").primaryKey(),
  trendyolUrl: text("trendyol_url").notNull().unique(),
  sourceProductId: text("source_product_id"),
  status: text("status").notNull(),
  parseStatus: text("parse_status").notNull(),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" })
});
```

- [ ] **Step 4: Add the initial SQL migration and typed Worker bindings**

```toml
name = "trendyol-etsy-api"
main = "src/worker.ts"
compatibility_date = "2026-03-19"

[[d1_databases]]
binding = "DB"
database_name = "trendyol-etsy"
```

- [ ] **Step 5: Implement repository helpers and the Worker entrypoint**

```ts
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return createApp(env, ctx).fetch(request, env, ctx);
  }
};
```

- [ ] **Step 6: Run migrations and the schema test**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/schema.test.ts`  
Expected: PASS with the table list assertion succeeding

- [ ] **Step 7: Commit the schema foundation**

```bash
git add apps/api/wrangler.toml apps/api/drizzle.config.ts apps/api/src apps/api/drizzle apps/api/tests/integration/schema.test.ts
git commit -m "feat: add cloudflare api and d1 schema foundation"
```

## Task 3: Implement Trendyol link intake, normalization, and HTML parsing

**Files:**
- Create: `apps/api/src/modules/tracking/normalizeTrendyolUrl.ts`
- Create: `apps/api/src/modules/tracking/extractSourceProductId.ts`
- Create: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Create: `apps/api/src/modules/scraping/fetchTrendyolHtml.ts`
- Create: `apps/api/src/modules/scraping/parseTrendyolProduct.ts`
- Create: `apps/api/src/modules/scraping/parseErrors.ts`
- Create: `apps/api/src/routes/tracking.ts`
- Create: `apps/api/tests/fixtures/trendyol/basic-product.html`
- Create: `apps/api/tests/fixtures/trendyol/product-with-variants.html`
- Create: `apps/api/tests/fixtures/trendyol/product-unavailable.html`
- Create: `apps/api/tests/unit/normalizeTrendyolUrl.test.ts`
- Create: `apps/api/tests/unit/parseTrendyolProduct.test.ts`
- Create: `apps/api/tests/integration/addTrackedProduct.test.ts`

- [ ] **Step 1: Write the failing normalization and parser tests**

```ts
it("normalizes Trendyol URLs for duplicate detection", () => {
  expect(
    normalizeTrendyolUrl("https://www.trendyol.com/brand/item-p-123?boutiqueId=1&merchantId=2")
  ).toBe("https://www.trendyol.com/brand/item-p-123");
});

it("extracts variant-aware product data from a fixture", () => {
  const parsed = parseTrendyolProduct(readFixture("product-with-variants.html"));
  expect(parsed.variants[0]).toEqual(
    expect.objectContaining({ option1: "S", option2: "Siyah", stockState: "IN_STOCK" })
  );
});
```

- [ ] **Step 2: Write the failing add-product integration test**

```ts
it("creates a tracked product and rejects a duplicate normalized URL", async () => {
  const first = await postTrackedProduct(app, sampleUrl);
  const second = await postTrackedProduct(app, `${sampleUrl}?merchantId=999`);
  expect(first.status).toBe(201);
  expect(second.status).toBe(409);
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/normalizeTrendyolUrl.test.ts apps/api/tests/unit/parseTrendyolProduct.test.ts apps/api/tests/integration/addTrackedProduct.test.ts`  
Expected: FAIL with missing parser/tracking modules

- [ ] **Step 4: Implement URL cleanup, source ID extraction, fetch, and the Cheerio parser**

```ts
export function normalizeTrendyolUrl(rawUrl: string) {
  const url = new URL(rawUrl);
  url.search = "";
  return url.toString().replace(/\/+$/, "");
}
```

```ts
export function parseTrendyolProduct(html: string): ParsedProduct {
  const $ = load(html);
  return {
    title: $("h1").first().text().trim(),
    variants: readVariants($)
  };
}
```

- [ ] **Step 5: Implement `POST /tracking/products` and persist the first snapshot**

```ts
tracking.post("/products", zValidator("json", addTrackedProductSchema), async (c) => {
  const result = await createTrackedProduct(c.env, c.req.valid("json"));
  return c.json(result.body, result.status);
});
```

- [ ] **Step 6: Run the unit and integration tests**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/normalizeTrendyolUrl.test.ts apps/api/tests/unit/parseTrendyolProduct.test.ts apps/api/tests/integration/addTrackedProduct.test.ts`  
Expected: PASS with normalization, parsing, and duplicate handling all green

- [ ] **Step 7: Commit the intake and parser work**

```bash
git add apps/api/src/modules/tracking apps/api/src/modules/scraping apps/api/src/routes/tracking.ts apps/api/tests/fixtures/trendyol apps/api/tests/unit/normalizeTrendyolUrl.test.ts apps/api/tests/unit/parseTrendyolProduct.test.ts apps/api/tests/integration/addTrackedProduct.test.ts
git commit -m "feat: add trendyol intake and parser"
```

## Task 4: Add refresh diffing, price/stock history, and notifications

**Files:**
- Create: `apps/api/src/modules/sync/diffProductState.ts`
- Create: `apps/api/src/modules/sync/applyProductRefresh.ts`
- Create: `apps/api/src/routes/products.ts`
- Create: `apps/api/src/routes/notifications.ts`
- Create: `apps/api/tests/unit/diffProductState.test.ts`
- Create: `apps/api/tests/integration/processRefreshJob.test.ts`

- [ ] **Step 1: Write the failing diff engine tests**

```ts
it("updates min and max price without duplicating unchanged price history", () => {
  const result = diffProductState(previousSnapshot, incomingSamePrice);
  expect(result.priceHistory).toHaveLength(0);
  expect(result.currentState.minPrice).toBe(34900);
  expect(result.currentState.maxPrice).toBe(42900);
});

it("creates stock history only when a variant state changes", () => {
  const result = diffProductState(previousSnapshot, incomingStockDrop);
  expect(result.stockHistory).toHaveLength(1);
});
```

- [ ] **Step 2: Write the failing refresh integration test**

```ts
it("marks parse failures without deleting the product", async () => {
  const response = await processRefreshJob(env, { productId, htmlFixture: "product-unavailable.html" });
  expect(response.product.parseStatus).toBe("REVIEW_NEEDED");
  expect(response.notifications[0].type).toBe("PARSE_ERROR");
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/diffProductState.test.ts apps/api/tests/integration/processRefreshJob.test.ts`  
Expected: FAIL because the sync modules are not implemented

- [ ] **Step 4: Implement the diff engine and history writers**

```ts
export function diffProductState(previous: Snapshot, incoming: Snapshot): ChangeSet {
  return {
    priceHistory: buildPriceChanges(previous, incoming),
    stockHistory: buildStockChanges(previous.variants, incoming.variants),
    currentState: buildCurrentState(previous.currentState, incoming)
  };
}
```

- [ ] **Step 5: Apply refreshes transactionally and emit notifications**

```ts
await db.transaction(async (tx) => {
  await saveVariants(tx, incoming.variants);
  await saveCurrentState(tx, changeSet.currentState);
  await insertHistory(tx, changeSet);
  await insertNotifications(tx, changeSet.notifications);
});
```

- [ ] **Step 6: Run the diff and refresh tests**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/diffProductState.test.ts apps/api/tests/integration/processRefreshJob.test.ts`  
Expected: PASS with correct min/max, history rules, and parse-error handling

- [ ] **Step 7: Commit the sync layer**

```bash
git add apps/api/src/modules/sync apps/api/src/routes/products.ts apps/api/src/routes/notifications.ts apps/api/tests/unit/diffProductState.test.ts apps/api/tests/integration/processRefreshJob.test.ts
git commit -m "feat: add refresh diffing and notifications"
```
## Task 5: Implement the scheduler and queue-driven 5-hour refresh loop

**Files:**
- Create: `apps/api/src/modules/scheduler/enqueueTrackedProducts.ts`
- Create: `apps/api/src/modules/scheduler/processRefreshJob.ts`
- Modify: `apps/api/src/worker.ts`
- Modify: `apps/api/src/db/repositories/settingsRepo.ts`
- Create: `apps/api/src/routes/settings.ts`
- Create: `apps/api/tests/integration/scheduler.test.ts`

- [ ] **Step 1: Write the failing scheduler integration test**

```ts
it("enqueues active products only when the refresh interval window has elapsed", async () => {
  await seedSettings(env.DB, { refreshIntervalHours: 5 });
  await runScheduledHandler(env, "2026-03-19T10:00:00.000Z");
  expect(await readQueuedProductIds(env)).toEqual(["prod_1", "prod_2"]);
});
```

- [ ] **Step 2: Run the scheduler test to verify it fails**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/scheduler.test.ts`  
Expected: FAIL because no scheduled or queue handlers exist yet

- [ ] **Step 3: Implement product selection, queue payloads, and hourly gate logic**

```ts
export async function enqueueTrackedProducts(env: Env, now: Date) {
  const settings = await getSettings(env.DB);
  const products = await listProductsDueForRefresh(env.DB, now, settings.refreshIntervalHours);
  await Promise.all(products.map((product) => env.REFRESH_QUEUE.send({ productId: product.id })));
}
```

- [ ] **Step 4: Wire the Worker `scheduled` and `queue` entrypoints**

```ts
export default {
  scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(enqueueTrackedProducts(env, new Date(controller.scheduledTime)));
  },
  queue(batch: MessageBatch<RefreshJob>, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(handleBatch(batch, env));
  }
};
```

- [ ] **Step 5: Expose `GET/PATCH /settings` for the single-user interval and prompt preferences**

```ts
settings.patch("/", zValidator("json", settingsSchema), async (c) => {
  const saved = await saveSettings(c.env.DB, c.req.valid("json"));
  return c.json(saved);
});
```

- [ ] **Step 6: Run the scheduler test and the existing refresh integration suite**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/scheduler.test.ts apps/api/tests/integration/processRefreshJob.test.ts`  
Expected: PASS with products queued once per window and processed successfully

- [ ] **Step 7: Commit the refresh orchestration**

```bash
git add apps/api/src/modules/scheduler apps/api/src/worker.ts apps/api/src/routes/settings.ts apps/api/src/db/repositories/settingsRepo.ts apps/api/tests/integration/scheduler.test.ts
git commit -m "feat: add scheduled refresh orchestration"
```

## Task 6: Build read APIs for the tracking center, product detail, notifications, and settings

**Files:**
- Create: `apps/api/src/modules/tracking/buildTrackingListView.ts`
- Create: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Modify: `apps/api/src/routes/tracking.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/api/src/routes/notifications.ts`
- Modify: `apps/api/src/routes/settings.ts`
- Create: `apps/api/tests/integration/listViews.test.ts`

- [ ] **Step 1: Write the failing list/detail integration test**

```ts
it("returns dashboard cards, filters, and product detail sections", async () => {
  const list = await app.request("/tracking/products");
  const detail = await app.request(`/products/${seededProductId}`);
  expect((await list.json()).summary.trackedCount).toBeGreaterThan(0);
  expect((await detail.json()).variants[0]).toEqual(expect.objectContaining({ option1: "S" }));
  expect((await detail.json()).priceHistory).toHaveLength(1);
});
```

- [ ] **Step 2: Run the list/detail test to verify it fails**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/listViews.test.ts`  
Expected: FAIL because the read-model builders and routes are incomplete

- [ ] **Step 3: Implement the tracking list and summary read models**

```ts
export async function buildTrackingListView(db: DB, filters: TrackingFilters) {
  return {
    summary: await getTrackingSummary(db),
    items: await getTrackingCards(db, filters)
  };
}
```

- [ ] **Step 4: Implement the product detail, notifications, and settings response shapes**

```ts
export async function buildProductDetailView(db: DB, productId: string) {
  return {
    product: await getProduct(db, productId),
    variants: await getVariants(db, productId),
    priceHistory: await getPriceHistory(db, productId),
    stockHistory: await getStockHistory(db, productId)
  };
}
```

- [ ] **Step 5: Run the list/detail test and the existing API suite**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/addTrackedProduct.test.ts apps/api/tests/integration/processRefreshJob.test.ts`  
Expected: PASS with usable dashboard/detail JSON payloads

- [ ] **Step 6: Commit the read API layer**

```bash
git add apps/api/src/modules/tracking/buildTrackingListView.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/src/routes/tracking.ts apps/api/src/routes/products.ts apps/api/src/routes/notifications.ts apps/api/src/routes/settings.ts apps/api/tests/integration/listViews.test.ts
git commit -m "feat: add dashboard and detail read apis"
```

## Task 7: Build the web shell and Link Tracking Center

**Files:**
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/index.html`
- Create: `apps/web/postcss.config.cjs`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles/index.css`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/queryClient.ts`
- Create: `apps/web/src/app/api.ts`
- Create: `apps/web/src/app/shell/AppShell.tsx`
- Create: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Create: `apps/web/src/features/tracking/components/AddLinkForm.tsx`
- Create: `apps/web/src/features/tracking/components/ProductCard.tsx`
- Create: `apps/web/src/features/tracking/components/TrackingFilters.tsx`
- Create: `apps/web/src/features/shared/components/StatusBadge.tsx`
- Create: `apps/web/src/features/shared/components/StatCard.tsx`
- Create: `apps/web/src/test/test-utils.tsx`
- Create: `apps/web/src/features/tracking/components/AddLinkForm.test.tsx`
- Create: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`

- [ ] **Step 1: Write the failing tracking center UI tests**

```tsx
it("submits a Trendyol URL and shows validation errors inline", async () => {
  render(<AddLinkForm />);
  await userEvent.click(screen.getByRole("button", { name: /ekle/i }));
  expect(screen.getByText(/trendyol linki gerekli/i)).toBeInTheDocument();
});

it("renders summary cards and product cards from the API response", async () => {
  render(<TrackingCenterPage />);
  expect(await screen.findByText(/takipte/i)).toBeInTheDocument();
  expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the web tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/tracking/components/AddLinkForm.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`  
Expected: FAIL because the Vite app, router, and components do not exist

- [ ] **Step 3: Implement the app shell, theme tokens, and shared API client**

```tsx
export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <aside className="bg-[#051125] text-white">...</aside>
      <main>{children}</main>
    </div>
  );
}
```

- [ ] **Step 4: Implement the tracking page, add-link form, filters, and product cards**

```tsx
export function AddLinkForm() {
  const mutation = useAddTrackedProduct();
  return <form onSubmit={handleSubmit}>...</form>;
}
```

- [ ] **Step 5: Run the tracking center tests**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/tracking/components/AddLinkForm.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`  
Expected: PASS with validation, query loading, and render states all green

- [ ] **Step 6: Commit the dashboard shell**

```bash
git add apps/web
git commit -m "feat: add tracking center dashboard"
```
## Task 8: Build Product Detail, history views, and Notifications

**Files:**
- Create: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Create: `apps/web/src/features/product/components/ProductSummary.tsx`
- Create: `apps/web/src/features/product/components/VariantTable.tsx`
- Create: `apps/web/src/features/product/components/HistoryTimeline.tsx`
- Create: `apps/web/src/features/notifications/routes/NotificationsPage.tsx`
- Create: `apps/web/src/features/notifications/components/NotificationList.tsx`
- Create: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Write the failing product detail and notifications tests**

```tsx
it("shows variant rows and price history on the product detail screen", async () => {
  render(<ProductDetailPage />, { route: `/products/${productId}` });
  expect(await screen.findByText(/varyasyon matrisi/i)).toBeInTheDocument();
  expect(await screen.findByText(/en düþük/i)).toBeInTheDocument();
});

it("renders unread notifications grouped by severity", async () => {
  render(<NotificationsPage />);
  expect(await screen.findByText(/parse hatasý/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/product/routes/ProductDetailPage.test.tsx`  
Expected: FAIL because the detail and notifications pages are missing

- [ ] **Step 3: Implement the product summary, variant table, and history timeline**

```tsx
export function ProductSummary({ detail }: { detail: ProductDetailResponse }) {
  return (
    <section>
      <StatCard label="Güncel" value={formatPrice(detail.currentState.currentPrice)} />
    </section>
  );
}
```

- [ ] **Step 4: Implement the notifications page and unread/read interactions**

```tsx
export function NotificationList({ items }: { items: NotificationItem[] }) {
  return items.map((item) => <StatusBadge key={item.id} status={item.severity} />);
}
```

- [ ] **Step 5: Run the detail and notifications tests**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/product/routes/ProductDetailPage.test.tsx`  
Expected: PASS with variant, history, and notification views working

- [ ] **Step 6: Commit the detail and notifications UI**

```bash
git add apps/web/src/features/product apps/web/src/features/notifications apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: add product detail and notifications views"
```

## Task 9: Build the Etsy draft editor and manual edit protection

**Files:**
- Create: `apps/api/src/modules/ai/buildDraftPrompt.ts`
- Create: `apps/api/src/modules/ai/mergeGeneratedDraft.ts`
- Create: `apps/api/src/routes/drafts.ts`
- Create: `apps/api/tests/unit/buildDraftPrompt.test.ts`
- Create: `apps/api/tests/unit/mergeGeneratedDraft.test.ts`
- Create: `apps/api/tests/integration/draftFlows.test.ts`
- Create: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`
- Create: `apps/web/src/features/drafts/components/DraftEditor.tsx`
- Create: `apps/web/src/features/drafts/components/SourceProductPanel.tsx`
- Create: `apps/web/src/features/drafts/components/DraftEditor.test.tsx`

- [ ] **Step 1: Write the failing draft domain tests**

```ts
it("builds a prompt payload that includes source product, variants, and etsy constraints", () => {
  const prompt = buildDraftPrompt(seedProductDetail);
  expect(prompt.instructions).toContain("13 tags");
  expect(prompt.source.variants).toHaveLength(3);
});

it("does not overwrite manually edited fields unless overwrite is explicit", () => {
  const merged = mergeGeneratedDraft(existingDraftWithEdits, generatedPayload, { overwrite: false });
  expect(merged.englishTitle).toBe(existingDraftWithEdits.englishTitle);
});
```

- [ ] **Step 2: Write the failing draft editor test**

```tsx
it("marks fields as manually edited and disables silent overwrite", async () => {
  render(<DraftEditor />);
  await userEvent.type(screen.getByLabelText(/english title/i), "Custom title");
  expect(screen.getByText(/manuel düzenleme var/i)).toBeInTheDocument();
});
```

- [ ] **Step 3: Run the draft tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/buildDraftPrompt.test.ts apps/api/tests/unit/mergeGeneratedDraft.test.ts apps/api/tests/integration/draftFlows.test.ts && npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/drafts/components/DraftEditor.test.tsx`  
Expected: FAIL because the draft modules and editor components are missing

- [ ] **Step 4: Implement the draft prompt builder, merge rules, and API endpoints**

```ts
export function mergeGeneratedDraft(existing: EtsyDraft, incoming: GeneratedDraft, options: { overwrite: boolean }) {
  return {
    ...existing,
    englishTitle: existing.manualEditsPresent && !options.overwrite ? existing.englishTitle : incoming.englishTitle
  };
}
```

- [ ] **Step 5: Implement the SEO editor and source-vs-output split pane**

```tsx
export function SeoEditorPage() {
  return (
    <div className="grid grid-cols-2 gap-6">
      <SourceProductPanel />
      <DraftEditor />
    </div>
  );
}
```

- [ ] **Step 6: Run the draft API and UI tests**

Run: `npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/unit/buildDraftPrompt.test.ts apps/api/tests/unit/mergeGeneratedDraft.test.ts apps/api/tests/integration/draftFlows.test.ts && npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/drafts/components/DraftEditor.test.tsx`  
Expected: PASS with prompt construction, overwrite protection, and manual edit flags verified

- [ ] **Step 7: Commit the draft editor layer**

```bash
git add apps/api/src/modules/ai apps/api/src/routes/drafts.ts apps/api/tests/unit/buildDraftPrompt.test.ts apps/api/tests/unit/mergeGeneratedDraft.test.ts apps/api/tests/integration/draftFlows.test.ts apps/web/src/features/drafts
git commit -m "feat: add etsy draft editor and edit protection"
```

## Task 10: Build the local AI connector service

**Files:**
- Create: `apps/connector/.env.example`
- Create: `apps/connector/src/index.ts`
- Create: `apps/connector/src/server.ts`
- Create: `apps/connector/src/config.ts`
- Create: `apps/connector/src/store/profileStore.ts`
- Create: `apps/connector/src/providers/base.ts`
- Create: `apps/connector/src/providers/mockProvider.ts`
- Create: `apps/connector/src/providers/chatgptWebProvider.ts`
- Create: `apps/connector/src/browser/browserSession.ts`
- Create: `apps/connector/src/browser/runPrompt.ts`
- Create: `apps/connector/src/routes/health.ts`
- Create: `apps/connector/src/routes/profiles.ts`
- Create: `apps/connector/src/routes/generate.ts`
- Create: `apps/connector/tests/unit/profileStore.test.ts`
- Create: `apps/connector/tests/unit/mockProvider.test.ts`
- Create: `apps/connector/tests/integration/server.test.ts`

- [ ] **Step 1: Write the failing connector tests**

```ts
it("persists profiles without storing raw session secrets in API payloads", async () => {
  const store = createProfileStore(tmpDir);
  await store.saveProfile({ id: "primary", emailMasked: "wo***@company.com", provider: "chatgpt-web" });
  expect(await store.listProfiles()).toHaveLength(1);
});

it("returns connector health and active profile from the local server", async () => {
  const res = await request(server).get("/health");
  expect(res.body.status).toBe("online");
});
```

- [ ] **Step 2: Run the connector tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/connector run test -- --run tests/unit/profileStore.test.ts tests/unit/mockProvider.test.ts tests/integration/server.test.ts`  
Expected: FAIL because the connector server and providers do not exist

- [ ] **Step 3: Implement the Fastify server, local profile store, and mock provider**

```ts
export interface AIProvider {
  listProfiles(): Promise<ConnectorProfile[]>;
  activateProfile(profileId: string): Promise<void>;
  generate(request: GenerateRequest): Promise<GenerateResponse>;
}
```

- [ ] **Step 4: Implement the Playwright-backed `chatgpt-web` provider behind the same interface**

```ts
export class ChatGptWebProvider implements AIProvider {
  async generate(request: GenerateRequest) {
    const page = await this.browserSession.ensurePage();
    return runPrompt(page, request);
  }
}
```

- [ ] **Step 5: Expose `/health`, `/profiles`, `/profiles/:id/activate`, and `/generate`**

```ts
server.get("/health", async () => ({
  status: "online",
  activeProfile: await store.getActiveProfile()
}));
```

- [ ] **Step 6: Run the connector test suite**

Run: `npx pnpm --filter @trendyol-etsy/connector run test -- --run tests/unit/profileStore.test.ts tests/unit/mockProvider.test.ts tests/integration/server.test.ts`  
Expected: PASS with deterministic mock coverage and local API endpoints green

- [ ] **Step 7: Commit the connector service**

```bash
git add apps/connector
git commit -m "feat: add local ai connector service"
```
## Task 11: Integrate connector-backed generation, AI Connections, and Settings UI

**Files:**
- Create: `apps/api/src/modules/ai/syncProfileMetadata.ts`
- Create: `apps/api/src/routes/aiProfiles.ts`
- Modify: `apps/api/src/routes/drafts.ts`
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/connections/routes/AIConnectionsPage.tsx`
- Create: `apps/web/src/features/connections/components/ConnectorStatusCard.tsx`
- Create: `apps/web/src/features/settings/routes/SettingsPage.tsx`
- Create: `apps/web/src/features/settings/components/SettingsForm.tsx`
- Create: `apps/web/src/features/connections/routes/AIConnectionsPage.test.tsx`
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`
- Modify: `apps/web/src/features/drafts/components/DraftEditor.tsx`

- [ ] **Step 1: Write the failing connector integration tests**

```tsx
it("shows local connector status, active account, and account switching actions", async () => {
  render(<AIConnectionsPage />);
  expect(await screen.findByText(/chatgpt workspace baðlý/i)).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /aktif yap/i })).toBeEnabled();
});

it("runs draft generation through the connector and saves the result via the API", async () => {
  render(<SeoEditorPage />);
  await userEvent.click(await screen.findByRole("button", { name: /baþlýk üret/i }));
  expect(await screen.findByDisplayValue(/handmade/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the UI/API integration tests to verify they fail**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/connections/routes/AIConnectionsPage.test.tsx src/features/drafts/components/DraftEditor.test.tsx && npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/draftFlows.test.ts`  
Expected: FAIL because connector sync routes and browser-side connector calls are not wired

- [ ] **Step 3: Implement connector metadata sync and API endpoints**

```ts
aiProfiles.post("/sync", zValidator("json", profileSyncSchema), async (c) => {
  const saved = await syncProfileMetadata(c.env.DB, c.req.valid("json"));
  return c.json(saved);
});
```

- [ ] **Step 4: Implement browser-side connector client flows**

```ts
const connector = {
  health: () => fetch("http://127.0.0.1:4317/health").then((r) => r.json()),
  generate: (payload: GenerateRequest) => fetch("http://127.0.0.1:4317/generate", { method: "POST", body: JSON.stringify(payload) }).then((r) => r.json())
};
```

- [ ] **Step 5: Add the AI Connections page, settings form, and field-level generate actions**

```tsx
<button onClick={() => generateField("englishTitle")} disabled={!connectorOnline}>
  Baþlýk Üret
</button>
```

- [ ] **Step 6: Run the connector integration tests**

Run: `npx pnpm --filter @trendyol-etsy/web run test -- --run src/features/connections/routes/AIConnectionsPage.test.tsx src/features/drafts/components/DraftEditor.test.tsx && npx pnpm --filter @trendyol-etsy/api run test -- --run apps/api/tests/integration/draftFlows.test.ts`  
Expected: PASS with health, profile sync, generation, and overwrite confirmation working

- [ ] **Step 7: Commit the connector integration**

```bash
git add apps/api/src/modules/ai/syncProfileMetadata.ts apps/api/src/routes/aiProfiles.ts apps/api/src/routes/drafts.ts apps/web/src/app/api.ts apps/web/src/features/connections apps/web/src/features/settings apps/web/src/features/drafts
git commit -m "feat: integrate connector-driven draft generation"
```

## Task 12: Add end-to-end coverage, deployment manifests, and runbooks

**Files:**
- Create: `apps/web/tests/e2e/tracking.spec.ts`
- Create: `apps/web/tests/e2e/draft-generation.spec.ts`
- Create: `docs/runbooks/local-connector.md`
- Create: `docs/runbooks/cloudflare-deploy.md`
- Create: `docs/runbooks/trendyol-fixture-refresh.md`
- Modify: `package.json`

- [ ] **Step 1: Write the failing E2E scenarios**

```ts
test("user adds a Trendyol link and sees it on the tracking center", async ({ page }) => {
  await page.goto("/");
  await page.getByPlaceholder("https://www.trendyol.com/...").fill(seedUrl);
  await page.getByRole("button", { name: "Ekle" }).click();
  await expect(page.getByText("Oversize Hoodie")).toBeVisible();
});

test("user generates and preserves a manually edited Etsy draft", async ({ page }) => {
  await page.goto(`/products/${productId}/seo`);
  await page.getByRole("button", { name: "Baþlýk Üret" }).click();
  await page.getByLabel("English Title").fill("Custom edited title");
  await page.getByRole("button", { name: "Yeniden Üret" }).click();
  await expect(page.getByText(/üzerine yaz/i)).toBeVisible();
});
```

- [ ] **Step 2: Run the E2E suite to verify it fails**

Run: `npx pnpm --filter @trendyol-etsy/web run test:e2e`  
Expected: FAIL because the test harness, seed data, or connector mock wiring is incomplete

- [ ] **Step 3: Add local run scripts and deployment docs**

```json
{
  "scripts": {
    "dev:api": "pnpm --filter @trendyol-etsy/api dev",
    "dev:web": "pnpm --filter @trendyol-etsy/web dev",
    "dev:connector": "pnpm --filter @trendyol-etsy/connector dev",
    "test:e2e": "pnpm --filter @trendyol-etsy/web test:e2e"
  }
}
```

- [ ] **Step 4: Document connector setup, Cloudflare deployment, and fixture refresh rules**

```md
1. Start the connector with the `mock` provider for local development.
2. Use `chatgpt-web` only on a trusted local machine with a logged-in browser profile.
3. Refresh HTML fixtures whenever Trendyol markup changes.
```

- [ ] **Step 5: Run the full verification suite**

Run: `npx pnpm run typecheck && npx pnpm run test && npx pnpm --filter @trendyol-etsy/web run test:e2e`  
Expected: PASS with all unit, integration, and E2E tests green

- [ ] **Step 6: Commit the release-readiness work**

```bash
git add package.json apps/web/tests/e2e docs/runbooks
git commit -m "chore: add e2e coverage and deployment runbooks"
```

## Final Verification Checklist

- [ ] `npx pnpm install`
- [ ] `npx pnpm run typecheck`
- [ ] `npx pnpm run test`
- [ ] `npx pnpm --filter @trendyol-etsy/web run test:e2e`
- [ ] `npx pnpm --filter @trendyol-etsy/api run deploy --dry-run`
- [ ] `npx pnpm --filter @trendyol-etsy/connector run build`

## Manual Review Notes

- This single plan keeps the MVP end-to-end and testable; if you later want parallel execution, the connector can be split into its own follow-up plan without changing the API/web contracts.
- Because delegation was not explicitly requested in this session, this plan was manually reviewed against the spec instead of using a reviewer subagent.
