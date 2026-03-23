# Tracking Favorites, Delete, and JPG Download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent favorites, permanent product deletion, a favorites-only tracking view, and one-click JPG download for the selected detail image.

**Architecture:** Keep persistence and destructive actions on the API side: add a product-level `isFavorite` flag, expose explicit tracking action endpoints, and centralize delete/download behavior in focused tracking modules. On the web side, keep tracking mutations at the route level, keep the product card presentational, and let the existing image gallery own selected-image state plus the JPG download trigger.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker patterns, D1/SQLite, React, React Router, TanStack Query, Tailwind CSS, Vitest, Playwright

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-21-tracking-favorites-delete-download-design.md`
- Keep the summary cards (`Takipte`, `Aktif`, `İnceleme gerekli`) global for both `Tum Urunler` and `Favoriler`; only the item list changes by tab.
- Use a real forward migration for the new `is_favorite` column. Do not rely on editing only `0000_initial.sql`; make the tests migration-aware instead.
- Use the existing React Query invalidation pattern with the `["tracking-products"]` prefix so add/favorite/delete mutations refresh both tabs without bespoke cache surgery.
- Use the browser’s native `window.confirm` for the permanent-delete confirmation in this iteration. It satisfies the spec without introducing modal scaffolding.
- Keep the detail-page download UX in `ProductImageGallery.tsx`, because that component already owns selected-image state and can map “current selection” to “download this image” without hoisting extra state.

## File Structure

### API schema and migration-aware test support
- Create: `apps/api/drizzle/0001_products_is_favorite.sql` — add the new `products.is_favorite` column with a default of `0`.
- Create: `apps/api/tests/support/sqlite.ts` — shared in-memory SQLite/D1 test harness that applies all migration files in order.
- Modify: `apps/api/src/db/schema.ts` — add `isFavorite` to the Drizzle schema.
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts` — persist `is_favorite = false` when a product is first tracked.
- Modify: `apps/api/tests/integration/addTrackedProduct.test.ts` — assert newly created products default to `isFavorite = 0` and switch to the shared test harness.
- Modify: `apps/api/tests/integration/listViews.test.ts` — switch to the shared test harness.
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts` — switch to the shared test harness.
- Modify: `apps/api/tests/integration/draftFlows.test.ts` — switch to the shared test harness.
- Modify: `apps/api/tests/integration/scheduler.test.ts` — switch to the shared test harness.
- Modify: `apps/api/tests/integration/schema.test.ts` — assert the migrated `is_favorite` column exists.

### Tracking API actions
- Modify: `apps/api/src/db/repositories/productsRepo.ts` — read/write `isFavorite`, filter favorites, and delete the full product graph.
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts` — return `isFavorite` on tracking cards and support favorite-only filtering.
- Create: `apps/api/src/modules/tracking/setTrackedProductFavorite.ts` — focused action for explicit favorite state updates.
- Create: `apps/api/src/modules/tracking/deleteTrackedProduct.ts` — focused action for permanent deletion across related tables.
- Modify: `apps/api/src/routes/tracking.ts` — expose `favorite=true`, `POST /:productId/favorite`, and `DELETE /:productId`.
- Create: `apps/api/tests/integration/trackingActions.test.ts` — lock in favorite toggle, favorites-only list, and permanent delete behavior.

### Product image download backend
- Create: `apps/api/src/modules/tracking/downloadProductImageAsJpg.ts` — validate image ownership, fetch/transform, and return a downloadable JPG response contract.
- Modify: `apps/api/src/db/repositories/productsRepo.ts` — expose a small image snapshot lookup (`title`, `imagesRaw`) for download validation.
- Modify: `apps/api/src/routes/products.ts` — add `GET /:productId/images/download`.
- Create: `apps/api/tests/integration/productImageDownload.test.ts` — cover happy path and invalid-image rejection.

### Web API surface and tracking UI
- Modify: `apps/web/src/app/api.ts` — add `isFavorite`, favorite-aware list fetching, favorite mutation, delete mutation, and binary download helper.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx` — own the active tab, favorite/delete mutations, and reload behavior.
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx` — render favorite/delete controls while keeping card body presentation-focused.
- Modify: `apps/web/src/features/tracking/components/ProductCard.test.tsx` — assert the new card actions and labels.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx` — assert tab switching, favorite invalidation, and delete flow wiring.

### Product detail JPG UX
- Modify: `apps/web/src/features/product/components/ProductImageGallery.tsx` — add the `JPG indir` button, pending/error state, and browser download trigger for the selected image.
- Modify: `apps/web/src/features/product/components/ProductImageGallery.test.tsx` — assert that the selected image is the one downloaded and that the button hides for empty galleries.
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx` — pass `productId` into the gallery.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` — assert that detail data exposes the new JPG download control.

### E2E regression
- Modify: `apps/web/tests/e2e/tracking.spec.ts` — cover favoriting, favorites-only view, JPG download, and permanent deletion with mocked network responses.

## Task 1: Add migration-backed favorite persistence and a shared API test harness

**Files:**
- Create: `apps/api/drizzle/0001_products_is_favorite.sql`
- Create: `apps/api/tests/support/sqlite.ts`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/modules/tracking/createTrackedProduct.ts`
- Modify: `apps/api/tests/integration/addTrackedProduct.test.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`
- Modify: `apps/api/tests/integration/processRefreshJob.test.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`
- Modify: `apps/api/tests/integration/scheduler.test.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`

- [ ] **Step 1: Add failing schema and create-product assertions for `is_favorite`**

```ts
const columns = database
  .prepare("pragma table_info(products)")
  .all() as Array<{ name: string; dflt_value: string | null }>;

expect(columns).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "is_favorite", dflt_value: "0" }),
  ]),
);
```

```ts
const products = sqlite.prepare(
  "select trendyol_url as trendyolUrl, source_product_id as sourceProductId, title, is_favorite as isFavorite from products",
).all() as Array<{ trendyolUrl: string; sourceProductId: string; title: string; isFavorite: number }>;

expect(products[0]).toEqual(
  expect.objectContaining({
    title: "Oversize Hoodie",
    isFavorite: 0,
  }),
);
```

- [ ] **Step 2: Run the focused API tests to confirm the new assertions fail**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/addTrackedProduct.test.ts`
Expected: FAIL because `is_favorite` does not exist yet.

- [ ] **Step 3: Create the migration and shared SQLite/D1 helper that loads all migrations in order**

```sql
ALTER TABLE products
ADD COLUMN is_favorite integer NOT NULL DEFAULT 0;
```

```ts
export function applyMigrations(database: DatabaseSync) {
  const drizzleDir = fileURLToPath(new URL("../../drizzle/", import.meta.url));
  const sql = readdirSync(drizzleDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(drizzleDir, name), "utf8"))
    .join("\n");

  database.exec(sql);
}

export function createTestEnv() {
  const sqlite = new DatabaseSync(":memory:");
  applyMigrations(sqlite);

  return {
    sqlite,
    env: {
      DB: new SQLiteD1Database(sqlite),
      REFRESH_QUEUE: { async send() {} },
    } satisfies Env,
  };
}
```

- [ ] **Step 4: Update the schema, tracked-product insert, and all D1-backed integration tests to use the shared helper**

```ts
isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
```

```ts
`insert into products (
  id, trendyol_url, source_product_id, title, brand, category, description_raw, attributes_raw, images_raw,
  status, parse_status, is_favorite, last_checked_at, created_at, updated_at
) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
```

```ts
.bind(
  productId,
  normalizedUrl,
  sourceProductId,
  parsed.title,
  parsed.brand,
  parsed.category,
  stringify(parsed.attributes),
  stringify(parsed.images),
  "ACTIVE",
  "OK",
  false,
  now.getTime(),
  now.getTime(),
  now.getTime(),
)
```

- [ ] **Step 5: Re-run the migration-sensitive API integration tests**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/addTrackedProduct.test.ts tests/integration/listViews.test.ts tests/integration/processRefreshJob.test.ts tests/integration/draftFlows.test.ts tests/integration/scheduler.test.ts`
Expected: PASS with the new migration loader and default `isFavorite` persistence.

- [ ] **Step 6: Commit the schema and test-harness groundwork**

```bash
git add apps/api/drizzle/0001_products_is_favorite.sql apps/api/tests/support/sqlite.ts apps/api/src/db/schema.ts apps/api/src/modules/tracking/createTrackedProduct.ts apps/api/tests/integration/addTrackedProduct.test.ts apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/processRefreshJob.test.ts apps/api/tests/integration/draftFlows.test.ts apps/api/tests/integration/scheduler.test.ts apps/api/tests/integration/schema.test.ts
git commit -m "chore: add favorite persistence migration"
```

## Task 2: Expose favorites and permanent delete from the tracking API

**Files:**
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts`
- Create: `apps/api/src/modules/tracking/setTrackedProductFavorite.ts`
- Create: `apps/api/src/modules/tracking/deleteTrackedProduct.ts`
- Modify: `apps/api/src/routes/tracking.ts`
- Modify: `apps/api/tests/integration/listViews.test.ts`
- Create: `apps/api/tests/integration/trackingActions.test.ts`

- [ ] **Step 1: Write a failing integration test for favorite toggle, favorites-only listing, and cascade delete**

```ts
sqlite.prepare(
  `insert into notifications (id, product_id, type, severity, title, body, created_at) values (?, ?, ?, ?, ?, ?, ?)`,
).run("notif_1", seeded.product.id, "MANUAL", "info", "Saved", "Saved", Date.now());

sqlite.prepare(
  `insert into etsy_drafts (id, product_id, english_title, generated_version, edited_version, manual_edits_present) values (?, ?, ?, ?, ?, ?)`,
).run("draft_1", seeded.product.id, "Draft title", 1, 0, 0);

const favoriteResponse = await app.request(
  `http://localhost/tracking/products/${seeded.product.id}/favorite`,
  {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ isFavorite: true }),
  },
  env,
);

expect(favoriteResponse.status).toBe(200);
expect(await favoriteResponse.json()).toEqual({
  productId: seeded.product.id,
  isFavorite: true,
});

const favoritesOnly = await app.request("http://localhost/tracking/products?favorite=true", undefined, env);
expect((await favoritesOnly.json()).items).toHaveLength(1);

const deleteResponse = await app.request(
  `http://localhost/tracking/products/${seeded.product.id}`,
  { method: "DELETE" },
  env,
);

expect(deleteResponse.status).toBe(204);
expect(sqlite.prepare("select count(*) as count from products").get()).toEqual({ count: 0 });
expect(sqlite.prepare("select count(*) as count from product_variants").get()).toEqual({ count: 0 });
expect(sqlite.prepare("select count(*) as count from price_history").get()).toEqual({ count: 0 });
expect(sqlite.prepare("select count(*) as count from notifications").get()).toEqual({ count: 0 });
expect(sqlite.prepare("select count(*) as count from etsy_drafts").get()).toEqual({ count: 0 });
```

- [ ] **Step 2: Run the tracking API tests to verify the new behavior is missing**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts tests/integration/trackingActions.test.ts`
Expected: FAIL because the list does not expose `isFavorite`, there is no favorite endpoint, and delete is not implemented.

- [ ] **Step 3: Add focused repository and action modules for favorites and deletion**

```ts
async setFavorite(productId: string, isFavorite: boolean, now: Date) {
  const result = await db
    .prepare("update products set is_favorite = ?, updated_at = ? where id = ?")
    .bind(isFavorite ? 1 : 0, now.getTime(), productId)
    .run();

  return result;
}
```

```ts
const deleteStatements = [
  ["product_variants", "product_id"],
  ["product_current_state", "product_id"],
  ["price_history", "product_id"],
  ["stock_history", "product_id"],
  ["notifications", "product_id"],
  ["etsy_drafts", "product_id"],
];

for (const [table, column] of deleteStatements) {
  await db.prepare(`delete from ${table} where ${column} = ?`).bind(productId).run();
}

await db.prepare("delete from products where id = ?").bind(productId).run();
```

- [ ] **Step 4: Extend the list view builder and tracking router contract**

```ts
const favoriteQuery = c.req.query("favorite");
const favorite = favoriteQuery === "true" ? true : favoriteQuery === "false" ? false : undefined;
```

```ts
items: items.map(({ imagesRaw, ...item }) => ({
  ...item,
  thumbnailImage: getThumbnailImage(imagesRaw),
}))
```

```ts
app.post("/products/:productId/favorite", async (c) => {
  const body = await c.req.json<{ isFavorite?: boolean }>().catch(() => null);
  if (typeof body?.isFavorite !== "boolean") {
    return c.json({ error: "isFavorite is required" }, 400);
  }

  const result = await setTrackedProductFavorite(c.env.DB, c.req.param("productId"), body.isFavorite);
  if (!result) {
    return c.json({ error: "Product not found" }, 404);
  }

  return c.json(result);
});

app.delete("/products/:productId", async (c) => {
  const deleted = await deleteTrackedProduct(c.env.DB, c.req.param("productId"));
  if (!deleted) {
    return c.json({ error: "Product not found" }, 404);
  }

  return c.body(null, 204);
});
```

- [ ] **Step 5: Re-run the tracking API tests**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts tests/integration/trackingActions.test.ts`
Expected: PASS with explicit favorite state, favorites-only filtering, and full delete cleanup.

- [ ] **Step 6: Commit the tracking API actions**

```bash
git add apps/api/src/db/repositories/productsRepo.ts apps/api/src/modules/tracking/buildTrackingListView.ts apps/api/src/modules/tracking/setTrackedProductFavorite.ts apps/api/src/modules/tracking/deleteTrackedProduct.ts apps/api/src/routes/tracking.ts apps/api/tests/integration/listViews.test.ts apps/api/tests/integration/trackingActions.test.ts
git commit -m "feat: add tracking favorite and delete actions"
```

## Task 3: Add the product image JPG download endpoint

**Files:**
- Create: `apps/api/src/modules/tracking/downloadProductImageAsJpg.ts`
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/routes/products.ts`
- Create: `apps/api/tests/integration/productImageDownload.test.ts`

- [ ] **Step 1: Write a failing integration test for JPG download and invalid URL rejection**

```ts
vi.spyOn(globalThis, "fetch").mockResolvedValue(
  new Response(new Uint8Array([255, 216, 255, 217]), {
    status: 200,
    headers: { "Content-Type": "image/jpeg" },
  }),
);

const response = await app.request(
  `http://localhost/products/${seeded.product.id}/images/download?url=${encodeURIComponent("https://cdn.example.com/hoodie-1.jpg")}`,
  undefined,
  env,
);

expect(response.status).toBe(200);
expect(response.headers.get("content-type")).toContain("image/jpeg");
expect(response.headers.get("content-disposition")).toContain(".jpg");
expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([255, 216, 255, 217]));
```

```ts
const invalidResponse = await app.request(
  `http://localhost/products/${seeded.product.id}/images/download?url=${encodeURIComponent("https://cdn.example.com/other.jpg")}`,
  undefined,
  env,
);

expect(invalidResponse.status).toBe(400);
```

- [ ] **Step 2: Run the focused download integration test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/productImageDownload.test.ts`
Expected: FAIL because the route and helper do not exist yet.

- [ ] **Step 3: Implement a focused download module that validates ownership and builds the JPG response**

```ts
const filename = `${slugify(snapshot.title ?? "urun-gorseli")}.jpg`;

const allowedImages = parseImages(snapshot.imagesRaw);
if (!allowedImages.includes(targetUrl)) {
  return { kind: "invalid-image" as const };
}

const upstream = await fetch(targetUrl, {
  cf: { image: { format: "jpeg", quality: 95 } },
} as RequestInit);

if (!upstream.ok || !upstream.body) {
  return { kind: "fetch-error" as const };
}

return {
  kind: "ok" as const,
  filename,
  response: new Response(upstream.body, {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  }),
};
```

- [ ] **Step 4: Wire the new route into `apps/api/src/routes/products.ts`**

```ts
app.get("/:productId/images/download", async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.json({ error: "url is required" }, 400);
  }

  const result = await downloadProductImageAsJpg(c.env.DB, c.req.param("productId"), url);

  if (result.kind === "not-found") return c.json({ error: "Product not found" }, 404);
  if (result.kind === "invalid-image") return c.json({ error: "Image not found for product" }, 400);
  if (result.kind === "fetch-error") return c.json({ error: "Image download failed" }, 502);

  return result.response;
});
```

- [ ] **Step 5: Re-run the download integration test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/productImageDownload.test.ts`
Expected: PASS with a downloadable JPEG response and invalid-image guard.

- [ ] **Step 6: Commit the product image download endpoint**

```bash
git add apps/api/src/modules/tracking/downloadProductImageAsJpg.ts apps/api/src/db/repositories/productsRepo.ts apps/api/src/routes/products.ts apps/api/tests/integration/productImageDownload.test.ts
git commit -m "feat: add product image jpg download"
```

## Task 4: Add favorites tabs and destructive actions to the tracking UI

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.tsx`
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx`
- Modify: `apps/web/src/features/tracking/components/ProductCard.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`

- [ ] **Step 1: Write failing UI tests for tab switching and card action callbacks**

```tsx
it("renders favorite and delete actions on the product card", async () => {
  const user = userEvent.setup();
  const onToggleFavorite = vi.fn();
  const onDelete = vi.fn();

  renderWithProviders(
    <ProductCard
      item={{ ...baseItem, thumbnailImage: "https://cdn.example.com/hoodie-1.jpg", isFavorite: false }}
      onToggleFavorite={onToggleFavorite}
      onDelete={onDelete}
    />,
  );

  await user.click(screen.getByRole("button", { name: /favoriye ekle/i }));
  await user.click(screen.getByRole("button", { name: /^sil$/i }));

  expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }));
  expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }));
});
```

```tsx
const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
  const url = String(input);

  if (url.includes("favorite=true")) {
    return new Response(JSON.stringify(favoritesPayload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify(allItemsPayload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

await user.click(await screen.findByRole("button", { name: /favoriler/i }));
expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tracking/products?favorite=true"), expect.anything());
```

- [ ] **Step 2: Run the focused web tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`
Expected: FAIL because the card has no action buttons and the page has no favorites tab or mutations yet.

- [ ] **Step 3: Extend the frontend API surface for favorites and deletion**

```ts
export interface TrackingItem {
  // ...
  isFavorite: boolean;
}
```

```ts
export async function fetchTrackingView(options: { favoriteOnly?: boolean } = {}) {
  const search = new URLSearchParams();
  if (options.favoriteOnly) {
    search.set("favorite", "true");
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`/tracking/products${suffix}`);
  return parseJson<TrackingViewResponse>(response);
}
```

```ts
export async function setTrackedProductFavorite(productId: string, isFavorite: boolean) {
  const response = await fetchWithTimeout(`/tracking/products/${productId}/favorite`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isFavorite }),
  });

  return parseJson<{ productId: string; isFavorite: boolean }>(response);
}

export async function deleteTrackedProduct(productId: string) {
  const response = await fetchWithTimeout(`/tracking/products/${productId}`, { method: "DELETE" });
  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}
```

- [ ] **Step 4: Implement page-owned favorite/delete mutations and presentational card controls**

```tsx
const [view, setView] = useState<"all" | "favorites">("all");
const trackingQuery = useQuery({
  queryKey: ["tracking-products", view],
  queryFn: () => fetchTrackingView({ favoriteOnly: view === "favorites" }),
});
```

```tsx
const favoriteMutation = useMutation({
  mutationFn: ({ productId, isFavorite }: { productId: string; isFavorite: boolean }) =>
    setTrackedProductFavorite(productId, isFavorite),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["tracking-products"] });
  },
});
```

```tsx
function handleDelete(item: TrackingItem) {
  const title = item.title ?? "Başlıksız ürün";
  if (!window.confirm(`"${title}" ürününü kalıcı olarak silmek istiyor musunuz?`)) {
    return;
  }

  deleteMutation.mutate(item.id);
}
```

- [ ] **Step 5: Re-run the tracking web tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`
Expected: PASS with working tabs, favorite actions, and delete wiring.

- [ ] **Step 6: Commit the tracking UI**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/tracking/routes/TrackingCenterPage.tsx apps/web/src/features/tracking/components/ProductCard.tsx apps/web/src/features/tracking/components/ProductCard.test.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
git commit -m "feat: add tracking favorites ui"
```

## Task 5: Add one-click JPG download for the selected detail image

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/product/components/ProductImageGallery.tsx`
- Modify: `apps/web/src/features/product/components/ProductImageGallery.test.tsx`
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Add a failing gallery test that locks download to the selected image**

```tsx
await user.click(screen.getByRole("button", { name: /görsel 2/i }));
await user.click(screen.getByRole("button", { name: /jpg indir/i }));

expect(downloadProductImage).toHaveBeenCalledWith("prod_1", "https://cdn.example.com/hoodie-2.jpg");
```

```tsx
render(<ProductImageGallery productId="prod_1" title={null} images={[]} />);
expect(screen.queryByRole("button", { name: /jpg indir/i })).not.toBeInTheDocument();
```

- [ ] **Step 2: Run the product-gallery tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ProductImageGallery.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: FAIL because the gallery has no download button and does not receive a `productId`.

- [ ] **Step 3: Add the binary download helper and gallery-side browser download flow**

```ts
export async function downloadProductImage(productId: string, imageUrl: string) {
  const search = new URLSearchParams({ url: imageUrl });
  const response = await fetchWithTimeout(`/products/${productId}/images/download?${search.toString()}`);

  if (!response.ok) {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Görsel indirilemedi.");
    }

    throw new Error("Görsel indirilemedi.");
  }

  return {
    blob: await response.blob(),
    filename: getFilenameFromDisposition(response.headers.get("content-disposition"), "urun-gorseli.jpg"),
  };
}
```

```tsx
const downloadMutation = useMutation({
  mutationFn: async () => {
    if (!selectedImage) throw new Error("Görsel indirilemedi.");
    return downloadProductImage(productId, selectedImage);
  },
  onSuccess: ({ blob, filename }) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(objectUrl);
  },
});
```

- [ ] **Step 4: Pass `productId` through the summary component and expose the button in the detail page**

```tsx
<ProductImageGallery
  productId={detail.product.id}
  title={detail.product.title}
  images={detail.product.images ?? []}
/>
```

- [ ] **Step 5: Re-run the detail-gallery tests**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ProductImageGallery.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with selected-image download behavior and hidden-button empty state.

- [ ] **Step 6: Commit the JPG download UX**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/product/components/ProductImageGallery.tsx apps/web/src/features/product/components/ProductImageGallery.test.tsx apps/web/src/features/product/components/ProductSummary.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: add jpg download to product gallery"
```

## Task 6: Update the E2E flow and run the targeted regression suite

**Files:**
- Modify: `apps/web/tests/e2e/tracking.spec.ts`

- [ ] **Step 1: Extend the Playwright mock server state to support favorites, delete, and binary image download**

```ts
await page.route("**/tracking/products*", async (route) => {
  const url = new URL(route.request().url());
  const itemsForView = url.searchParams.get("favorite") === "true"
    ? items.filter((item) => item.isFavorite)
    : items;

  if (route.request().method() === "GET") {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: {
          trackedCount: items.length,
          activeCount: items.length,
          reviewNeededCount: 0,
        },
        items: itemsForView,
        filters: { favorite: url.searchParams.get("favorite") === "true" },
      }),
    });
    return;
  }
});
```

```ts
await page.route("**/tracking/products/prod_1/favorite", async (route) => {
  const body = JSON.parse(route.request().postData() ?? "{}");
  items[0].isFavorite = Boolean(body.isFavorite);
  await route.fulfill({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId: "prod_1", isFavorite: items[0].isFavorite }),
  });
});
```

```ts
await page.route("**/tracking/products/prod_1", async (route) => {
  if (route.request().method() !== "DELETE") {
    await route.continue();
    return;
  }

  items.splice(0, 1);
  await route.fulfill({ status: 204, body: "" });
});
```

```ts
await page.route("**/products/prod_1/images/download**", async (route) => {
  await route.fulfill({
    status: 200,
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Disposition": 'attachment; filename="oversize-hoodie.jpg"',
    },
    body: Buffer.from([255, 216, 255, 217]),
  });
});
```

- [ ] **Step 2: Extend the user flow to favorite, filter, download, and delete**

```ts
page.on("dialog", (dialog) => dialog.accept());

await page.getByRole("button", { name: /favoriye ekle/i }).click();
await page.getByRole("button", { name: /favoriler/i }).click();
await expect(page.getByText(/oversize hoodie/i)).toBeVisible();

await page.getByRole("link", { name: /ürün görseli: oversize hoodie/i }).click();
const download = page.waitForEvent("download");
await page.getByRole("button", { name: /jpg indir/i }).click();
await expect((await download).suggestedFilename()).toContain(".jpg");

await page.goBack();
await page.getByRole("button", { name: /^sil$/i }).click();
await expect(page.getByText(/henüz favori ürün yok/i)).toBeVisible();
```

- [ ] **Step 3: Run the targeted E2E regression**

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/tracking.spec.ts`
Expected: PASS with a full add → favorite → filter → detail → download → delete flow.

- [ ] **Step 4: Run the full targeted verification suite before handoff**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/schema.test.ts tests/integration/addTrackedProduct.test.ts tests/integration/listViews.test.ts tests/integration/trackingActions.test.ts tests/integration/productImageDownload.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx src/features/product/components/ProductImageGallery.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/tracking.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit the regression coverage**

```bash
git add apps/web/tests/e2e/tracking.spec.ts
git commit -m "test: cover favorites delete and jpg download"
```
