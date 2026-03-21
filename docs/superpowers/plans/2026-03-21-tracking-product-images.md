# Tracking Product Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add product thumbnails to the tracking dashboard cards and show a selectable image gallery on the product detail page using already-scraped Trendyol images.

**Architecture:** Keep the data split explicit: the API list view should expose a derived `thumbnailImage` for lightweight card rendering, while the detail view keeps using the full `product.images` array for gallery behavior. On the web side, keep the new interactive image behavior isolated in focused UI components so list-card navigation and detail-gallery state can be tested independently.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker patterns, React, React Router, TanStack Query, Tailwind CSS, Vitest, Playwright

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-21-tracking-product-images-design.md`
- Reuse the existing scraped image pipeline; do not add new database columns or migrations.
- Prefer small focused UI units: the tracking card owns list navigation behavior, and a dedicated gallery component owns detail-page image state.
- Keep fallback behavior explicit in both API and UI so missing or invalid images never break the page.

## File Structure

### API list view
- Modify: `apps/api/src/db/repositories/productsRepo.ts` — include raw image payload in tracking-card rows so the view builder can derive a thumbnail.
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts` — safely parse `imagesRaw`, derive `thumbnailImage`, and remove raw JSON from the response shape.
- Modify: `apps/api/tests/integration/listViews.test.ts` — lock in the new list response contract.

### Shared frontend API types
- Modify: `apps/web/src/app/api.ts` — add `thumbnailImage` to `TrackingItem` so the dashboard card can render the new field.

### Tracking dashboard UI
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx` — render the thumbnail, title link, image link, and placeholder behavior.
- Create: `apps/web/src/features/tracking/components/ProductCard.test.tsx` — focused tests for thumbnail rendering, fallback, and click targets.
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx` — update fixture payloads so the page-level test matches the new contract.

### Product detail gallery UI
- Create: `apps/web/src/features/product/components/ProductImageGallery.tsx` — own selected-image state, main preview, thumbnail strip, and placeholder rendering.
- Create: `apps/web/src/features/product/components/ProductImageGallery.test.tsx` — verify initial selection, thumbnail switching, and empty-gallery fallback.
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx` — embed the gallery into the existing summary section without displacing the existing product stats.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` — assert that fetched detail data wires the gallery into the page correctly.

### E2E regression
- Modify: `apps/web/tests/e2e/tracking.spec.ts` — verify the dashboard thumbnail appears, clicking the image/title reaches detail, and the detail gallery updates the main preview.

## Task 1: Expose `thumbnailImage` from the tracking list API

**Files:**
- Modify: `apps/api/src/db/repositories/productsRepo.ts`
- Modify: `apps/api/src/modules/tracking/buildTrackingListView.ts`
- Modify: `apps/web/src/app/api.ts`
- Test: `apps/api/tests/integration/listViews.test.ts`

- [ ] **Step 1: Extend the failing API integration test with a thumbnail expectation**

```ts
expect(listJson.items[0]).toEqual(
  expect.objectContaining({
    id: seeded.product.id,
    title: "Oversize Hoodie",
    totalVariantCount: 3,
    thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
  }),
);
```

- [ ] **Step 2: Run the API integration test to verify it fails**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts`
Expected: FAIL because `thumbnailImage` is missing from the tracking list response.

- [ ] **Step 3: Add raw image access to the repository query**

```ts
select p.id, p.trendyol_url as trendyolUrl, p.title, p.brand, p.status, p.parse_status as parseStatus,
       p.images_raw as imagesRaw,
       pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
       pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
       pcs.last_checked_at as lastCheckedAt
```

- [ ] **Step 4: Derive `thumbnailImage` in the tracking view builder with safe JSON parsing**

```ts
function getThumbnailImage(imagesRaw: string | null) {
  if (!imagesRaw) return null;

  try {
    const parsed = JSON.parse(imagesRaw);
    if (!Array.isArray(parsed)) return null;

    const firstImage = parsed.find((value): value is string => typeof value === "string" && value.trim().length > 0);
    return firstImage ?? null;
  } catch {
    return null;
  }
}
```

```ts
items: (await productsRepo.listTrackingCards(filters)).map(({ imagesRaw, ...item }) => ({
  ...item,
  thumbnailImage: getThumbnailImage(imagesRaw),
}))
```

- [ ] **Step 5: Update the frontend `TrackingItem` interface to include the new field**

```ts
thumbnailImage: string | null;
```

- [ ] **Step 6: Re-run the API integration test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts`
Expected: PASS with the new `thumbnailImage` assertion.

- [ ] **Step 7: Commit the API contract change**

```bash
git add apps/api/src/db/repositories/productsRepo.ts apps/api/src/modules/tracking/buildTrackingListView.ts apps/api/tests/integration/listViews.test.ts apps/web/src/app/api.ts
git commit -m "feat: expose tracking thumbnail images"
```

## Task 2: Render the dashboard thumbnail and constrained click targets

**Files:**
- Modify: `apps/web/src/features/tracking/components/ProductCard.tsx`
- Create: `apps/web/src/features/tracking/components/ProductCard.test.tsx`
- Modify: `apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx`

- [ ] **Step 1: Write a failing component test for image/title links and placeholder fallback**

```tsx
it("renders a thumbnail link, a title link, and a placeholder fallback", () => {
  renderWithProviders(
    <ProductCard
      item={{
        id: "prod_1",
        title: "Oversize Hoodie",
        brand: "North Apparel",
        status: "ACTIVE",
        parseStatus: "OK",
        currentPrice: 42990,
        minPrice: 34990,
        maxPrice: 44990,
        inStockVariantCount: 3,
        totalVariantCount: 3,
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
      }}
    />,
  );

  expect(screen.getByRole("link", { name: /ürün görseli: oversize hoodie/i })).toHaveAttribute("href", "/products/prod_1");
  expect(screen.getByRole("link", { name: /oversize hoodie/i })).toHaveAttribute("href", "/products/prod_1");
});
```

- [ ] **Step 2: Run the new component test to verify it fails**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx`
Expected: FAIL because the card does not render thumbnail or link targets yet.

- [ ] **Step 3: Implement the card layout with a non-breaking placeholder**

```tsx
<Link
  to={`/products/${item.id}`}
  aria-label={`Ürün görseli: ${item.title ?? "Başlıksız ürün"}`}
  className="h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
>
  {item.thumbnailImage ? (
    <img src={item.thumbnailImage} alt={item.title ?? "Ürün görseli"} className="h-full w-full object-cover" />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">Görsel yok</div>
  )}
</Link>
```

```tsx
<h3 className="text-lg font-semibold text-slate-900">
  <Link to={`/products/${item.id}`} className="hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-300">
    {item.title ?? "Başlıksız ürün"}
  </Link>
</h3>
```

- [ ] **Step 4: Update the existing page-level tracking fixture to include `thumbnailImage`**

```ts
thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
```

- [ ] **Step 5: Run the focused card test and the existing tracking page test**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx`
Expected: PASS with both the new focused assertions and the existing page render assertion.

- [ ] **Step 6: Commit the dashboard card UI**

```bash
git add apps/web/src/features/tracking/components/ProductCard.tsx apps/web/src/features/tracking/components/ProductCard.test.tsx apps/web/src/features/tracking/routes/TrackingCenterPage.test.tsx
git commit -m "feat: show product thumbnails on tracking cards"
```

## Task 3: Add a selectable gallery to the product detail summary

**Files:**
- Create: `apps/web/src/features/product/components/ProductImageGallery.tsx`
- Create: `apps/web/src/features/product/components/ProductImageGallery.test.tsx`
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Write a failing gallery component test for default selection and thumbnail switching**

```tsx
it("uses the first image as the main preview and switches when a thumbnail is clicked", async () => {
  const user = userEvent.setup();
  render(
    <ProductImageGallery
      title="Oversize Hoodie"
      images={[
        "https://cdn.example.com/hoodie-1.jpg",
        "https://cdn.example.com/hoodie-2.jpg",
      ]}
    />,
  );

  expect(screen.getByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
    "src",
    "https://cdn.example.com/hoodie-1.jpg",
  );

  await user.click(screen.getByRole("button", { name: /görsel 2/i }));

  expect(screen.getByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
    "src",
    "https://cdn.example.com/hoodie-2.jpg",
  );
});
```

- [ ] **Step 2: Run the gallery test to verify it fails**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ProductImageGallery.test.tsx`
Expected: FAIL because the gallery component does not exist yet.

- [ ] **Step 3: Implement a focused gallery component with reset-on-prop-change behavior**

```tsx
const normalizedImages = images.filter((value): value is string => Boolean(value?.trim()));
const [selectedImage, setSelectedImage] = useState<string | null>(normalizedImages[0] ?? null);

useEffect(() => {
  setSelectedImage(normalizedImages[0] ?? null);
}, [normalizedImages.join("|")]);
```

```tsx
{selectedImage ? (
  <img src={selectedImage} alt={`${title ?? "Ürün"} ana görsel`} className="h-full w-full object-cover" />
) : (
  <div className="flex min-h-64 items-center justify-center rounded-3xl bg-slate-50 text-sm text-slate-400">Görsel bulunamadı</div>
)}
```

- [ ] **Step 4: Embed the gallery at the top of `ProductSummary` without removing the existing stat cards and metadata blocks**

```tsx
<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
  <ProductImageGallery title={detail.product.title} images={detail.product.images ?? []} />
  <div className="space-y-5">
    {/* existing heading, badges, stat cards, tracking info, description */}
  </div>
</div>
```

- [ ] **Step 5: Update the detail-page route test payload to include images and assert the gallery is rendered**

```ts
images: [
  "https://cdn.example.com/hoodie-1.jpg",
  "https://cdn.example.com/hoodie-2.jpg",
],
```

```ts
expect(await screen.findByRole("img", { name: /oversize hoodie ana görsel/i })).toBeInTheDocument();
```

- [ ] **Step 6: Run the focused gallery test and the detail route test**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/components/ProductImageGallery.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with gallery selection and detail-page rendering covered.

- [ ] **Step 7: Commit the detail gallery UI**

```bash
git add apps/web/src/features/product/components/ProductImageGallery.tsx apps/web/src/features/product/components/ProductImageGallery.test.tsx apps/web/src/features/product/components/ProductSummary.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: add product detail image gallery"
```

## Task 4: Lock in the end-to-end thumbnail-to-detail flow

**Files:**
- Modify: `apps/web/tests/e2e/tracking.spec.ts`

- [ ] **Step 1: Extend the E2E fixture data with thumbnail and detail-image payloads**

```ts
thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
```

```ts
await page.route("**/products/prod_1", async (route) => {
  await route.fulfill({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      product: {
        id: "prod_1",
        trendyolUrl: seedUrl,
        sourceProductId: "123",
        title: "Oversize Hoodie",
        brand: "North Apparel",
        category: "Sweatshirt",
        descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
        attributes: [],
        images: [
          "https://cdn.example.com/hoodie-1.jpg",
          "https://cdn.example.com/hoodie-2.jpg",
        ],
        status: "ACTIVE",
        parseStatus: "OK",
        lastCheckedAt: Date.now(),
      },
      currentState: {
        currentPrice: 42990,
        minPrice: 42990,
        maxPrice: 42990,
        inStockVariantCount: 3,
        totalVariantCount: 3,
        lastChangeAt: Date.now(),
        lastCheckedAt: Date.now(),
      },
      variants: [],
      priceHistory: [],
      stockHistory: [],
      notifications: [],
    }),
  });
});
```

- [ ] **Step 2: Add a failing browser assertion for thumbnail visibility and detail navigation**

```ts
await expect(page.getByRole("link", { name: /ürün görseli: oversize hoodie/i })).toBeVisible();
await page.getByRole("link", { name: /oversize hoodie/i }).click();
await expect(page).toHaveURL(/\/products\/prod_1$/);
await expect(page.getByRole("img", { name: /oversize hoodie ana görsel/i })).toBeVisible();
```

- [ ] **Step 3: Run the E2E spec to verify it fails before the UI work is complete**

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/tracking.spec.ts`
Expected: FAIL on the missing thumbnail link and/or missing detail gallery.

- [ ] **Step 4: After Tasks 2-3 are complete, re-run the E2E spec**

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/tracking.spec.ts`
Expected: PASS with the add-product flow, thumbnail click-through, and detail gallery all green.

- [ ] **Step 5: Run a final targeted regression sweep**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/listViews.test.ts` then `pnpm --filter @trendyol-etsy/web test -- src/features/tracking/components/ProductCard.test.tsx src/features/tracking/routes/TrackingCenterPage.test.tsx src/features/product/components/ProductImageGallery.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS for the API and web suites touched by this feature.

- [ ] **Step 6: Commit the regression coverage**

```bash
git add apps/web/tests/e2e/tracking.spec.ts
git commit -m "test: cover tracking thumbnails and detail gallery"
```

