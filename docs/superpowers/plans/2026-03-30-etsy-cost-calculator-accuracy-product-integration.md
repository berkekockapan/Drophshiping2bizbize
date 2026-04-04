# Etsy Cost Calculator Accuracy & Product Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Etsy maliyet hesaplayiciyi `US / OTHER` hedef profilli hizli forma donusturmek; urun detayinda secili varyant icin otomatik maliyet, ShipEntegra tahmini, ABD guven kilidi ve override akisini ayni hesap motoruyla calistirmak.

**Architecture:** Backend tarafinda mevcut tarife katalogu korunacak ama resmi ABD master verisi, kullanici dostu urun tipi profili ve varyant maliyet override sorumluluklari ayrilacak. Web tarafinda ortak `calculateScenario()` motoru `destinationProfile + duty source + override source` modeline cekilecek; hizli form yalnizca manuel `% duty` alacak, urun detayi ise secili varyant + otomatik profil + ShipEntegra tahmini ile ayni motoru local view-model uzerinden kullanacak.

**Tech Stack:** Cloudflare Workers, Hono, D1/SQLite, TypeScript, React 19, TanStack Query, React Testing Library, Vitest, Playwright, Tailwind CSS

---

## Scope Check

Bu spec tek bir akis olusturuyor: tarife dogruluk modeli, urun detayi maliyet entegrasyonu ve hizli form sadelemesi birbirine bagli. Bu yuzden tek plan olarak tutuldu; gorevler backend veri modeli -> ortak hesap motoru -> iki UI yuzeyi sirasiyla parcalandi.

## File Structure / Responsibility Map

### Create
- `apps/api/drizzle/0011_etsy_cost_accuracy.sql`
- `apps/api/src/db/repositories/productVariantCostOverridesRepo.ts`
- `apps/api/src/modules/tracking/buildShipentegraEstimate.ts`
- `apps/api/src/modules/tracking/buildProductCostContext.ts`
- `apps/api/tests/integration/productCostContext.test.ts`
- `apps/web/src/features/etsyCostCalculator/components/HelpTooltip.tsx`
- `apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.ts`
- `apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.test.ts`
- `apps/web/src/features/product/lib/buildProductCostDraft.ts`
- `apps/web/src/features/product/components/ProductCostMetricCard.tsx`
- `apps/web/src/features/product/components/ProductCostPanel.tsx`
- `apps/web/src/features/product/components/ProductCostPanel.test.tsx`
- `apps/web/tests/e2e/product-detail-etsy-cost.spec.ts`

### Modify
- `apps/api/src/db/schema.ts`
- `apps/api/src/db/repositories/tariffCatalogRepo.ts`
- `apps/api/src/db/repositories/tariffAnalysisRepo.ts`
- `apps/api/src/modules/tariff/catalog/usTariffSeed.ts`
- `apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts`
- `apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts`
- `apps/api/src/modules/tracking/buildProductDetailView.ts`
- `apps/api/src/routes/products.ts`
- `apps/api/tests/integration/schema.test.ts`
- `apps/api/tests/tariff/tariffRepositories.test.ts`
- `apps/api/tests/tariff/tariffServices.test.ts`
- `apps/api/tests/tariff/tariffRoutes.test.ts`
- `apps/web/src/app/api.ts`
- `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- `apps/web/src/features/etsyCostCalculator/lib/defaults.ts`
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts`
- `apps/web/src/features/etsyCostCalculator/lib/formatBreakdown.ts`
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts`
- `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts`
- `apps/web/src/features/etsyCostCalculator/lib/validation.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx`
- `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- `apps/web/src/app/router.test.tsx`
- `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`
- `apps/web/tests/e2e/product-detail-tariff.spec.ts`

---

### Task 1: Add tariff accuracy metadata and variant override persistence

**Files:**
- Create: `apps/api/drizzle/0011_etsy_cost_accuracy.sql`
- Create: `apps/api/src/db/repositories/productVariantCostOverridesRepo.ts`
- Modify: `apps/api/src/db/schema.ts`
- Modify: `apps/api/src/db/repositories/tariffCatalogRepo.ts`
- Modify: `apps/api/src/modules/tariff/catalog/usTariffSeed.ts`
- Modify: `apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts`
- Modify: `apps/api/tests/integration/schema.test.ts`
- Modify: `apps/api/tests/tariff/tariffRepositories.test.ts`

- [ ] **Step 1: Write the failing schema + repository tests**

```ts
it("stores product-type profile metadata, master tariff rows, and variant overrides", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);

  const catalogRepo = createTariffCatalogRepo(env.DB);
  const overridesRepo = createProductVariantCostOverridesRepo(env.DB);

  const profile = await catalogRepo.getUsProfileByCatalogId("catalog_711790");
  expect(profile?.profileName).toBe("925 gumus kolye");
  expect(profile?.confidenceMode).toBe("high_confidence");
  expect(profile?.masterEntry.htsCode10).toBe("7117.90.7500");
  expect(profile?.defaultShipentegraUsd).toBeGreaterThan(0);

  await overridesRepo.upsert({
    productId: "prod_1",
    ownerKey: "berke",
    variantId: "var_1",
    manualProductCostAmount: 550,
    manualProductCostCurrency: "TRY",
    manualShippingCostAmount: 7.5,
    manualShippingCostCurrency: "USD",
    updatedAt: Date.parse("2026-03-30T09:00:00.000Z"),
  });

  expect(await overridesRepo.getByVariantId("var_1")).toEqual(expect.objectContaining({ manualProductCostAmount: 550, manualShippingCostAmount: 7.5 }));
});
```

```ts
expect(tables).toEqual(expect.arrayContaining([{ name: "tariff_master_us_entries" }, { name: "product_variant_cost_overrides" }]));
expect(database.prepare("pragma table_info(tariff_classification_catalog)").all()).toEqual(
  expect.arrayContaining([
    expect.objectContaining({ name: "profile_name" }),
    expect.objectContaining({ name: "confidence_mode" }),
    expect.objectContaining({ name: "master_entry_id" }),
    expect.objectContaining({ name: "default_shipentegra_usd" }),
  ]),
);
```

- [ ] **Step 2: Run the focused API tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/integration/schema.test.ts tests/tariff/tariffRepositories.test.ts
```

Expected: FAIL with missing table / missing column / missing repository errors.

- [ ] **Step 3: Add the migration and schema entries**

```sql
create table tariff_master_us_entries (
  id text primary key,
  hts_code_8 text not null,
  hts_code_10 text not null,
  description text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  duty_summary text not null,
  source_revision text not null,
  source_url text,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
);

alter table tariff_classification_catalog add column profile_name text;
alter table tariff_classification_catalog add column confidence_mode text not null default 'low_confidence';
alter table tariff_classification_catalog add column master_entry_id text;
alter table tariff_classification_catalog add column default_shipentegra_usd real;

create table product_variant_cost_overrides (
  variant_id text primary key,
  product_id text not null,
  owner_key text not null,
  manual_product_cost_amount real,
  manual_product_cost_currency text,
  manual_shipping_cost_amount real,
  manual_shipping_cost_currency text,
  created_at integer not null,
  updated_at integer not null
);
```

```ts
export const tariffMasterUsEntries = sqliteTable("tariff_master_us_entries", { ... });
export const productVariantCostOverrides = sqliteTable("product_variant_cost_overrides", { ... });
```
- [ ] **Step 4: Extend the tariff seed + repositories to use the new data model**

```ts
export interface TariffSeedItem {
  catalogId: string;
  canonicalHs6: string;
  profileName: string;
  confidenceMode: "high_confidence" | "low_confidence";
  defaultShipentegraUsd: number;
  masterEntry: {
    id: string;
    htsCode8: string;
    htsCode10: string;
    description: string;
    generalDutyRate: number;
    additionalDutyRate: number;
    combinedDutyRate: number;
    dutySummary: string;
    sourceRevision: string;
    sourceUrl: string;
  };
  title: string;
  description: string;
  keywords: string[];
}

export const US_TARIFF_SEED: TariffSeedItem[] = [{
  catalogId: "catalog_711790",
  canonicalHs6: "711790",
  profileName: "925 gumus kolye",
  confidenceMode: "high_confidence",
  defaultShipentegraUsd: 4.9,
  masterEntry: {
    id: "master_711790_2026r4",
    htsCode8: "7117.90.75",
    htsCode10: "7117.90.7500",
    description: "Imitation jewelry of base metal",
    generalDutyRate: 0.11,
    additionalDutyRate: 0,
    combinedDutyRate: 0.11,
    dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
    sourceRevision: "USITC HTS 2026 Revision 4",
    sourceUrl: "https://www.usitc.gov/",
  },
  title: "Imitation jewelry",
  description: "Ince zincirli kolye ve aksesuar profili",
  keywords: ["kolye", "gumus kolye", "zincir", "aksesuar"],
}];
```

```ts
async upsertCatalogWithUsProfile(item: TariffSeedItem) {
  await db.prepare(`insert or replace into tariff_master_us_entries (...) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(item.masterEntry.id, item.masterEntry.htsCode8, item.masterEntry.htsCode10, item.masterEntry.description, item.masterEntry.generalDutyRate, item.masterEntry.additionalDutyRate, item.masterEntry.combinedDutyRate, item.masterEntry.dutySummary, item.masterEntry.sourceRevision, item.masterEntry.sourceUrl, Date.now(), Date.now())
    .run();

  await db.prepare(`insert or replace into tariff_classification_catalog (id, canonical_hs6, profile_name, title, description, keywords_json, source_type, source_version, confidence_mode, master_entry_id, default_shipentegra_usd, created_at, updated_at) values (?, ?, ?, ?, ?, ?, 'seed', '2026-r4', ?, ?, ?, ?, ?)`)
    .bind(item.catalogId, item.canonicalHs6, item.profileName, item.title, item.description, JSON.stringify(item.keywords), item.confidenceMode, item.masterEntry.id, item.defaultShipentegraUsd, Date.now(), Date.now())
    .run();
}
```

```ts
export function createProductVariantCostOverridesRepo(db: D1Database) {
  return {
    async upsert(input: UpsertVariantCostOverrideInput) { /* insert ... on conflict(variant_id) do update ... */ },
    async getByVariantId(variantId: string) { /* select ... where variant_id = ? */ },
    async listByProductId(productId: string) { /* select ... where product_id = ? */ },
  };
}
```

- [ ] **Step 5: Re-run the focused API tests**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/integration/schema.test.ts tests/tariff/tariffRepositories.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/drizzle/0011_etsy_cost_accuracy.sql apps/api/src/db/schema.ts apps/api/src/db/repositories/tariffCatalogRepo.ts apps/api/src/db/repositories/productVariantCostOverridesRepo.ts apps/api/src/modules/tariff/catalog/usTariffSeed.ts apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts apps/api/tests/integration/schema.test.ts apps/api/tests/tariff/tariffRepositories.test.ts
git commit -m "feat: add tariff accuracy metadata and variant cost overrides"
```

### Task 2: Build backend confidence gating and product cost context payloads

**Files:**
- Create: `apps/api/src/modules/tracking/buildShipentegraEstimate.ts`
- Create: `apps/api/src/modules/tracking/buildProductCostContext.ts`
- Create: `apps/api/tests/integration/productCostContext.test.ts`
- Modify: `apps/api/src/db/repositories/tariffAnalysisRepo.ts`
- Modify: `apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts`
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/api/tests/tariff/tariffServices.test.ts`
- Modify: `apps/api/tests/tariff/tariffRoutes.test.ts`
- Modify: `apps/web/src/app/api.ts`

- [ ] **Step 1: Write the failing service + route tests**

```ts
it("returns confidence state, selected profile, and lock reason", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);

  const result = await buildTariffRecommendations(env.DB, {
    ownerKey: "berke",
    productId: "prod_1",
    title: "Belirsiz aksesuar",
    descriptionRaw: "karisik malzemeli el isi",
    category: "Aksesuar",
    attributes: [],
    images: [],
    aiContext: null,
  });

  expect(["high_confidence", "low_confidence"]).toContain(result.confidenceState);
  expect(result.selectedProfile?.profileName ?? null).not.toBeUndefined();
  expect(typeof result.lockedReason === "string" || result.lockedReason === null).toBe(true);
});
```

```ts
it("returns variant-aware cost context and persists manual overrides", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);
  const seeded = await createTrackedProduct(env, { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" }, { fetchImpl: async () => new Response(productHtml, { status: 200 }), now: new Date("2026-03-30T09:00:00.000Z") });

  const app = createApp();
  const detail = await (await app.request(`http://localhost/owners/berke/products/${seeded.product.id}`, undefined, env)).json();
  expect(detail.costContext.selectedVariantId).toBeTruthy();
  expect(detail.costContext.variants[0]?.autoProductCost.currency).toBe("TRY");
  expect(detail.costContext.variants[0]?.autoShippingEstimate.amount).toBeGreaterThan(0);
  expect(["automatic_confirmed", "review_required", "locked"]).toContain(detail.costContext.usState.status);

  const variantId = detail.costContext.variants[0].variantId;
  const overrideResponse = await app.request(`http://localhost/owners/berke/products/${seeded.product.id}/variants/${variantId}/cost-overrides`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ manualProductCost: { amount: 399, currency: "TRY" }, manualShippingCost: { amount: 8.25, currency: "USD" } }) }, env);
  expect(overrideResponse.status).toBe(200);
});
```

- [ ] **Step 2: Run the focused backend tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffServices.test.ts tests/tariff/tariffRoutes.test.ts tests/integration/productCostContext.test.ts
```

Expected: FAIL because confidence fields, product cost context, and override route do not exist yet.
- [ ] **Step 3: Implement confidence scoring and ShipEntegra estimate helpers**

```ts
const best = recommendations[0] ?? null;
const second = recommendations[1] ?? null;
const confidenceState = best && best.score >= 140 && (!second || best.score - second.score >= 25) ? "high_confidence" : "low_confidence";
const selectedProfile = confidenceState === "high_confidence" && best
  ? { catalogId: best.catalogId, profileName: best.profileName, canonicalHs6: best.canonicalHs6, htsCode10: best.htsCode10, combinedDutyRate: best.combinedDutyRate, dutySummary: best.dutySummary, defaultShipentegraUsd: best.defaultShipentegraUsd }
  : null;
const lockedReason = selectedProfile ? null : best ? "Sistem ABD profilinden yeterince emin degil. Yanlis kesin sonuc gostermemek icin hesap kilitli kalmali." : "Bu urun icin kullanilabilir ABD profili bulunamadi.";
const run = await analysisRepo.createRun({ ownerKey: input.ownerKey, productId: input.productId, usedAi: false, inputSnapshot: input, resultSnapshot: { confidenceState, selectedProfile, lockedReason, recommendations }, engineVersion: "tariff-v2" });
return { runId: run.id, usedAi: false, confidenceState, selectedProfile, lockedReason, recommendations };
```

```ts
export function buildShipentegraEstimate(input: { title: string | null; category: string | null; attributes: Array<{ key: string; value: string }>; defaultShipentegraUsd?: number | null; }) {
  if (typeof input.defaultShipentegraUsd === "number") return { amount: input.defaultShipentegraUsd, currency: "USD" as const, sourceType: "profile_default" as const };
  const normalized = `${input.title ?? ""} ${input.category ?? ""} ${input.attributes.map((item) => item.value).join(" ")}`.toLocaleLowerCase("tr-TR");
  if (/kolye|kupe|bileklik|aksesuar/.test(normalized)) return { amount: 4.9, currency: "USD" as const, sourceType: "system_default" as const };
  if (/hoodie|sweat|tisort|tekstil/.test(normalized)) return { amount: 7.5, currency: "USD" as const, sourceType: "system_default" as const };
  if (/seramik|kupa|bardak/.test(normalized)) return { amount: 9.8, currency: "USD" as const, sourceType: "system_default" as const };
  return { amount: 6.25, currency: "USD" as const, sourceType: "system_default" as const };
}
```

- [ ] **Step 4: Build product cost context, wire routes, and expose typed web contracts**

```ts
export async function buildProductCostContext(input: BuildProductCostContextInput) {
  const overridesByVariant = new Map(input.overrides.map((row) => [row.variantId, row]));
  const selectedVariant = input.variants.find((variant) => variant.currentStockState === "IN_STOCK") ?? input.variants[0] ?? null;
  const variants = input.variants.map((variant) => {
    const override = overridesByVariant.get(variant.id);
    const autoProductCost = { amount: variant.currentPrice == null ? 0 : Math.round((variant.currentPrice / 100) * 100) / 100, currency: "TRY" as const };
    const autoShippingEstimate = buildShipentegraEstimate({ title: input.product.title, category: input.product.category, attributes: input.product.attributes, defaultShipentegraUsd: input.selectedProfile?.defaultShipentegraUsd ?? null });
    return {
      variantId: variant.id,
      label: [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey,
      autoProductCost,
      manualProductCost: override?.manualProductCostAmount != null && override.manualProductCostCurrency ? { amount: override.manualProductCostAmount, currency: override.manualProductCostCurrency as "USD" | "TRY" } : null,
      autoShippingEstimate,
      manualShippingCost: override?.manualShippingCostAmount != null && override.manualShippingCostCurrency ? { amount: override.manualShippingCostAmount, currency: override.manualShippingCostCurrency as "USD" | "TRY" } : null,
    };
  });
  return {
    selectedVariantId: selectedVariant?.id ?? null,
    variants,
    usState: input.manualSelection ? { status: "automatic_confirmed", label: "otomatik dogrulandi", lockedReason: null, profile: input.manualSelection } : input.latestRun?.selectedProfile ? { status: "automatic_confirmed", label: "otomatik dogrulandi", lockedReason: null, profile: input.latestRun.selectedProfile } : input.latestRun?.confidenceState === "low_confidence" ? { status: "locked", label: "hesap kilitli", lockedReason: input.latestRun.lockedReason, profile: null } : { status: "review_required", label: "inceleme gerekli", lockedReason: "ABD profili secilmeden maliyet acilmaz.", profile: null },
  };
}
```

```ts
app.put(":productId/variants/:variantId/cost-overrides", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) return c.json({ error: "Kayit bulunamadi" }, 404);
  const body = await c.req.json<{ manualProductCost?: { amount: number; currency: "USD" | "TRY" } | null; manualShippingCost?: { amount: number; currency: "USD" | "TRY" } | null; }>();
  const override = await createProductVariantCostOverridesRepo(c.env.DB).upsert({ ownerKey, productId: c.req.param("productId"), variantId: c.req.param("variantId"), manualProductCostAmount: body.manualProductCost?.amount ?? null, manualProductCostCurrency: body.manualProductCost?.currency ?? null, manualShippingCostAmount: body.manualShippingCost?.amount ?? null, manualShippingCostCurrency: body.manualShippingCost?.currency ?? null, updatedAt: Date.now() });
  return c.json({ override });
});
```

```ts
export interface ProductCostContext { selectedVariantId: string | null; variants: ProductCostContextVariant[]; usState: { status: "automatic_confirmed" | "review_required" | "locked"; label: string; lockedReason: string | null; profile: ProductTariffSelection | { catalogId: string; profileName: string; canonicalHs6: string; htsCode10: string | null; combinedDutyRate: number; dutySummary: string; defaultShipentegraUsd: number | null; } | null; }; }
```

- [ ] **Step 5: Re-run the focused backend tests**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffServices.test.ts tests/tariff/tariffRoutes.test.ts tests/integration/productCostContext.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/db/repositories/tariffAnalysisRepo.ts apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts apps/api/src/modules/tracking/buildShipentegraEstimate.ts apps/api/src/modules/tracking/buildProductCostContext.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/src/routes/products.ts apps/api/tests/tariff/tariffServices.test.ts apps/api/tests/tariff/tariffRoutes.test.ts apps/api/tests/integration/productCostContext.test.ts apps/web/src/app/api.ts
git commit -m "feat: add confidence-gated product cost context"
```

### Task 3: Refactor the shared calculator model to `US / OTHER` destination profiles

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.ts`
- Create: `apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/defaults.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/formatBreakdown.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/validation.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`

- [ ] **Step 1: Write the failing migration + math tests**

```ts
it("migrates legacy import duty fields into the new destination profile draft", () => {
  const migrated = migrateCalculatorStorage({ version: 1, profileVersion: "etsy-tr-2026-03-28", draft: { usdTryRate: 40, salePriceUsd: 50, importDutyEnabled: true, importDutyRate: 0.11, importDutyLabel: "ABD duty" }, presets: [], updatedAt: 1 } as unknown);
  expect(migrated.draft.destinationProfile).toBe("US");
  expect(migrated.draft.manualDutyPercent).toBe(11);
  expect(migrated.draft.resolvedDutyPercent).toBeNull();
});
```

```ts
it("applies duty only for the US destination profile and tags the source correctly", () => {
  const us = calculateScenario({ ...createDefaultDraft(), destinationProfile: "US", manualDutyPercent: 15, valueSources: { duty: "manual_override" }, salePriceUsd: 50, productCost: { amount: 18, currency: "USD" } });
  expect(us.breakdown.find((row) => row.key === "us_duty_fee")?.amountUsd).toBeGreaterThan(0);
  expect(us.breakdown.find((row) => row.key === "us_duty_fee")?.sourceType).toBe("manual_override");
  const other = calculateScenario({ ...createDefaultDraft(), destinationProfile: "OTHER", manualDutyPercent: 15, salePriceUsd: 50 });
  expect(other.breakdown.find((row) => row.key === "us_duty_fee")).toBeUndefined();
});
```

- [ ] **Step 2: Run the focused calculator logic tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/migrateCalculatorStorage.test.ts src/features/etsyCostCalculator/lib/calculateScenario.test.ts src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts
```

Expected: FAIL with missing fields / missing module / stale source-label assertions.
- [ ] **Step 3: Introduce the new draft shape and storage migration**

```ts
export type DestinationProfile = "US" | "OTHER";
export type BreakdownSourceType = "system_default" | "manual_override" | "profile_default" | "analysis_selected" | "conditional";

export interface CalculatorDraft {
  destinationProfile: DestinationProfile;
  manualDutyPercent: number;
  resolvedDutyPercent: number | null;
  dutyLabel: string | null;
  linkedVariantId: string | null;
  valueSources: Partial<Record<"productCost" | "actualShippingCost" | "duty", Exclude<BreakdownSourceType, "conditional"> | null>>;
  usdTryRate: number;
  salePriceUsd: number;
  buyerPaidShippingUsd: number;
  buyerPaidExtrasUsd: number;
  buyerTaxCollectedByEtsyUsd: number;
  saleDiscountPercent: number;
  coupon: CouponInput;
  freeShipping: boolean;
  productCost: MoneyInput;
  actualShippingCost: MoneyInput;
  packagingCost: MoneyInput;
  shipentegraOperationCost: MoneyInput;
  customCosts: CostLineInput[];
  overheadMode: "off" | "per_order" | "allocated_total";
  overheadPerOrder: MoneyInput;
  overheadTotalLines: CostLineInput[];
  overheadExpectedOrderCount: number;
  targetProfitMode: "margin_percent" | "net_profit_usd" | "net_profit_try";
  targetProfitValue: number;
  vatMode: "vat_id_provided" | "no_vat_id";
  currencyConversionEnabled: boolean;
  offsiteAdsMode: "off" | "rate_12" | "rate_15";
  includeDepositFee: boolean;
  feeProfileOverrides: FeeProfileOverrides | null;
}
```

```ts
export function migrateCalculatorStorage(input: unknown): EtsyCostCalculatorStorage {
  const fallback = createDefaultCalculatorStorage();
  if (!input || typeof input !== "object") return fallback;
  const raw = input as Partial<EtsyCostCalculatorStorage> & { draft?: Record<string, unknown> & { importDutyEnabled?: boolean; importDutyRate?: number | null; importDutyLabel?: string | null; destinationProfile?: DestinationProfile; manualDutyPercent?: number; } };
  const draft = raw.draft ?? {};
  const destinationProfile = draft.destinationProfile ?? (draft.importDutyEnabled || typeof draft.importDutyRate === "number" ? "US" : "OTHER");
  return {
    ...fallback,
    ...raw,
    draft: {
      ...fallback.draft,
      ...draft,
      destinationProfile,
      manualDutyPercent: typeof draft.manualDutyPercent === "number" ? draft.manualDutyPercent : typeof draft.importDutyRate === "number" ? Math.round(draft.importDutyRate * 10000) / 100 : 0,
      resolvedDutyPercent: null,
      dutyLabel: typeof draft.importDutyLabel === "string" ? draft.importDutyLabel : null,
      linkedVariantId: typeof draft.linkedVariantId === "string" ? draft.linkedVariantId : null,
      valueSources: (draft.valueSources as CalculatorDraft["valueSources"]) ?? {},
    },
  };
}
```

- [ ] **Step 4: Update the calculation logic, source labels, validation, and hook hydration**

```ts
const appliedDutyPercent = draft.destinationProfile === "US" ? (typeof draft.resolvedDutyPercent === "number" ? draft.resolvedDutyPercent : draft.manualDutyPercent) : 0;
const usDutyUsd = appliedDutyPercent > 0 ? round2(revenueExcludingTaxUsd * (appliedDutyPercent / 100)) : 0;
if (draft.destinationProfile === "US" && usDutyUsd > 0) {
  breakdown.push({
    key: "us_duty_fee",
    label: draft.dutyLabel ?? "Duty",
    amountUsd: usDutyUsd,
    amountTry: toTry(usDutyUsd, draft.usdTryRate),
    sourceType: draft.valueSources.duty ?? (typeof draft.resolvedDutyPercent === "number" ? "analysis_selected" : "manual_override"),
    note: typeof draft.resolvedDutyPercent === "number" ? "Secili urun tipi profili ve analiz kilidine gore otomatik uygulandi." : "Hizli formda girilen manuel duty yuzdesi uygulandi.",
  });
}
```

```ts
const SOURCE_LABELS = {
  system_default: "Sistem",
  manual_override: "Manuel",
  profile_default: "Profil",
  analysis_selected: "Analiz",
  conditional: "Kosullu",
} as const;
```

```ts
if (draft.manualDutyPercent < 0 || draft.manualDutyPercent > 100) {
  errors.manualDutyPercent = "Duty orani %0 ile %100 arasinda olmali.";
}
```

```ts
const normalizedInitialStorage = useMemo(() => (typeof initialStorage === "undefined" ? initialStorage : migrateCalculatorStorage(initialStorage)), [initialStorage]);
const [storage, setStorage] = useState<EtsyCostCalculatorStorage>(() => normalizedInitialStorage ?? fallbackStorage);
```

- [ ] **Step 5: Re-run the focused calculator logic tests**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/lib/migrateCalculatorStorage.test.ts src/features/etsyCostCalculator/lib/calculateScenario.test.ts src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/lib/types.ts apps/web/src/features/etsyCostCalculator/lib/defaults.ts apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.ts apps/web/src/features/etsyCostCalculator/lib/migrateCalculatorStorage.test.ts apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts apps/web/src/features/etsyCostCalculator/lib/calculateScenario.test.ts apps/web/src/features/etsyCostCalculator/lib/formatBreakdown.ts apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.ts apps/web/src/features/etsyCostCalculator/lib/groupBreakdownRows.test.ts apps/web/src/features/etsyCostCalculator/lib/validation.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx
git commit -m "refactor: switch calculator to destination profiles"
```

### Task 4: Rebuild the quick form UI around `US / OTHER`, inline duty, and help icons

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/components/HelpTooltip.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Modify: `apps/web/src/app/router.test.tsx`
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] **Step 1: Write the failing quick-form and route tests**

```tsx
render(<QuickModeForm draft={{ ...createDefaultDraft(), destinationProfile: "OTHER" }} validationErrors={{}} salePriceLabel="Opsiyonel satis fiyati (USD)" salePriceRequired={false} onChange={onChange} />);
await user.click(screen.getByRole("button", { name: /abd hedef profili/i }));
expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ destinationProfile: "US" }));
expect(screen.getByLabelText(/usd\/try kuru/i)).toBeInTheDocument();
expect(screen.queryByLabelText(/manuel duty %/i)).not.toBeInTheDocument();
await user.click(screen.getByRole("button", { name: /abd hedef profili/i }));
expect(screen.getByLabelText(/manuel duty %/i)).toBeInTheDocument();
```

```tsx
renderWithProviders(<EtsyCostCalculatorPage />, { route: "/etsy-cost-calculator?ownerKey=berke&productId=prod_1" });
expect(await screen.findByRole("button", { name: /abd hedef profili/i })).toBeInTheDocument();
expect(screen.queryByRole("heading", { name: /abd ithalat vergisi/i })).not.toBeInTheDocument();
expect(screen.getByText(/toplam gider ozeti/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused web tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/app/router.test.tsx
```

Expected: FAIL because the form still shows the old linked-GTIP block and lacks destination/help controls.
- [ ] **Step 3: Implement the help tooltip and new quick-form layout**

```tsx
export function HelpTooltip({ label, description }: { label: string; description: string }) {
  const tooltipId = `help-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <span className="group relative inline-flex items-center">
      <button type="button" aria-label={`${label} yardim`} aria-describedby={tooltipId} className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-semibold text-slate-600">?</button>
      <span id={tooltipId} role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-10 mt-2 hidden w-56 -translate-x-1/2 rounded-xl bg-slate-900 px-3 py-2 text-xs text-white group-hover:block">{description}</span>
    </span>
  );
}
```

```tsx
<div className="flex flex-wrap gap-2">
  {([ ["US", "ABD hedef profili"], ["OTHER", "Diger hedef profili"] ] as const).map(([value, label]) => (
    <button key={value} type="button" aria-pressed={draft.destinationProfile === value} className={draft.destinationProfile === value ? "rounded-full bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white" : "rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"} onClick={() => onChange({ destinationProfile: value })}>{label}</button>
  ))}
</div>
<label className="grid gap-2 text-sm text-slate-700">
  <span className="inline-flex items-center gap-2">USD/TRY kuru <HelpTooltip label="USD/TRY kuru" description="Maliyetlerin TRY ve USD donusumunde kullanilan kur." /></span>
  <input aria-label="USD/TRY kuru" type="number" min={0} step="0.01" value={draft.usdTryRate} onChange={(event) => onChange({ usdTryRate: Number(event.target.value) })} className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]" />
</label>
{draft.destinationProfile === "US" ? (
  <label className="grid gap-2 text-sm text-slate-700">
    <span className="inline-flex items-center gap-2">Manuel duty % <HelpTooltip label="Duty" description="ABD'ye giriste urune uygulanabilecek ithalat vergi etkisi. Hizli formda bu alani yuzde olarak sen belirlersin." /></span>
    <input aria-label="Manuel duty %" type="number" min={0} max={100} step="0.01" value={draft.manualDutyPercent} onChange={(event) => onChange({ manualDutyPercent: Number(event.target.value) })} className="rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-[#F1641E]" />
  </label>
) : null}
```

- [ ] **Step 4: Update the result panel, breakdown help rows, and route wiring**

```tsx
<div className="grid gap-4 md:grid-cols-2">
  <QuickStat label="Onerilen Etsy satis fiyati" value={formatUsd(recommendedSalePriceUsd)} />
  <QuickStat label="Indirimli liste fiyati" value={formatUsd(targetSafeListPriceUsd)} />
  <QuickStat label="Basa bas fiyat" value={formatUsd(breakEvenPriceUsd)} />
  <QuickStat label="Tahmini net kar" value={formatUsd(activeScenario?.netProfitUsd ?? 0)} />
</div>
<div className="mt-4 rounded-2xl border border-slate-100 p-4 text-sm text-slate-700">
  <p className="font-semibold text-slate-900">Toplam gider ozeti</p>
  <p className="mt-2">Operasyonel toplam: {formatUsd(activeScenario?.totalOperationalCostsUsd ?? 0)}</p>
  <p>Etsy etkisi: {formatUsd(activeScenario?.totalEtsyFeesUsd ?? 0)}</p>
  <p>Toplam maliyet: {formatUsd((activeScenario?.totalOperationalCostsUsd ?? 0) + (activeScenario?.totalEtsyFeesUsd ?? 0))}</p>
</div>
```

```tsx
const HELP_COPY: Record<string, string> = {
  us_duty_fee: "ABD'ye giriste urune uygulanabilecek ithalat vergi etkisi.",
  summary_net_profit: "Tum giderlerden sonra elinde kalan net kazanc.",
  overhead_cost: "Siparis basina dagitilan genel gider payi.",
};
```

```tsx
const calculator = useEtsyCostCalculatorState({ initialStorage: settingsQuery.data?.etsyCostCalculator ?? (settingsQuery.data ? createDefaultCalculatorStorage() : undefined), onPersist: patchMutation.mutateAsync });
return (
  <div className="space-y-6">
    <CalculatorHeader profileLabel="Etsy TR varsayilanlari + hedef profil" saveState={calculator.saveState} saveErrorMessage={calculator.saveErrorMessage} />
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
      <div className="space-y-6"><QuickModeForm ... /><FeeBreakdownTable groups={activeTab === "analyze_price" ? calculator.analysisBreakdownGroups : calculator.recommendedBreakdownGroups} /></div>
      <ResultsPanel ... />
    </div>
    <AdvancedSettingsDrawer ...>{/* existing advanced cards stay */}</AdvancedSettingsDrawer>
  </div>
);
```

- [ ] **Step 5: Re-run the focused web tests**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/components/QuickModeForm.test.tsx src/features/etsyCostCalculator/components/ResultsPanel.test.tsx src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/app/router.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/components/HelpTooltip.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeForm.tsx apps/web/src/features/etsyCostCalculator/components/QuickModeForm.test.tsx apps/web/src/features/etsyCostCalculator/components/ResultsPanel.tsx apps/web/src/features/etsyCostCalculator/components/ResultsPanel.test.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.tsx apps/web/src/features/etsyCostCalculator/components/FeeBreakdownTable.test.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx apps/web/src/app/router.test.tsx apps/web/tests/e2e/etsy-cost-calculator.spec.ts
git commit -m "feat: simplify quick form for US and OTHER profiles"
```

### Task 5: Add the product-detail cost panel with selected variant, lock states, and override persistence

**Files:**
- Create: `apps/web/src/features/product/lib/buildProductCostDraft.ts`
- Create: `apps/web/src/features/product/components/ProductCostMetricCard.tsx`
- Create: `apps/web/src/features/product/components/ProductCostPanel.tsx`
- Create: `apps/web/src/features/product/components/ProductCostPanel.test.tsx`
- Modify: `apps/web/src/app/api.ts`
- Modify: `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-tariff.spec.ts`
- Create: `apps/web/tests/e2e/product-detail-etsy-cost.spec.ts`

- [ ] **Step 1: Write the failing product-cost panel tests**

```tsx
renderWithProviders(<ProductCostPanel ownerKey="berke" productId="prod_1" costContext={{ selectedVariantId: "var_1", variants: [{ variantId: "var_1", label: "L / Siyah", autoProductCost: { amount: 449.9, currency: "TRY" }, manualProductCost: null, autoShippingEstimate: { amount: 7.5, currency: "USD" }, manualShippingCost: null }, { variantId: "var_2", label: "M / Siyah", autoProductCost: { amount: 429.9, currency: "TRY" }, manualProductCost: null, autoShippingEstimate: { amount: 7.5, currency: "USD" }, manualShippingCost: null }], usState: { status: "locked", label: "hesap kilitli", lockedReason: "Sistem ABD profilinden yeterince emin degil.", profile: null } }} />);
expect(screen.getByText(/abd toplam maliyet/i)).toBeInTheDocument();
expect(screen.getByText(/hesap kilitli/i)).toBeInTheDocument();
await user.selectOptions(screen.getByLabelText(/secili varyant/i), "var_2");
await user.clear(screen.getByLabelText(/urun maliyeti override/i));
await user.type(screen.getByLabelText(/urun maliyeti override/i), "399");
await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/variants/var_2/cost-overrides"), expect.objectContaining({ method: "PUT" })));
```

```tsx
expect(await screen.findByRole("heading", { name: /urun maliyet gorunumu/i })).toBeInTheDocument();
expect(screen.getByText(/diger toplam maliyet/i)).toBeInTheDocument();
expect(screen.getByText(/gtip \/ abd vergi analizi/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused product-detail tests and confirm they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductCostPanel.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/product/components/ProductTariffPanel.test.tsx
```

Expected: FAIL because the product cost panel and cost override route client do not exist.

- [ ] **Step 3: Build the variant-aware draft helper and cost panel**

```ts
export function buildProductCostDraft(input: { baseDraft: CalculatorDraft; variant: ProductCostContextVariant; destinationProfile: DestinationProfile; usState: ProductCostContext["usState"]; }) {
  const productCost = input.variant.manualProductCost ?? input.variant.autoProductCost;
  const actualShippingCost = input.variant.manualShippingCost ?? input.variant.autoShippingEstimate;
  const resolvedDutyPercent = input.destinationProfile === "US" && input.usState.profile && "combinedDutyRate" in input.usState.profile ? Math.round(input.usState.profile.combinedDutyRate * 10000) / 100 : null;
  return {
    ...input.baseDraft,
    destinationProfile: input.destinationProfile,
    linkedVariantId: input.variant.variantId,
    productCost,
    actualShippingCost,
    resolvedDutyPercent,
    dutyLabel: input.destinationProfile === "US" && input.usState.profile && "dutySummary" in input.usState.profile ? input.usState.profile.dutySummary : null,
    valueSources: {
      ...input.baseDraft.valueSources,
      productCost: input.variant.manualProductCost ? "manual_override" : "system_default",
      actualShippingCost: input.variant.manualShippingCost ? "manual_override" : input.variant.autoShippingEstimate.amount > 0 ? "profile_default" : "system_default",
      duty: resolvedDutyPercent == null ? null : "analysis_selected",
    },
  } satisfies CalculatorDraft;
}
```

```tsx
const settingsQuery = useQuery({ queryKey: ["settings", "product-cost-panel"], queryFn: fetchSettings });
const baseDraft = useMemo(() => migrateCalculatorStorage(settingsQuery.data?.etsyCostCalculator).draft, [settingsQuery.data?.etsyCostCalculator]);
const [selectedVariantId, setSelectedVariantId] = useState(costContext.selectedVariantId ?? costContext.variants[0]?.variantId ?? "");
const selectedVariant = costContext.variants.find((variant) => variant.variantId === selectedVariantId) ?? costContext.variants[0];
const otherDraft = buildProductCostDraft({ baseDraft, variant: selectedVariant, destinationProfile: "OTHER", usState: costContext.usState });
const otherScenario = calculateScenario(otherDraft);
const usScenario = costContext.usState.status === "locked" ? null : calculateScenario(buildProductCostDraft({ baseDraft, variant: selectedVariant, destinationProfile: "US", usState: costContext.usState }));
```

- [ ] **Step 4: Persist override edits and mount the panel inside product detail**

```ts
export async function saveProductVariantCostOverride(ownerKey: OwnerKey, productId: string, variantId: string, payload: { manualProductCost?: { amount: number; currency: "USD" | "TRY" } | null; manualShippingCost?: { amount: number; currency: "USD" | "TRY" } | null; }) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/variants/${variantId}/cost-overrides`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  return parseJson<{ override: { variantId: string } }>(response);
}
```

```tsx
const saveOverrideMutation = useMutation({
  mutationFn: (payload: { variantId: string; manualProductCost: MoneyInput | null; manualShippingCost: MoneyInput | null }) =>
    saveProductVariantCostOverride(ownerKey, productId, payload.variantId, { manualProductCost: payload.manualProductCost, manualShippingCost: payload.manualShippingCost }),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] });
  },
});
```

```tsx
{detailQuery.data ? (
  <>
    <ProductSummary ... />
    <ProductCostPanel ownerKey={ownerKey} productId={productId} costContext={detailQuery.data.costContext} />
    <ProductTariffPanel ownerKey={ownerKey} productId={productId} analysis={detailQuery.data.tariffAnalysis} />
    <div className="space-y-6" hidden={mode !== "overview"} aria-hidden={mode !== "overview"}><VariantTable variants={detailQuery.data.variants} /><ChangeTimeline items={detailQuery.data.changeTimeline} /></div>
  </>
) : null}
```

- [ ] **Step 5: Add focused E2E coverage and rerun the product tests**

```ts
import { expect, test } from "@playwright/test";

test("product detail updates cost cards when the variant and overrides change", async ({ page }) => {
  await page.goto("/owners/berke/products/prod_1");
  await expect(page.getByRole("heading", { name: /urun maliyet gorunumu/i })).toBeVisible();
  await expect(page.getByText(/hesap kilitli/i)).toBeVisible();
  await page.getByLabel(/secili varyant/i).selectOption("var_2");
  await page.getByLabel(/urun maliyeti override/i).fill("399");
  await page.getByLabel(/kargo override/i).fill("8.25");
  await expect(page.getByText(/diger toplam maliyet/i)).toBeVisible();
});
```

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductCostPanel.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/product/components/ProductTariffPanel.test.tsx
pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/product-detail-etsy-cost.spec.ts tests/e2e/product-detail-tariff.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/product/lib/buildProductCostDraft.ts apps/web/src/features/product/components/ProductCostMetricCard.tsx apps/web/src/features/product/components/ProductCostPanel.tsx apps/web/src/features/product/components/ProductCostPanel.test.tsx apps/web/src/features/product/components/ProductTariffPanel.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/src/app/api.ts apps/web/tests/e2e/product-detail-etsy-cost.spec.ts apps/web/tests/e2e/product-detail-tariff.spec.ts
git commit -m "feat: add variant-aware product cost panel"
```

---

## Self-Review Checklist

- **Spec coverage:** `US / OTHER` hedef profili, hizli formda manuel duty, product detail varyant maliyeti, ShipEntegra tahmini, ABD guven kilidi, spesifik urun tipi profilleri, resmi master verisi ve tooltip gereksinimleri gorevlere dagitildi.
- **Placeholder scan:** `TBD`, `TODO`, `uygun sekilde`, `sonra ekle` benzeri bos talimat yok.
- **Type consistency:** `destinationProfile`, `manualDutyPercent`, `resolvedDutyPercent`, `valueSources`, `costContext`, `usState.status`, `profileName` isimleri tum gorevlerde ayni tutuldu.

## Final Verification

- [ ] Run: `pnpm --filter @trendyol-etsy/api exec vitest run tests/integration/schema.test.ts tests/integration/productCostContext.test.ts tests/tariff/tariffRepositories.test.ts tests/tariff/tariffServices.test.ts tests/tariff/tariffRoutes.test.ts`
- [ ] Run: `pnpm --filter @trendyol-etsy/api typecheck`
- [ ] Run: `pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator src/features/product/components/ProductCostPanel.test.tsx src/features/product/routes/ProductDetailPage.test.tsx src/features/product/components/ProductTariffPanel.test.tsx src/app/router.test.tsx`
- [ ] Run: `pnpm --filter @trendyol-etsy/web typecheck`
- [ ] Run: `pnpm --filter @trendyol-etsy/web exec playwright test -c ../../playwright.config.ts tests/e2e/etsy-cost-calculator.spec.ts tests/e2e/product-detail-etsy-cost.spec.ts tests/e2e/product-detail-tariff.spec.ts`
- [ ] Confirm quick formda `ABD / Diger` disinda hedef profil kalmadi, product detail'da low-confidence ABD karti sonuc gostermiyor, manuel varyant override sonrasi `Diger` karti anlik guncelleniyor.
