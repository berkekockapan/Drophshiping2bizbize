# Central Cloud Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Canli kullanimdaki tum kalici veriyi Cloudflare production D1 uzerinde toplamak, yazma hatalarinda veriyi sessizce kaybetmemek ve acik owner ekranlarini merkezi veriye otomatik yeniden senkron tutmak.

**Architecture:** Web tarafinda ortak bir live-sync query davranisi ve tek tip bulut hata mesaji katmani eklenecek; tracking, detay, bildirim, cop kutusu ve SEO ekranlari bu davranisi kullanacak. API tarafinda retry edilebilir D1 yazma hatalari icin paylasilan bir retry yardimcisi yazilacak ve kritik persistence akislari bu yardimciyla transaction/batch tabanli sekilde sertlestirilecek. Operasyon tarafinda production D1'in tek resmi veri kaynagi oldugu deploy ve rollout runbook'larina acikca yazilacak.

**Tech Stack:** TypeScript, React, TanStack Query, Hono, Cloudflare Workers, Cloudflare D1, Vitest

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-28-central-cloud-persistence-design.md`
- Bu plan tek bir butun teslimattir: web live-sync davranisi, API write retry sertlestirmesi ve production rollout dokumantasyonu birlikte tamamlaninca deger uretir.
- Polling araligi spec ile uyumlu olacak sekilde `10_000ms` sabitlenmelidir.
- Mutation'larda optimistic persistence eklenmeyecek; kullaniciya basari durumu yalnizca sunucu yanitindan sonra gosterilecektir.
- `last write wins` kurali korunacak; cakisma azaltmak icin mevcut hedefli endpoint/repo yazimlari buyutulmeyecek.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### Web live-sync primitives and user-facing cloud errors
- Create: `apps/web/src/features/shared/lib/liveQuery.ts` - merkezi polling/focus/reconnect ayarlari
- Create: `apps/web/src/features/shared/components/LiveSyncStatus.tsx` - "son senkron" ve "son yenileme basarisiz" bildirimi
- Create: `apps/web/src/app/api.test.ts` - `VITE_API_BASE_URL` ve dost hata mesaji kapsami
- Create: `apps/web/src/features/shared/lib/liveQuery.test.ts` - live sync sabitleri ve davranis korumasi
- Modify: `apps/web/src/app/api.ts` - bulut erisimi kesildiginde tek tip hata mesaji
- Modify: `apps/web/src/app/queryClient.ts` - global defaults live ekranlarla cakismayacak sekilde korunacak

### Web pages that must stay fresh across devices
- Create: `apps/web/src/features/notifications/routes/NotificationsPage.test.tsx` - bildirimler polling kapsami
- Create: `apps/web/src/features/drafts/routes/SeoEditorPage.test.tsx` - draft/detail live sync kapsami
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrashPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrashPage.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/src/features/notifications/routes/NotificationsPage.tsx`
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`

### API write-retry and transaction safety
- Create: `apps/api/src/db/runWithWriteRetry.ts` - retry edilebilir D1 yazma hatalari icin ortak yardimci
- Create: `apps/api/tests/integration/runWithWriteRetry.test.ts` - helper unit coverage
- Create: `apps/api/tests/support/flakyD1.ts` - transient D1 hata simulasyonu
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/deleteTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/restoreTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts`
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/db/repositories/notificationsRepo.ts`
- Modify: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts`
- Modify: `apps/api/src/db/repositories/settingsRepo.ts`
- Modify: `apps/api/src/db/repositories/draftsRepo.ts`
- Modify: `apps/api/tests/integration/trackingActions.test.ts`
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts`
- Modify: `apps/api/tests/integration/settings.test.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`

### Production rollout and recovery docs
- Create: `docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md` - bootstrap, smoke test, Time Travel geri donus
- Modify: `docs/deploy/cloudflare.md` - production D1 tek kaynak kurali ve rollout adimlari
- Modify: `docs/runbooks/cloudflare-deploy.md` - canonical deploy + Time Travel referansi

## Task 1: Add web live-sync primitives and cloud-friendly request errors

**Files:**
- Create: `apps/web/src/features/shared/lib/liveQuery.ts`
- Create: `apps/web/src/features/shared/lib/liveQuery.test.ts`
- Create: `apps/web/src/app/api.test.ts`
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/app/queryClient.ts`

- [ ] **Step 1: Write the failing tests for live-sync options and cloud request errors**

```ts
// apps/web/src/features/shared/lib/liveQuery.test.ts
import { describe, expect, it } from "vitest";

import { LIVE_SYNC_INTERVAL_MS, liveSyncQueryOptions } from "./liveQuery";

describe("liveSyncQueryOptions", () => {
  it("keeps the agreed polling and focus behavior", () => {
    expect(LIVE_SYNC_INTERVAL_MS).toBe(10_000);
    expect(liveSyncQueryOptions).toMatchObject({
      staleTime: 0,
      refetchInterval: 10_000,
      refetchOnWindowFocus: "always",
      refetchOnReconnect: true,
    });
  });
});
```

```ts
// apps/web/src/app/api.test.ts
import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchTrackingView } from "./api";

describe("app api", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prefixes owner requests with VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://trendyol-etsy-api.workers.dev");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await fetchTrackingView("berke");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://trendyol-etsy-api.workers.dev/owners/berke/products",
      expect.anything(),
    );
  });

  it("maps network failures to a clear cloud persistence message", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    await expect(fetchTrackingView("berke")).rejects.toThrow(
      "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
    );
  });
});
```

- [ ] **Step 2: Run the new web tests to verify they fail before implementation**

Run: `pnpm --filter @trendyol-etsy/web test -- src/app/api.test.ts src/features/shared/lib/liveQuery.test.ts`

Expected: FAIL because `liveQuery.ts` does not exist and `fetchWithTimeout` still rethrows raw network errors.

- [ ] **Step 3: Implement the shared live-sync constants and the single cloud error message**

```ts
// apps/web/src/features/shared/lib/liveQuery.ts
export const LIVE_SYNC_INTERVAL_MS = 10_000;

export const liveSyncQueryOptions = {
  staleTime: 0,
  refetchInterval: LIVE_SYNC_INTERVAL_MS,
  refetchOnWindowFocus: "always" as const,
  refetchOnReconnect: true,
};
```

```ts
// apps/web/src/app/api.ts
async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(toApiUrl(input), {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Istek zaman asimina ugradi. Lutfen tekrar deneyin.");
    }

    throw new Error(
      "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
```

```ts
// apps/web/src/app/queryClient.ts
import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
      },
      mutations: {
        retry: false,
      },
    },
  });
}
```

- [ ] **Step 4: Re-run the focused web tests and typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- src/app/api.test.ts src/features/shared/lib/liveQuery.test.ts && pnpm --filter @trendyol-etsy/web typecheck`

Expected: PASS, with the request helper now returning the cloud-specific message on network failures.

- [ ] **Step 5: Commit the web live-sync primitives**

```bash
git add apps/web/src/features/shared/lib/liveQuery.ts apps/web/src/features/shared/lib/liveQuery.test.ts apps/web/src/app/api.ts apps/web/src/app/api.test.ts apps/web/src/app/queryClient.ts
git commit -m "feat: add live sync web query primitives"
```

## Task 2: Apply live-sync and stale-data warnings to the owner pages that must stay fresh

**Files:**
- Create: `apps/web/src/features/shared/components/LiveSyncStatus.tsx`
- Create: `apps/web/src/features/notifications/routes/NotificationsPage.test.tsx`
- Create: `apps/web/src/features/drafts/routes/SeoEditorPage.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrashPage.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrashPage.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/src/features/notifications/routes/NotificationsPage.tsx`
- Modify: `apps/web/src/features/drafts/routes/SeoEditorPage.tsx`

- [ ] **Step 1: Write the failing page tests for polling and stale-data messaging**

```tsx
// apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
it("re-fetches the owner list every live-sync interval", async () => {
  vi.useFakeTimers();
  let productCalls = 0;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/owners/berke/categories")) {
      return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    if (url.includes("/owners/berke/products/refresh-runs/active")) {
      return new Response(JSON.stringify({ run: null }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    productCalls += 1;
    return new Response(JSON.stringify(trackingPayload), { status: 200, headers: { "Content-Type": "application/json" } });
  });

  renderWithProviders(<TrackingCenterPage />, {
    route: "/owners/berke/products",
    path: "/owners/:ownerKey/products",
  });

  expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
  await vi.advanceTimersByTimeAsync(10_000);
  await waitFor(() => expect(productCalls).toBeGreaterThanOrEqual(2));
});
```

```tsx
// apps/web/src/features/product/routes/ProductDetailPage.test.tsx
it("keeps the last successful detail on screen and shows a sync warning after a failed refresh", async () => {
  vi.useFakeTimers();
  let shouldFail = false;

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    if (url.includes("/owners/berke/categories")) {
      return jsonResponse(categoriesPayload);
    }
    if (url.includes("/owners/berke/products/prod_1")) {
      if (shouldFail) {
        return new Response(JSON.stringify({ error: "network lost" }), {
          status: 502,
          headers: { "Content-Type": "application/json" },
        });
      }
      return jsonResponse(productDetailPayload);
    }
    throw new Error(`Unhandled request: ${url}`);
  });

  renderWithProviders(<ProductDetailPage />, {
    route: "/owners/berke/products/prod_1",
    path: "/owners/:ownerKey/products/:productId",
  });

  expect(await screen.findByText(/varyasyon matrisi/i)).toBeInTheDocument();
  shouldFail = true;
  await vi.advanceTimersByTimeAsync(10_000);

  expect(await screen.findByText(/son yenileme basarisiz/i)).toBeInTheDocument();
  expect(screen.getByText(/oversize hoodie/i)).toBeInTheDocument();
});
```

```tsx
// apps/web/src/features/notifications/routes/NotificationsPage.test.tsx
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { NotificationsPage } from "./NotificationsPage";

describe("NotificationsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls owner-scoped notifications on the live-sync interval", async () => {
    vi.useFakeTimers();
    let calls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      calls += 1;
      return new Response(JSON.stringify({ items: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<NotificationsPage />, {
      route: "/owners/berke/notifications",
      path: "/owners/:ownerKey/notifications",
    });

    await waitFor(() => expect(calls).toBe(1));
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(calls).toBeGreaterThanOrEqual(2));
  });
});
```

```tsx
// apps/web/src/features/drafts/routes/SeoEditorPage.test.tsx
import "@testing-library/jest-dom/vitest";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { SeoEditorPage } from "./SeoEditorPage";

describe("SeoEditorPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("polls owner-scoped draft data and keeps the current draft visible", async () => {
    vi.useFakeTimers();
    let draftCalls = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/owners/berke/products/prod_1/draft")) {
        draftCalls += 1;
        return new Response(JSON.stringify({ draft: { id: "draft_1", productId: "prod_1", englishTitle: "Draft title", shortDescription: "", longDescription: "", tags: [], materials: [], attributes: [], seoNotes: null, policyNotes: null, generatedVersion: 0, editedVersion: 0, lastGeneratedAt: null, manualEditsPresent: false }, prompt: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/owners/berke/products/prod_1") && !url.includes("/draft")) {
        return new Response(JSON.stringify(productDetailPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SeoEditorPage />, {
      route: "/owners/berke/products/prod_1/seo",
      path: "/owners/:ownerKey/products/:productId/seo",
    });

    expect(await screen.findByDisplayValue(/draft title/i)).toBeInTheDocument();
    await vi.advanceTimersByTimeAsync(10_000);
    await waitFor(() => expect(draftCalls).toBeGreaterThanOrEqual(2));
  });
});
```

- [ ] **Step 2: Run the page tests to capture the missing live-sync behavior**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/routes/TrackingCenterPage.test.tsx src/features/tracking/routes/TrashPage.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/notifications/routes/NotificationsPage.test.tsx src/features/drafts/routes/SeoEditorPage.test.tsx`

Expected: FAIL because the pages do not use the shared live-sync options yet, and there is no shared stale-data status component.

- [ ] **Step 3: Implement the shared status component and wire the pages to the live-sync options**

```tsx
// apps/web/src/features/shared/components/LiveSyncStatus.tsx
interface LiveSyncStatusProps {
  hasData: boolean;
  isFetching: boolean;
  hasBackgroundError: boolean;
  updatedAt: number;
}

function formatTimestamp(updatedAt: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(updatedAt));
}

export function LiveSyncStatus({ hasData, isFetching, hasBackgroundError, updatedAt }: LiveSyncStatusProps) {
  if (hasBackgroundError && hasData) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Son yenileme basarisiz. Ekranda son basarili veri gosteriliyor.
      </p>
    );
  }

  if (!hasData || updatedAt <= 0) {
    return null;
  }

  return (
    <p className="text-sm text-slate-500">
      {isFetching ? "Merkezi bulut verisi yenileniyor..." : `Merkezi bulut verisi son senkron: ${formatTimestamp(updatedAt)}`}
    </p>
  );
}
```

```tsx
// apps/web/src/features/tracking/routes/TrackingCenterPage.tsx
import { LiveSyncStatus } from "../../shared/components/LiveSyncStatus";
import { liveSyncQueryOptions } from "../../shared/lib/liveQuery";

const categoriesQuery = useQuery({
  queryKey: ["product-categories", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
  ...liveSyncQueryOptions,
});

const trackingQuery = useQuery({
  queryKey: ["tracking-products", ownerKey, view, selectedCategoryId],
  enabled: Boolean(ownerKey),
  queryFn: () =>
    fetchTrackingView(ownerKey as OwnerKey, {
      favoriteOnly: view === "favorites",
      categoryId: selectedCategoryId,
    }),
  ...liveSyncQueryOptions,
});

<LiveSyncStatus
  hasData={Boolean(trackingQuery.data)}
  isFetching={trackingQuery.isFetching}
  hasBackgroundError={Boolean(trackingQuery.error && trackingQuery.data)}
  updatedAt={trackingQuery.dataUpdatedAt}
/>
```

```tsx
// apps/web/src/features/tracking/routes/TrashPage.tsx
const trashQuery = useQuery({
  queryKey: ["tracking-trash", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: () => fetchTrashView(ownerKey as OwnerKey),
  ...liveSyncQueryOptions,
});
```

```tsx
// apps/web/src/features/product/routes/ProductDetailPage.tsx
const categoriesQuery = useQuery({
  queryKey: ["product-categories", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: async () => (await fetchProductCategories(ownerKey as OwnerKey)).items,
  ...liveSyncQueryOptions,
});

const detailQuery = useQuery({
  queryKey: ["product-detail", ownerKey, productId],
  enabled: Boolean(ownerKey && productId),
  queryFn: () => fetchProductDetail(ownerKey as OwnerKey, productId as string),
  ...liveSyncQueryOptions,
});
```

```tsx
// apps/web/src/features/notifications/routes/NotificationsPage.tsx
const notificationsQuery = useQuery({
  queryKey: ["notifications", ownerKey],
  enabled: Boolean(ownerKey),
  queryFn: () => fetchNotifications(ownerKey as OwnerKey),
  ...liveSyncQueryOptions,
});
```

```tsx
// apps/web/src/features/drafts/routes/SeoEditorPage.tsx
const detailQuery = useQuery({
  queryKey: ["product-detail", ownerKey, productId],
  queryFn: () => fetchProductDetail(ownerKey as OwnerKey, productId),
  enabled: Boolean(ownerKey && productId),
  ...liveSyncQueryOptions,
});

const draftQuery = useQuery({
  queryKey: ["draft", ownerKey, productId],
  queryFn: () => fetchDraft(ownerKey as OwnerKey, productId),
  enabled: Boolean(ownerKey && productId),
  ...liveSyncQueryOptions,
});
```

- [ ] **Step 4: Re-run the focused web tests plus typecheck**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/routes/TrackingCenterPage.test.tsx src/features/tracking/routes/TrashPage.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/notifications/routes/NotificationsPage.test.tsx src/features/drafts/routes/SeoEditorPage.test.tsx && pnpm --filter @trendyol-etsy/web typecheck`

Expected: PASS, with the owner pages polling every 10 seconds and preserving the last successful data during background failures.

- [ ] **Step 5: Commit the web live-sync rollout**

```bash
git add apps/web/src/features/shared/components/LiveSyncStatus.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx apps/web/src/features/tracking/routes/TrashPage.tsx apps/web/src/features/tracking/routes/TrashPage.test.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/src/features/notifications/routes/NotificationsPage.tsx apps/web/src/features/notifications/routes/NotificationsPage.test.tsx apps/web/src/features/drafts/routes/SeoEditorPage.tsx apps/web/src/features/drafts/routes/SeoEditorPage.test.tsx
git commit -m "feat: sync owner pages with live cloud data"
```

## Task 3: Add retryable D1 write protection to the critical persistence flows

**Files:**
- Create: `apps/api/src/db/runWithWriteRetry.ts`
- Create: `apps/api/tests/integration/runWithWriteRetry.test.ts`
- Create: `apps/api/tests/support/flakyD1.ts`
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/deleteTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/restoreTrackedProduct.ts`
- Modify: `apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts`
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/db/repositories/notificationsRepo.ts`
- Modify: `apps/api/src/db/repositories/manualRefreshRunsRepo.ts`
- Modify: `apps/api/src/db/repositories/settingsRepo.ts`
- Modify: `apps/api/src/db/repositories/draftsRepo.ts`
- Modify: `apps/api/tests/integration/trackingActions.test.ts`
- Modify: `apps/api/tests/integration/manualRefreshRuns.test.ts`
- Modify: `apps/api/tests/integration/settings.test.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`

- [ ] **Step 1: Write the failing helper and integration tests for transient D1 write failures**

```ts
// apps/api/tests/integration/runWithWriteRetry.test.ts
import { describe, expect, it, vi } from "vitest";

import { runWithWriteRetry } from "../../src/db/runWithWriteRetry";

describe("runWithWriteRetry", () => {
  it("retries retryable D1 write failures up to the next successful attempt", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    let attempts = 0;

    const result = await runWithWriteRetry(
      async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error("Network connection lost");
        }
        return "ok";
      },
      { sleep, maxAttempts: 3 },
    );

    expect(result).toBe("ok");
    expect(attempts).toBe(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable validation errors", async () => {
    await expect(
      runWithWriteRetry(async () => {
        throw new Error("UNIQUE constraint failed");
      }),
    ).rejects.toThrow("UNIQUE constraint failed");
  });
});
```

```ts
// apps/api/tests/support/flakyD1.ts
import type { D1Database, D1PreparedStatement } from "../../src/config/bindings";

export function createFlakyD1(db: D1Database, matchers: string[], failCount = 1): D1Database {
  let remaining = failCount;

  function shouldFail(query: string) {
    return remaining > 0 && matchers.some((fragment) => query.includes(fragment));
  }

  return {
    ...db,
    prepare(query: string): D1PreparedStatement {
      const statement = db.prepare(query);
      return {
        ...statement,
        bind(...values: unknown[]) {
          const bound = statement.bind(...values);
          return {
            ...bound,
            async run() {
              if (shouldFail(query)) {
                remaining -= 1;
                throw new Error("Network connection lost");
              }
              return bound.run();
            },
          };
        },
      };
    },
    async batch(statements) {
      if (remaining > 0) {
        remaining -= 1;
        throw new Error("Network connection lost");
      }
      return db.batch ? db.batch(statements) : Promise.all(statements.map((statement) => statement.run()));
    },
  };
}
```

```ts
// apps/api/tests/integration/trackingActions.test.ts
it("retries the initial product write batch when D1 returns a transient error", async () => {
  const { env } = createTestEnv();
  const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
  const flakyEnv = { ...env, DB: createFlakyD1(env.DB, ["insert into products"]) };
  const app = createApp({ fetchImpl });

  const response = await app.request(
    "http://localhost/owners/berke/products",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" }),
    },
    flakyEnv,
  );

  expect(response.status).toBe(201);
});
```

```ts
// apps/api/tests/integration/settings.test.ts
it("retries a transient settings write instead of losing the update", async () => {
  const { env } = createTestEnv();
  const flakyEnv = { ...env, DB: createFlakyD1(env.DB, ["update app_settings", "insert into app_settings"]) };
  const app = createApp();

  const response = await app.request(
    "http://localhost/settings",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshIntervalHours: 12 }),
    },
    flakyEnv,
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ refreshIntervalHours: 12 });
});
```

```ts
// apps/api/tests/integration/draftFlows.test.ts
it("retries transient draft writes and still returns the saved draft", async () => {
  const { env } = createTestEnv();
  const seeded = await createTrackedProduct(
    env,
    { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
      now: new Date("2026-03-20T00:00:00.000Z"),
    },
  );
  const flakyEnv = { ...env, DB: createFlakyD1(env.DB, ["update etsy_drafts", "insert into etsy_drafts"]) };
  const app = createApp();

  const response = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/draft`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ englishTitle: "Recovered title" }),
    },
    flakyEnv,
  );

  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ englishTitle: "Recovered title" });
});
```

- [ ] **Step 2: Run the API tests to confirm the retry layer is missing**

Run: `pnpm --filter @trendyol-etsy/api test -- runWithWriteRetry.test.ts trackingActions.test.ts manualRefreshRuns.test.ts settings.test.ts draftFlows.test.ts`

Expected: FAIL because `runWithWriteRetry.ts` and `flakyD1.ts` do not exist, and the current write paths abort on the first transient failure.

- [ ] **Step 3: Implement the retry helper and wrap the persistence-heavy flows with it**

```ts
// apps/api/src/db/runWithWriteRetry.ts
const RETRYABLE_D1_FRAGMENTS = [
  "Network connection lost",
  "storage caused object to be reset",
  "reset because its code was updated",
];

function defaultSleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export async function runWithWriteRetry<T>(
  operation: () => Promise<T>,
  options: { maxAttempts?: number; sleep?: (delayMs: number) => Promise<void> } = {},
) {
  const maxAttempts = options.maxAttempts ?? 3;
  const sleep = options.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryable = RETRYABLE_D1_FRAGMENTS.some((fragment) => message.includes(fragment));
      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      await sleep(50 * 2 ** (attempt - 1));
    }
  }

  throw new Error("Unreachable retry state");
}
```

```ts
// apps/api/src/modules/tracking/createTrackedProduct.ts
import { runWithWriteRetry } from "../../db/runWithWriteRetry";

const statements = [
  env.DB.prepare(
    `insert into products (
      id, owner_key, trendyol_url, source_product_id, title, brand, category, description_raw, attributes_raw, images_raw,
      status, parse_status, is_favorite, deleted_at, deleted_reason, last_checked_at, created_at, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).bind(
    productId,
    ownerKey,
    normalizedUrl,
    sourceProductId,
    parsed.title,
    parsed.brand,
    parsed.category,
    parsed.descriptionRaw,
    stringify(parsed.attributes),
    stringify(parsed.images),
    "ACTIVE",
    "OK",
    false,
    null,
    null,
    now.getTime(),
    now.getTime(),
    now.getTime(),
  ),
  ...parsed.variants.map((variant) =>
    env.DB
      .prepare(
        `insert into product_variants (
          id, product_id, variant_key, option_1, option_2, option_3, current_stock_state, current_price, last_seen_at, raw_payload
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        productId,
        variant.variantKey,
        variant.option1,
        variant.option2,
        variant.option3,
        variant.stockState,
        variant.price,
        now.getTime(),
        stringify(variant.rawPayload),
      ),
  ),
  env.DB
    .prepare(
      `insert into product_current_state (
        product_id, current_price, min_price, max_price, in_stock_variant_count, total_variant_count, last_change_at, last_checked_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      productId,
      parsed.price,
      parsed.price,
      parsed.price,
      inStockVariantCount,
      parsed.variants.length,
      now.getTime(),
      now.getTime(),
    ),
];

await runWithWriteRetry(async () => {
  if (env.DB.batch) {
    await env.DB.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
});
```

```ts
// apps/api/src/db/repositories/productsRepo.ts
import { runWithWriteRetry } from "../runWithWriteRetry";

await runWithWriteRetry(() =>
  db
    .prepare("update products set is_favorite = ?, updated_at = ? where id = ?")
    .bind(isFavorite ? 1 : 0, now.getTime(), productId)
    .run(),
);
```

```ts
// apps/api/src/db/repositories/notificationsRepo.ts
await runWithWriteRetry(async () => {
  const statements = entries.map((entry) =>
    db
      .prepare(
        `insert into notifications (
          id, product_id, owner_key, type, severity, title, body, created_at
        )
        select ?, ?, ?, ?, ?, ?, ?, ?
        where exists (select 1 from products where id = ? and owner_key = ?)`,
      )
      .bind(
        crypto.randomUUID(),
        productId,
        ownerKey,
        entry.type,
        entry.severity,
        entry.title,
        entry.body,
        now.getTime(),
        productId,
        ownerKey,
      ),
  );

  if (db.batch) {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
});
```

```ts
// apps/api/src/db/repositories/manualRefreshRunsRepo.ts
await runWithWriteRetry(async () => {
  const statements = [
    db.prepare(
      `update manual_refresh_run_items
       set status = 'RUNNING',
           attempt_count = attempt_count + 1,
           started_at = ?,
           updated_at = ?
       where run_id = ? and product_id = ?`,
    ).bind(timestamp, timestamp, runId, productId),
    db.prepare(
      `update manual_refresh_runs
       set pending_count = pending_count - 1,
           running_count = running_count + 1,
           updated_at = ?
       where id = ?`,
    ).bind(timestamp, runId),
  ];

  if (db.batch) {
    await db.batch(statements);
    return;
  }

  for (const statement of statements) {
    await statement.run();
  }
});
```

```ts
// apps/api/src/db/repositories/settingsRepo.ts
await runWithWriteRetry(() =>
  db
    .prepare(
      `update app_settings
       set refresh_interval_hours = ?, prompt_preferences_json = ?, connector_healthcheck_enabled = ?,
           ai_target_base_url = ?, ai_target_management_key = ?, ai_target_label = ?, ai_target_api_key = ?,
           updated_at = ?
       where id = ?`,
    )
    .bind(
      merged.refreshIntervalHours,
      promptPreferencesJson,
      merged.connectorHealthcheckEnabled ? 1 : 0,
      merged.aiTargetBaseUrl,
      merged.aiTargetManagementKey,
      merged.aiTargetLabel,
      merged.aiTargetApiKey,
      Date.now(),
      DEFAULT_SETTINGS_ID,
    )
    .run(),
);
```

```ts
// apps/api/src/db/repositories/draftsRepo.ts
await runWithWriteRetry(() =>
  db
    .prepare(
      `update etsy_drafts
       set english_title = ?, short_description = ?, long_description = ?, tags_json = ?, materials_json = ?,
           attributes_json = ?, seo_notes = ?, policy_notes = ?, edited_version = ?, manual_edits_present = ?
       where product_id = ?`,
    )
    .bind(
      nextEnglishTitle,
      nextShortDescription,
      nextLongDescription,
      JSON.stringify(nextTags),
      JSON.stringify(nextMaterials),
      JSON.stringify(nextAttributes),
      nextSeoNotes,
      nextPolicyNotes,
      existing.editedVersion + 1,
      1,
      productId,
    )
    .run(),
);
```

- [ ] **Step 4: Re-run the API retry suite and the broader typecheck**

Run: `pnpm --filter @trendyol-etsy/api test -- runWithWriteRetry.test.ts trackingActions.test.ts manualRefreshRuns.test.ts settings.test.ts draftFlows.test.ts && pnpm --filter @trendyol-etsy/api typecheck`

Expected: PASS, including successful retries for one-off transient D1 write failures on tracking, settings, draft, and manual refresh persistence paths.

- [ ] **Step 5: Commit the D1 write-retry hardening**

```bash
git add apps/api/src/db/runWithWriteRetry.ts apps/api/tests/integration/runWithWriteRetry.test.ts apps/api/tests/support/flakyD1.ts apps/api/src/modules/tracking/createTrackedProduct.ts apps/api/src/modules/tracking/deleteTrackedProduct.ts apps/api/src/modules/tracking/restoreTrackedProduct.ts apps/api/src/modules/tracking/permanentlyDeleteTrackedProduct.ts apps/api/src/db/repositories/productsRepo.ts apps/api/src/db/repositories/notificationsRepo.ts apps/api/src/db/repositories/manualRefreshRunsRepo.ts apps/api/src/db/repositories/settingsRepo.ts apps/api/src/db/repositories/draftsRepo.ts apps/api/tests/integration/trackingActions.test.ts apps/api/tests/integration/manualRefreshRuns.test.ts apps/api/tests/integration/settings.test.ts apps/api/tests/integration/draftFlows.test.ts
git commit -m "feat: retry transient D1 write failures"
```

## Task 4: Document production D1 as the only live source and add a rollout/recovery runbook

**Files:**
- Create: `docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md`
- Modify: `docs/deploy/cloudflare.md`
- Modify: `docs/runbooks/cloudflare-deploy.md`

- [ ] **Step 1: Add the missing production rollout and recovery doc coverage**

```md
<!-- docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md -->
# Central cloud persistence rollout

## 1. Production D1 is the only live source
- Canli kullanimda yalnizca deploy edilmis Pages + deploy edilmis Worker + `trendyol-etsy-prod` kullanilir.
- Lokal D1 ve `trendyol-etsy-dev` canli veri kaynagi degildir.

## 2. Before migration or bootstrap
1. `pnpm --filter @trendyol-etsy/api exec wrangler d1 info trendyol-etsy-prod`
2. `pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel info trendyol-etsy-prod`
3. Gerekliyse mevcut lokal/veri export'unu alin.

## 3. Rollout
1. `pnpm --filter @trendyol-etsy/api exec wrangler d1 migrations apply trendyol-etsy-prod --remote`
2. `pnpm cf:deploy:api`
3. Pages tarafinda `VITE_API_BASE_URL=https://<worker-subdomain>.workers.dev` oldugunu dogrulayin.

## 4. Two-device smoke test
1. Cihaz A'da yeni urun linki ekleyin.
2. Cihaz B'de ayni owner ekranini acik tutun.
3. En gec 10 saniye + pencere odaga gelme sonrasinda ayni kaydi gorun.
4. Kategori/favori/draft degisikligini ikinci cihazdan dogrulayin.

## 5. Recovery
- Kod hatasinda once son saglam commit'i yeniden deploy edin.
- Veri duzeltmesi gerekirse:
  `pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel restore trendyol-etsy-prod --bookmark=<bookmark>`
```

- [ ] **Step 2: Update the canonical deploy docs with the new central-cloud rules**

```md
<!-- docs/deploy/cloudflare.md -->
## Canli veri kurali

- Production kullanicilari sadece `trendyol-etsy-prod` uzerinden calisir.
- `VITE_API_BASE_URL` production Pages ortaminda bos birakilmaz; deploy edilmis Worker domainine isaret eder.
- Lokal `wrangler dev` ve `env.dev` yalnizca gelistirme/test icindir.

## Time Travel ve geri donus

Bookmark al:
`pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel info trendyol-etsy-prod`

Geri don:
`pnpm --filter @trendyol-etsy/api exec wrangler d1 time-travel restore trendyol-etsy-prod --bookmark=<bookmark>`
```

```md
<!-- docs/runbooks/cloudflare-deploy.md -->
- OpenAI OAuth ayrintilarindan once `docs/deploy/cloudflare.md` icindeki "Canli veri kurali" ve "Time Travel ve geri donus" bolumleri okunur.
- Merkezi veri rollout ve iki cihazli smoke test icin `docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md` kullanilir.
```

- [ ] **Step 3: Spot-check the runbook commands and markdown formatting**

Run: `git diff --check docs/deploy/cloudflare.md docs/runbooks/cloudflare-deploy.md docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md`

Expected: PASS with no whitespace or merge-marker errors, and each command copied exactly as it will be used in rollout.

- [ ] **Step 4: Review the final acceptance checklist against the spec**

Run: `Get-Content docs\superpowers\specs\2026-03-28-central-cloud-persistence-design.md`

Expected: The plan/doc updates now explicitly cover:
- production D1 as the only live source
- two-device smoke verification
- Time Travel recovery
- no local live fallback

- [ ] **Step 5: Commit the rollout docs**

```bash
git add docs/deploy/cloudflare.md docs/runbooks/cloudflare-deploy.md docs/runbooks/2026-03-28-central-cloud-persistence-rollout.md
git commit -m "docs: add central cloud rollout runbook"
```

## Self-Review

### Spec coverage
- **Tek dogruluk kaynagi production D1:** Task 4 deploy/runbook guncellemeleri ve Task 1 `VITE_API_BASE_URL` testi bunu kapsiyor.
- **Mutation sonrasi veri kaybolmamasi / net hata mesaji:** Task 1 `fetchWithTimeout` hata metni + Task 3 retry yardimcisi kapsiyor.
- **Tracking, detay, bildirim, cop kutusu, draft/SEO verilerinin canli guncel gorunmesi:** Task 2 sayfa seviyesinde polling ve stale-data status ile kapsiyor.
- **Iki kisi / iki cihaz / ortak owner gorunurlugu:** Task 2 owner-scoped live queries ve Task 4 iki cihazli smoke test ile kapsiyor.
- **Time Travel ve operasyonel geri donus:** Task 4 runbook ve deploy dokumaniyla kapsiyor.

### Placeholder scan
- Yasak placeholder kaliplari ve belirsiz yonlendirmeler planda yer almiyor.
- Her code step somut dosya, komut ve snippet iceriyor.

### Type consistency
- Web live-sync sabiti her yerde `LIVE_SYNC_INTERVAL_MS = 10_000` olarak tek isimle kullaniliyor.
- Retry yardimcisi tek isimle `runWithWriteRetry` olarak tanimlaniyor; repo ve module ornekleri ayni isimle baglaniyor.
- Testlerde owner route deseni tum orneklerde `/owners/:ownerKey/...` olarak sabit.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-28-central-cloud-persistence.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
