# Tracking Manual Refresh Progress Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the queue-only bulk refresh button with a manual refresh run system that truly updates product data, shows live progress, and retries failed products only.

**Architecture:** Add D1-backed manual refresh run tables plus focused repository/modules to create runs, process products with a concurrency cap of `20`, and expose run status for polling. On the web side, move the complex button state into a dedicated tracking control component that morphs from button to progress bar, polls the active run, invalidates tracking/detail queries on completion, and shows a compact result popup with `Hatalilari tekrar dene`.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker `waitUntil`, D1/SQLite, React, TanStack Query, Tailwind CSS, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-23-tracking-refresh-all-design.md`
- Manual refresh targets all tracked products, regardless of the active tab.
- Scheduled queue-based refresh stays intact; only the manual button behavior changes.
- Use `c.executionCtx.waitUntil(...)` from the tracking route so the start endpoint returns quickly while the run keeps progressing in the background.
- Use `GET /tracking/products/refresh-runs/active` so a page reload can restore an in-flight progress bar.
- Keep the popup local to the tracking page; do not introduce a global toast system in this iteration.
- Reuse `processRefreshJob` for actual scrape-and-write behavior. Do not duplicate refresh logic.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's subagent review loop.

## File Structure

### API schema and persistence
- Create: `apps/api/drizzle/0002_manual_refresh_runs.sql` - add `manual_refresh_runs` and `manual_refresh_run_items`.
- Modify: `apps/api/src/db/schema.ts` - register the new tables in Drizzle schema exports.
- Create: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts` - create/read/update run and run-item state.
- Modify: `apps/api/tests/integration/schema.test.ts` - assert the new tables exist.

### Manual refresh domain modules
- Modify: `apps/api/src/db/repositories/productsRepo.ts` - expose tracked product ID listing helpers and failed-item product lookups as needed.
- Create: `apps/api/src/modules/tracking/startManualRefreshRun.ts` - create a run for all tracked products.
- Create: `apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts` - create a new run from failed items of a previous run.
- Create: `apps/api/src/modules/tracking/processManualRefreshRun.ts` - execute a run with concurrency `20`, update item states, and finalize counts.
- Create: `apps/api/src/modules/tracking/buildManualRefreshRunView.ts` - shape API responses for polling and popup summaries.
- Modify: `apps/api/src/routes/tracking.ts` - add start/status/active/retry endpoints and wire `waitUntil`.
- Modify: `apps/api/src/modules/tracking/refreshAllTrackedProducts.ts` or delete it if no longer needed by any caller.

### API tests and helpers
- Create: `apps/api/tests/integration/manualRefreshRuns.test.ts` - cover start, active polling, completion counts, partial failures, and retry-failed behavior.
- Modify: `apps/api/tests/integration/trackingActions.test.ts` - remove or replace the old queue-only refresh assertion.
- Optionally create: `apps/api/tests/support/worker.ts` - helper for collecting `waitUntil` promises in route tests if inline objects become noisy.

### Web API surface and tracking UX
- Modify: `apps/web/src/app/api.ts` - add manual refresh run request/response types plus start/status/active/retry helpers.
- Create: `apps/web/src/features/tracking/components/BulkRefreshControl.tsx` - own the button-to-progress morph, polling, popup, and retry action.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx` - replace the old bulk-refresh mutation with `BulkRefreshControl`.
- Create: `apps/web/src/features/tracking/components/BulkRefreshControl.test.tsx` - cover progress updates, completion popup, and retry-failed rendering.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx` - keep page-level rendering coverage and ensure the control is mounted in the tabs row.

## Task 1: Add migration-backed persistence for manual refresh runs

**Files:**
- Create: `apps/api/drizzle/0002_manual_refresh_runs.sql`
- Modify: `apps/api/src/db/schema.ts`
- Create: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`

- [ ] **Step 1: Write the failing schema assertions**

```ts
const tables = sqlite.prepare(
  "select name from sqlite_master where type = 'table' order by name asc",
).all() as Array<{ name: string }>;

expect(tables).toEqual(
  expect.arrayContaining([
    { name: "manual_refresh_runs" },
    { name: "manual_refresh_run_items" },
  ]),
);
```

- [ ] **Step 2: Run the focused schema test to confirm the tables do not exist yet**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts`
Expected: FAIL because `manual_refresh_runs` and `manual_refresh_run_items` are missing.

- [ ] **Step 3: Add the migration and schema entries**

```sql
create table manual_refresh_runs (
  id text primary key not null,
  scope text not null,
  source_run_id text,
  status text not null,
  total_count integer not null default 0,
  pending_count integer not null default 0,
  running_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  started_at integer,
  finished_at integer,
  created_at integer not null,
  updated_at integer not null
);

create table manual_refresh_run_items (
  id text primary key not null,
  run_id text not null,
  product_id text not null,
  status text not null,
  attempt_count integer not null default 0,
  error_message text,
  started_at integer,
  finished_at integer,
  created_at integer not null,
  updated_at integer not null
);
```

```ts
export const manualRefreshRuns = sqliteTable("manual_refresh_runs", {
  id: text("id").primaryKey(),
  scope: text("scope").notNull(),
  sourceRunId: text("source_run_id"),
  status: text("status").notNull(),
  totalCount: integer("total_count").notNull().default(0),
  pendingCount: integer("pending_count").notNull().default(0),
  runningCount: integer("running_count").notNull().default(0),
  successCount: integer("success_count").notNull().default(0),
  failedCount: integer("failed_count").notNull().default(0),
  startedAt: integer("started_at", { mode: "timestamp_ms" }),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});
```

- [ ] **Step 4: Add the run repository skeleton**

```ts
export function createManualRefreshRunsRepo(db: D1Database) {
  return {
    async createRun(input: { productIds: string[]; scope: "ALL" | "FAILED_ONLY"; sourceRunId?: string | null }, now: Date) {
      const runId = crypto.randomUUID();
      // insert run
      // insert one item per product with PENDING status
      return { id: runId };
    },
  };
}
```

- [ ] **Step 5: Re-run the focused schema test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts`
Expected: PASS with the new tables present.

- [ ] **Step 6: Commit the migration groundwork**

```bash
git add apps/api/drizzle/0002_manual_refresh_runs.sql apps/api/src/db/schema.ts apps/api/src/db/repositories/manualRefreshRunsRepo.ts apps/api/tests/integration/schema.test.ts
git commit -m "feat: add manual refresh run persistence"
```

## Task 2: Implement start, polling, completion, and retry-failed on the API side

**Files:**
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Create: `apps/api/src/modules/tracking/startManualRefreshRun.ts`
- Create: `apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts`
- Create: `apps/api/src/modules/tracking/processManualRefreshRun.ts`
- Create: `apps/api/src/modules/tracking/buildManualRefreshRunView.ts`
- Modify: `apps/api/src/routes/tracking.ts`
- Create: `apps/api/tests/integration/manualRefreshRuns.test.ts`
- Modify: `apps/api/tests/integration/trackingActions.test.ts`

- [ ] **Step 1: Write failing integration tests for start, active polling, and retry-failed**

```ts
const waitUntilPromises: Array<Promise<unknown>> = [];

const startResponse = await app.fetch(
  new Request("http://localhost/tracking/products/refresh-runs", { method: "POST" }),
  env,
  {
    waitUntil(promise) {
      waitUntilPromises.push(promise);
    },
  },
);

expect(startResponse.status).toBe(202);

const started = await startResponse.json() as { run: { id: string; totalCount: number; status: string } };
expect(started.run.totalCount).toBe(2);
expect(started.run.status).toBe("RUNNING");

const activeResponse = await app.request("http://localhost/tracking/products/refresh-runs/active", undefined, env);
expect((await activeResponse.json()).run.id).toBe(started.run.id);

await Promise.all(waitUntilPromises);

const completedResponse = await app.request(`http://localhost/tracking/products/refresh-runs/${started.run.id}`, undefined, env);
expect((await completedResponse.json()).run).toEqual(
  expect.objectContaining({
    status: "COMPLETED",
    successCount: 1,
    failedCount: 1,
  }),
);
```

```ts
const retryResponse = await app.fetch(
  new Request(`http://localhost/tracking/products/refresh-runs/${started.run.id}/retry-failed`, { method: "POST" }),
  env,
  {
    waitUntil(promise) {
      retryPromises.push(promise);
    },
  },
);

expect(retryResponse.status).toBe(202);
expect((await retryResponse.json()).run.totalCount).toBe(1);
```

- [ ] **Step 2: Run the focused API test and confirm it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/manualRefreshRuns.test.ts`
Expected: FAIL because the routes and background processor do not exist yet.

- [ ] **Step 3: Add product lookup helpers for manual runs**

```ts
async listTrackedProductIds() {
  const result = await db.prepare(
    "select id from products order by created_at asc",
  ).all<{ id: string }>();

  return result.results.map((item) => item.id);
}

async listFailedRunProductIds(runId: string) {
  const result = await db.prepare(
    `select product_id as productId
     from manual_refresh_run_items
     where run_id = ? and status = 'FAILED'
     order by created_at asc`,
  ).bind(runId).all<{ productId: string }>();

  return result.results.map((item) => item.productId);
}
```

- [ ] **Step 4: Implement start and retry modules**

```ts
export async function startManualRefreshRun(env: Pick<Env, "DB">, now = new Date()) {
  const productIds = await createProductsRepo(env.DB).listTrackedProductIds();
  return createManualRefreshRunsRepo(env.DB).createRun(
    { productIds, scope: "ALL", sourceRunId: null },
    now,
  );
}
```

```ts
export async function retryFailedManualRefreshRun(env: Pick<Env, "DB">, sourceRunId: string, now = new Date()) {
  const productIds = await createProductsRepo(env.DB).listFailedRunProductIds(sourceRunId);
  return createManualRefreshRunsRepo(env.DB).createRun(
    { productIds, scope: "FAILED_ONLY", sourceRunId },
    now,
  );
}
```

- [ ] **Step 5: Implement the run processor with concurrency `20`**

```ts
const concurrency = 20;
const queue = [...run.items];

async function workerLoop() {
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) return;

    await runsRepo.markItemRunning(run.id, item.productId, now);
    try {
      await processRefreshJob(env, { productId: item.productId }, options);
      await runsRepo.markItemSucceeded(run.id, item.productId, new Date());
    } catch (error) {
      await runsRepo.markItemFailed(
        run.id,
        item.productId,
        error instanceof Error ? error.message : "Unknown refresh error",
        new Date(),
      );
    }
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => workerLoop()));
await runsRepo.completeRun(run.id, new Date());
```

- [ ] **Step 6: Expose the tracking routes and wire `waitUntil`**

```ts
app.post("/products/refresh-runs", async (c) => {
  const run = await startManualRefreshRun(c.env);
  c.executionCtx.waitUntil(processManualRefreshRun(c.env, run.id));
  return c.json({ run: await buildManualRefreshRunView(c.env.DB, run.id) }, 202);
});

app.get("/products/refresh-runs/active", async (c) => {
  return c.json({ run: await buildActiveManualRefreshRunView(c.env.DB) });
});

app.get("/products/refresh-runs/:runId", async (c) => {
  return c.json({ run: await buildManualRefreshRunView(c.env.DB, c.req.param("runId")) });
});

app.post("/products/refresh-runs/:runId/retry-failed", async (c) => {
  const run = await retryFailedManualRefreshRun(c.env, c.req.param("runId"));
  c.executionCtx.waitUntil(processManualRefreshRun(c.env, run.id));
  return c.json({ run: await buildManualRefreshRunView(c.env.DB, run.id) }, 202);
});
```

- [ ] **Step 7: Re-run the manual refresh API test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/manualRefreshRuns.test.ts`
Expected: PASS with `RUNNING` start state, `COMPLETED` end state, and retry-failed creating a one-item run.

- [ ] **Step 8: Commit the API behavior**

```bash
git add apps/api/src/db/repositories/productsRepo.ts apps/api/src/modules/tracking/startManualRefreshRun.ts apps/api/src/modules/tracking/retryFailedManualRefreshRun.ts apps/api/src/modules/tracking/processManualRefreshRun.ts apps/api/src/modules/tracking/buildManualRefreshRunView.ts apps/api/src/routes/tracking.ts apps/api/tests/integration/manualRefreshRuns.test.ts apps/api/tests/integration/trackingActions.test.ts
git commit -m "feat: add manual refresh run api"
```

## Task 3: Build the tracking-page progress bar, polling, and result popup

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/tracking/components/BulkRefreshControl.tsx`
- Create: `apps/web/src/features/tracking/components/BulkRefreshControl.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`

- [ ] **Step 1: Write a failing component test for start, progress, completion, and retry-failed**

```tsx
renderWithProviders(<BulkRefreshControl />);

await user.click(screen.getByRole("button", { name: /tum urunleri yenile/i }));

expect(await screen.findByText(/urun verileri yenileniyor/i)).toBeInTheDocument();
expect(await screen.findByText(/12 \/ 40/i)).toBeInTheDocument();

expect(await screen.findByText(/37 urun guncellendi, 3 urun hata verdi/i)).toBeInTheDocument();
expect(screen.getByRole("button", { name: /hatalilari tekrar dene/i })).toBeInTheDocument();
expect(screen.getByRole("button", { name: /tum urunleri yenile/i })).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused web test and confirm it fails**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/BulkRefreshControl.test.tsx`
Expected: FAIL because the control, polling, and popup do not exist yet.

- [ ] **Step 3: Extend the web API client with manual refresh helpers**

```ts
export interface ManualRefreshRunSummary {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED";
  totalCount: number;
  pendingCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  startedAt: number | null;
  finishedAt: number | null;
  scope: "ALL" | "FAILED_ONLY";
  sourceRunId: string | null;
}

export async function startManualRefreshRun() {
  const response = await fetchWithTimeout("/tracking/products/refresh-runs", { method: "POST" });
  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}
```

```ts
export async function fetchActiveManualRefreshRun() {
  const response = await fetchWithTimeout("/tracking/products/refresh-runs/active");
  return parseJson<{ run: ManualRefreshRunSummary | null }>(response);
}

export async function fetchManualRefreshRun(runId: string) {
  const response = await fetchWithTimeout(`/tracking/products/refresh-runs/${runId}`);
  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

export async function retryFailedManualRefreshRun(runId: string) {
  const response = await fetchWithTimeout(`/tracking/products/refresh-runs/${runId}/retry-failed`, {
    method: "POST",
  });
  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}
```

- [ ] **Step 4: Implement `BulkRefreshControl.tsx`**

```tsx
const activeRunQuery = useQuery({
  queryKey: ["tracking-refresh-run", "active"],
  queryFn: fetchActiveManualRefreshRun,
});

const runStatusQuery = useQuery({
  queryKey: ["tracking-refresh-run", runId],
  enabled: Boolean(runId),
  queryFn: () => fetchManualRefreshRun(runId as string),
  refetchInterval: (query) =>
    query.state.data?.run.status === "COMPLETED" ? false : 400,
});
```

```tsx
const completedCount = run.successCount + run.failedCount;
const percent = run.totalCount === 0 ? 0 : Math.round((completedCount / run.totalCount) * 100);

<div className="relative min-w-[280px]">
  <div className="overflow-hidden rounded-2xl border border-sky-200 bg-white">
    <div className="h-2 bg-sky-100">
      <div className="h-full bg-sky-500 transition-[width] duration-300" style={{ width: `${percent}%` }} />
    </div>
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span>Urun verileri yenileniyor...</span>
      <span>{completedCount} / {run.totalCount}</span>
    </div>
  </div>
</div>
```

- [ ] **Step 5: Invalidate tracking and detail queries on completion**

```tsx
useEffect(() => {
  if (!run || run.status !== "COMPLETED") {
    return;
  }

  void queryClient.invalidateQueries({ queryKey: ["tracking-products"] });
  void queryClient.invalidateQueries({ queryKey: ["product-detail"] });
  setResultPopup(run);
  setRunId(null);
}, [queryClient, run]);
```

- [ ] **Step 6: Mount the control in `TrackingCenterPage.tsx` and keep the tabs row layout**

```tsx
<div className="flex flex-wrap items-center justify-between gap-3">
  <div className="flex flex-wrap gap-2">{/* tab buttons */}</div>
  <BulkRefreshControl />
</div>
```

- [ ] **Step 7: Re-run the focused web tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/BulkRefreshControl.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`
Expected: PASS with the bar morph, popup summary, and retry-failed button.

- [ ] **Step 8: Commit the web UX**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/tracking/components/BulkRefreshControl.tsx apps/web/src/features/tracking/components/BulkRefreshControl.test.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
git commit -m "feat: add tracking refresh progress ui"
```

## Task 4: Run the final regression and clean out the obsolete queue-only path

**Files:**
- Modify: `apps/api/src/modules/tracking/refreshAllTrackedProducts.ts` or delete if unused
- Modify: `apps/api/tests/integration/trackingActions.test.ts`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`

- [ ] **Step 1: Remove the stale queue-only manual refresh path**

```ts
// Delete the old module if nothing imports it anymore,
// or rewrite it as a thin compatibility wrapper that calls startManualRefreshRun.
```

- [ ] **Step 2: Run the combined targeted regression**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/manualRefreshRuns.test.ts tests/integration/trackingActions.test.ts tests/integration/schema.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/BulkRefreshControl.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`
Expected: PASS

- [ ] **Step 3: Run package typechecks**

Run: `pnpm --filter @trendyol-etsy/api typecheck`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web typecheck`
Expected: PASS

- [ ] **Step 4: Commit the final integration pass**

```bash
git add apps/api/src/modules/tracking/refreshAllTrackedProducts.ts apps/api/tests/integration/trackingActions.test.ts apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
git commit -m "test: cover manual tracking refresh flow"
```
