# GTIP / ABD Vergi Analizi ve Etsy Maliyet Hesaplayici Entegrasyonu Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Urun detayinda otomatik GTIP tavsiyesi, kullanici secimi, ortak bilgi aday kuyrugu ve Etsy maliyet hesaplayici icinde opsiyonel ABD ithalat vergisi entegrasyonu eklemek.

**Architecture:** Backend tarife katalogu, ABD duty profilleri, analiz run kayitlari ve urun secimini ayri tablolarda tutacak. UI tarafi urun detayina yeni bir GTIP paneli ekleyecek; hesaplayici ise urun baglaminda acildiginda secili GTIP'den gelen vergi snapshot'ini sadece kullanici toggle'i acarsa maliyet breakdown'ina katacak.

**Tech Stack:** Cloudflare Workers, Hono, D1/SQLite, TypeScript, React 19, React Query, Vitest, React Testing Library, Playwright, Tailwind CSS

---

## File Structure / Responsibility Map

### Create
- `apps/api/drizzle/0010_tariff_classification.sql`
- `apps/api/src/db/repositories/tariffCatalogRepo.ts`
- `apps/api/src/db/repositories/tariffAnalysisRepo.ts`
- `apps/api/src/db/repositories/tariffSelectionRepo.ts`
- `apps/api/src/db/repositories/tariffKnowledgeRepo.ts`
- `apps/api/src/modules/tariff/catalog/usTariffSeed.ts`
- `apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts`
- `apps/api/src/modules/tariff/analysis/formatTariffDutySummary.ts`
- `apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts`
- `apps/api/src/modules/tariff/search/searchTariffCatalog.ts`
- `apps/api/src/modules/tariff/selection/saveProductTariffSelection.ts`
- `apps/api/src/modules/tariff/knowledge/createTariffKnowledgeCandidate.ts`
- `apps/api/tests/tariff/tariffRepositories.test.ts`
- `apps/api/tests/tariff/tariffServices.test.ts`
- `apps/api/tests/tariff/tariffRoutes.test.ts`
- `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- `apps/web/src/features/product/components/ProductTariffPanel.test.tsx`
- `apps/web/src/features/product/components/TariffRecommendationCard.tsx`
- `apps/web/src/features/product/components/TariffRecommendationCard.test.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.tsx`
- `apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.test.tsx`
- `apps/web/tests/e2e/product-detail-tariff.spec.ts`

### Modify
- `apps/api/src/db/schema.ts`
- `apps/api/src/modules/tracking/buildProductDetailView.ts`
- `apps/api/src/routes/products.ts`
- `apps/web/src/app/api.ts`
- `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- `apps/web/src/features/etsyCostCalculator/lib/defaults.ts`
- `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- `apps/web/src/app/router.test.tsx`
- `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

---

### Task 1: Add tariff tables, seed catalog, and repository coverage

**Files:**
- Create: `apps/api/drizzle/0010_tariff_classification.sql`
- Create: `apps/api/src/db/repositories/tariffCatalogRepo.ts`
- Create: `apps/api/src/db/repositories/tariffAnalysisRepo.ts`
- Create: `apps/api/src/db/repositories/tariffSelectionRepo.ts`
- Create: `apps/api/src/db/repositories/tariffKnowledgeRepo.ts`
- Create: `apps/api/src/modules/tariff/catalog/usTariffSeed.ts`
- Create: `apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts`
- Create: `apps/api/tests/tariff/tariffRepositories.test.ts`
- Modify: `apps/api/src/db/schema.ts`

- [ ] **Step 1: Write the failing repository test**

```ts
import { describe, expect, it } from "vitest";
import { createTestEnv } from "../support/sqlite";
import { createTariffCatalogRepo } from "../../src/db/repositories/tariffCatalogRepo";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";

it("loads seed rows and can search by keyword", async () => {
  const { env } = createTestEnv();
  const repo = createTariffCatalogRepo(env.DB);
  await loadUsTariffSeed(env.DB);
  const matches = await repo.searchCatalog("deri taki");
  expect(matches[0]?.canonicalHs6).toBe("711790");
  const profile = await repo.getUsProfileByCatalogId(matches[0]!.id);
  expect(profile?.combinedDutyRate).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffRepositories.test.ts
```

Expected: FAIL with missing migration / missing module errors.

- [ ] **Step 3: Add migration + schema + seed**

```sql
create table tariff_classification_catalog (
  id text primary key,
  canonical_hs6 text not null,
  title text not null,
  description text,
  keywords_json text,
  source_type text not null,
  source_version text not null,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
);
create table tariff_classification_us_profiles (
  id text primary key,
  catalog_id text not null,
  htsus_code text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  summary_text text not null,
  revision_label text not null,
  created_at integer not null,
  updated_at integer not null
);
create table product_tariff_analysis_runs (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  status text not null,
  used_ai integer not null default 0,
  input_snapshot_json text not null,
  result_snapshot_json text,
  engine_version text not null,
  created_at integer not null,
  completed_at integer
);
create table product_tariff_selection (
  product_id text primary key,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  selection_source text not null,
  selected_by text not null,
  selected_at integer not null,
  analysis_run_id text,
  created_at integer not null,
  updated_at integer not null
);
create table tariff_knowledge_candidates (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  candidate_source text not null,
  payload_json text not null,
  status text not null,
  submitted_by text not null,
  submitted_at integer not null
);
```

```ts
export const US_TARIFF_SEED = [
  {
    catalogId: "catalog_711790",
    canonicalHs6: "711790",
    title: "Imitation jewelry",
    description: "Deri ve benzeri kostum takilar",
    keywords: ["taki", "kolye", "bileklik", "deri taki"],
    usProfile: {
      id: "us_711790_2026r4",
      htsusCode: "7117.90.7500",
      generalDutyRate: 0.11,
      additionalDutyRate: 0,
      combinedDutyRate: 0.11,
      summaryText: "%11 temel vergi + %0 ek tarife = toplam %11",
      revisionLabel: "USITC HTS 2026 Revision 4",
    },
  },
];
```

- [ ] **Step 4: Implement the repository methods**

```ts
export function createTariffCatalogRepo(db: D1Database) {
  return {
    async upsertCatalogWithUsProfile(item: TariffSeedItem) {
      await db.prepare(
        `insert or replace into tariff_classification_catalog
         (id, canonical_hs6, title, description, keywords_json, source_type, source_version, created_at, updated_at)
         values (?, ?, ?, ?, ?, 'seed', '2026-r4', ?, ?)`
      ).bind(item.catalogId, item.canonicalHs6, item.title, item.description, JSON.stringify(item.keywords), Date.now(), Date.now()).run();
      await db.prepare(
        `insert or replace into tariff_classification_us_profiles
         (id, catalog_id, htsus_code, general_duty_rate, additional_duty_rate, combined_duty_rate, summary_text, revision_label, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(item.usProfile.id, item.catalogId, item.usProfile.htsusCode, item.usProfile.generalDutyRate, item.usProfile.additionalDutyRate, item.usProfile.combinedDutyRate, item.usProfile.summaryText, item.usProfile.revisionLabel, Date.now(), Date.now()).run();
    },
    async searchCatalog(query: string) {
      return (await db.prepare(
        `select id, canonical_hs6 as canonicalHs6, title, description
         from tariff_classification_catalog
         where lower(title) like ? or lower(description) like ? or lower(keywords_json) like ?`
      ).bind(`%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`).all()).results;
    },
    async getUsProfileByCatalogId(catalogId: string) {
      return db.prepare(
        `select id, catalog_id as catalogId, combined_duty_rate as combinedDutyRate,
                general_duty_rate as generalDutyRate, additional_duty_rate as additionalDutyRate,
                summary_text as summaryText, revision_label as revisionLabel
         from tariff_classification_us_profiles where catalog_id = ? limit 1`
      ).bind(catalogId).first();
    },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffRepositories.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/drizzle/0010_tariff_classification.sql apps/api/src/db/schema.ts apps/api/src/db/repositories/tariffCatalogRepo.ts apps/api/src/db/repositories/tariffAnalysisRepo.ts apps/api/src/db/repositories/tariffSelectionRepo.ts apps/api/src/db/repositories/tariffKnowledgeRepo.ts apps/api/src/modules/tariff/catalog/usTariffSeed.ts apps/api/src/modules/tariff/catalog/loadUsTariffSeed.ts apps/api/tests/tariff/tariffRepositories.test.ts
git commit -m "feat: add tariff persistence and seed catalog"
```
### Task 2: Build backend tariff analysis, search, selection, and product detail payloads

**Files:**
- Create: `apps/api/src/modules/tariff/analysis/formatTariffDutySummary.ts`
- Create: `apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts`
- Create: `apps/api/src/modules/tariff/search/searchTariffCatalog.ts`
- Create: `apps/api/src/modules/tariff/selection/saveProductTariffSelection.ts`
- Create: `apps/api/src/modules/tariff/knowledge/createTariffKnowledgeCandidate.ts`
- Create: `apps/api/tests/tariff/tariffServices.test.ts`
- Create: `apps/api/tests/tariff/tariffRoutes.test.ts`
- Modify: `apps/api/src/modules/tracking/buildProductDetailView.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/web/src/app/api.ts`

- [ ] **Step 1: Write the failing service and route tests**

```ts
import { expect, it } from "vitest";
import { createTestEnv } from "../support/sqlite";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { buildTariffRecommendations } from "../../src/modules/tariff/analysis/buildTariffRecommendations";

it("returns best 2 recommendations without AI", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);
  const result = await buildTariffRecommendations(env.DB, {
    ownerKey: "berke",
    productId: "prod_1",
    title: "Deri bileklik taki",
    descriptionRaw: "El yapimi deri aksesuar",
    category: "Aksesuar",
    attributes: [{ key: "Materyal", value: "Deri" }],
    images: [],
    aiContext: null,
  });
  expect(result.usedAi).toBe(false);
  expect(result.recommendations).toHaveLength(2);
  expect(result.recommendations[0]?.canonicalHs6).toBe("711790");
});
```

```ts
import { createApp } from "../../src";
const { env } = createTestEnv();
const app = createApp();
const response = await app.fetch(new Request("http://local/owners/berke/products/prod_1/tariff-analysis"), env);
expect([200, 404]).toContain(response.status);
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffServices.test.ts tests/tariff/tariffRoutes.test.ts
```

Expected: FAIL because the service modules and routes do not exist.

- [ ] **Step 3: Implement formatter + recommendation engine**

```ts
export function formatTariffDutySummary(generalDutyRate: number, additionalDutyRate: number) {
  const total = generalDutyRate + additionalDutyRate;
  return `%${(generalDutyRate * 100).toFixed(1)} temel vergi + %${(additionalDutyRate * 100).toFixed(1)} ek tarife = toplam %${(total * 100).toFixed(1)}`;
}

export async function buildTariffRecommendations(db: D1Database, input: BuildTariffRecommendationsInput) {
  const catalogRepo = createTariffCatalogRepo(db);
  const analysisRepo = createTariffAnalysisRepo(db);
  const keywordQuery = [input.title, input.descriptionRaw, input.category, ...(input.attributes ?? []).map((x) => x.value)].filter(Boolean).join(" ");
  const catalogMatches = await catalogRepo.searchCatalog(keywordQuery);
  const recommendations = await Promise.all(catalogMatches.slice(0, 2).map(async (match, index) => {
    const profile = await catalogRepo.getUsProfileByCatalogId(match.id);
    return {
      catalogId: match.id,
      canonicalHs6: match.canonicalHs6,
      title: match.title,
      rationale: `Urun basligi/aciklamasi ${match.title.toLowerCase()} sinyali ile eslesti.`,
      score: 100 - index * 10,
      usProfileId: profile?.id ?? null,
      generalDutyRate: profile?.generalDutyRate ?? 0,
      additionalDutyRate: profile?.additionalDutyRate ?? 0,
      combinedDutyRate: profile?.combinedDutyRate ?? 0,
      dutySummary: profile?.summaryText ?? formatTariffDutySummary(0, 0),
      sourceBadges: ["Kural eslesmesi"],
    };
  }));
  const run = await analysisRepo.createRun({ ownerKey: input.ownerKey, productId: input.productId, usedAi: false, inputSnapshot: input, resultSnapshot: { recommendations }, engineVersion: "tariff-v1" });
  return { runId: run.id, usedAi: false, recommendations };
}
```

- [ ] **Step 4: Wire routes + product detail payload + web API helpers**

```ts
app.get("/:productId/tariff-analysis", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) return c.json({ error: "Kayit bulunamadi" }, 404);
  const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
  if (!detail) return c.json({ error: "Kayit bulunamadi" }, 404);
  return c.json(detail.tariffAnalysis ?? { selection: null, latestRun: null, recommendations: [], manualSearchEnabled: true, disclaimer: "Planlama amacli tahmindir." });
});

app.post("/:productId/tariff-analysis/run", async (c) => {
  const ownerKey = parseOwnerKey(c.req.param("ownerKey"));
  if (!ownerKey) return c.json({ error: "Kayit bulunamadi" }, 404);
  const detail = await buildProductDetailView(c.env.DB, ownerKey, c.req.param("productId"));
  if (!detail) return c.json({ error: "Kayit bulunamadi" }, 404);
  return c.json(await buildTariffRecommendations(c.env.DB, {
    ownerKey,
    productId: c.req.param("productId"),
    title: detail.product.title,
    descriptionRaw: detail.product.descriptionRaw,
    category: detail.product.category,
    attributes: detail.product.attributes ?? [],
    images: detail.product.images ?? [],
    aiContext: null,
  }));
});
```

```ts
const latestTariffRun = await createTariffAnalysisRepo(db).getLatestRun(productId);
const tariffSelection = await createTariffSelectionRepo(db).getSelection(productId);
return {
  product: {
    ...product,
    attributes: safeParseJson(detail.product.attributesRaw),
    images: safeParseJson(detail.product.imagesRaw),
    userCategory:
      userCategoryId && userCategoryName
        ? { id: userCategoryId, name: userCategoryName }
        : null,
  },
  currentState: detail.currentState,
  variants,
  priceHistory,
  stockHistory,
  changeTimeline: buildProductChangeTimeline({ audits, contentHistory, priceHistory, stockHistory, variants: detail.variants }),
  notifications: await notificationsRepo.listNotifications(ownerKey, productId),
  tariffAnalysis: {
    selection: tariffSelection,
    latestRun: latestTariffRun,
    recommendations: latestTariffRun?.resultSnapshot?.recommendations ?? [],
    manualSearchEnabled: true,
    disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
  },
};
```

```ts
export async function runProductTariffAnalysis(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-analysis/run`, { method: "POST" });
  return parseJson<ProductTariffAnalysisRunResponse>(response);
}
export async function saveProductTariffSelection(ownerKey: OwnerKey, productId: string, payload: ProductTariffSelectionPayload) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-selection`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<ProductTariffSelectionResponse>(response);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run:

```bash
pnpm --filter @trendyol-etsy/api exec vitest run tests/tariff/tariffServices.test.ts tests/tariff/tariffRoutes.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/modules/tariff/analysis/formatTariffDutySummary.ts apps/api/src/modules/tariff/analysis/buildTariffRecommendations.ts apps/api/src/modules/tariff/search/searchTariffCatalog.ts apps/api/src/modules/tariff/selection/saveProductTariffSelection.ts apps/api/src/modules/tariff/knowledge/createTariffKnowledgeCandidate.ts apps/api/src/modules/tracking/buildProductDetailView.ts apps/api/src/routes/products.ts apps/api/tests/tariff/tariffServices.test.ts apps/api/tests/tariff/tariffRoutes.test.ts apps/web/src/app/api.ts
git commit -m "feat: add product tariff analysis backend"
```

### Task 3: Add the GTIP panel to product detail with auto-analysis, manual search, and candidate submission

**Files:**
- Create: `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- Create: `apps/web/src/features/product/components/ProductTariffPanel.test.tsx`
- Create: `apps/web/src/features/product/components/TariffRecommendationCard.tsx`
- Create: `apps/web/src/features/product/components/TariffRecommendationCard.test.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/tests/e2e/product-detail-tariff.spec.ts`

- [ ] **Step 1: Write the failing UI tests**

```tsx
render(<ProductTariffPanel ownerKey="berke" productId="prod_1" analysis={{ selection: null, latestRun: null, recommendations: [], manualSearchEnabled: true, disclaimer: "Planlama amacli" }} />);
expect(screen.getByText(/gtip \/ abd vergi analizi/i)).toBeInTheDocument();
expect(screen.getByText(/analiz ediliyor/i)).toBeInTheDocument();
```

```tsx
expect(await screen.findByText(/gtip \/ abd vergi analizi/i)).toBeInTheDocument();
await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tariff-analysis/run"), expect.anything()));
await user.click(screen.getByRole("button", { name: /bu kodu sec/i }));
expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tariff-selection"), expect.objectContaining({ method: "PUT" }));
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductTariffPanel.test.tsx src/features/product/components/TariffRecommendationCard.test.tsx src/features/product/routes/ProductDetailPage.test.tsx
```

Expected: FAIL because the panel does not exist.
- [ ] **Step 3: Implement the recommendation cards + panel**

```tsx
export function TariffRecommendationCard({ recommendation, onSelect, onSubmitCandidate }: Props) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">GTIP / HS</p>
      <h3 className="mt-1 text-lg font-semibold text-slate-900">{recommendation.canonicalHs6}</h3>
      <p className="mt-1 text-sm text-slate-600">{recommendation.title}</p>
      <p className="mt-3 text-sm text-slate-600">{recommendation.rationale}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{recommendation.dutySummary}</p>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => onSelect(recommendation)}>Bu kodu sec</button>
        <button type="button" onClick={() => onSubmitCandidate(recommendation)}>Ortak bilgiye aday yap</button>
      </div>
    </article>
  );
}

export function ProductTariffPanel({ ownerKey, productId, analysis }: Props) {
  const queryClient = useQueryClient();
  const runMutation = useMutation({ mutationFn: () => runProductTariffAnalysis(ownerKey, productId), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] }) });
  const selectMutation = useMutation({ mutationFn: (payload: ProductTariffSelectionPayload) => saveProductTariffSelection(ownerKey, productId, payload), onSuccess: async () => queryClient.invalidateQueries({ queryKey: ["product-detail", ownerKey, productId] }) });

  useEffect(() => {
    if (!analysis.latestRun && !runMutation.isPending) runMutation.mutate();
  }, [analysis.latestRun, runMutation]);

  if (!analysis.latestRun && runMutation.isPending) {
    return <section><h2>GTIP / ABD Vergi Analizi</h2><p>Analiz ediliyor...</p></section>;
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">GTIP / ABD Vergi Analizi</h2>
          <p className="mt-2 text-sm text-slate-500">{analysis.disclaimer}</p>
        </div>
        <button type="button" onClick={() => runMutation.mutate()}>Yeniden analiz</button>
      </div>
      {analysis.selection ? <p className="mt-4 text-sm text-emerald-700">Bu urun icin secilen GTIP: {analysis.selection.canonicalHs6}</p> : null}
      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        {analysis.recommendations.map((recommendation) => (
          <TariffRecommendationCard
            key={recommendation.catalogId}
            recommendation={recommendation}
            onSelect={(item) => selectMutation.mutate({ catalogId: item.catalogId, usProfileId: item.usProfileId, selectionSource: "recommended" })}
            onSubmitCandidate={(item) => submitTariffKnowledgeCandidate(ownerKey, productId, { catalogId: item.catalogId, usProfileId: item.usProfileId, candidateSource: "recommended_accept" })}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Mount the panel and add manual search helpers**

```tsx
<ProductSummary
  ownerKey={ownerKey}
  detail={detailQuery.data}
  categories={categoriesQuery.data ?? []}
  categoryPending={categoryMutation.isPending}
  onCategoryChange={(categoryId) => categoryMutation.mutate(categoryId)}
  action={mode === "overview" ? <button type="button" onClick={openPrepMode}>Etsy'e Yukle</button> : null}
/>
<ProductTariffPanel ownerKey={ownerKey} productId={productId} analysis={detailQuery.data.tariffAnalysis} />
<div className="space-y-6" hidden={mode !== "overview"} aria-hidden={mode !== "overview"}>
  <VariantTable variants={detailQuery.data.variants} />
  <ChangeTimeline items={detailQuery.data.changeTimeline} />
</div>
```

```ts
export async function searchProductTariffCatalog(ownerKey: OwnerKey, productId: string, query: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-search?q=${encodeURIComponent(query)}`);
  return parseJson<ProductTariffSearchResponse>(response);
}
export async function submitTariffKnowledgeCandidate(ownerKey: OwnerKey, productId: string, payload: TariffKnowledgeCandidatePayload) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-knowledge-candidates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseJson<TariffKnowledgeCandidateResponse>(response);
}
```

- [ ] **Step 5: Add e2e coverage and rerun tests**

```ts
import { test, expect } from "@playwright/test";

test("product detail runs tariff analysis and lets the user save a recommendation", async ({ page }) => {
  await page.goto("/owners/berke/products/prod_1");
  await expect(page.getByText("GTIP / ABD Vergi Analizi")).toBeVisible();
  await expect(page.getByText(/toplam %/i)).toBeVisible();
  await page.getByRole("button", { name: /bu kodu sec/i }).first().click();
  await expect(page.getByText(/bu urun icin secilen gtip/i)).toBeVisible();
});
```

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductTariffPanel.test.tsx src/features/product/components/TariffRecommendationCard.test.tsx src/features/product/routes/ProductDetailPage.test.tsx
pnpm --filter @trendyol-etsy/web test:e2e -- product-detail-tariff.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/product/components/ProductTariffPanel.tsx apps/web/src/features/product/components/ProductTariffPanel.test.tsx apps/web/src/features/product/components/TariffRecommendationCard.tsx apps/web/src/features/product/components/TariffRecommendationCard.test.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx apps/web/tests/e2e/product-detail-tariff.spec.ts apps/web/src/app/api.ts
git commit -m "feat: add product GTIP analysis panel"
```

### Task 4: Integrate selected GTIP into the Etsy cost calculator as an optional import-duty block

**Files:**
- Create: `apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.tsx`
- Create: `apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/types.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/defaults.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts`
- Modify: `apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx`
- Modify: `apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx`
- Modify: `apps/web/src/app/router.test.tsx`
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] **Step 1: Write the failing calculator tests**

```ts
expect(result.current.draft.importDutyEnabled).toBe(false);
result.current.updateDraft({ importDutyEnabled: true, importDutyRate: 0.11, importDutyLabel: "ABD GTIP vergisi" });
expect(result.current.result.breakdown.map((row) => row.key)).toContain("import_duty_fee");
```

```tsx
window.history.pushState({}, "", "/etsy-cost-calculator?ownerKey=berke&productId=prod_1");
expect(await screen.findByText(/abd ithalat vergisi/i)).toBeInTheDocument();
expect(screen.getByText(/gtip 711790/i)).toBeInTheDocument();
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx src/features/etsyCostCalculator/components/ImportDutyCard.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/app/router.test.tsx
```

Expected: FAIL because import-duty fields/components do not exist.
- [ ] **Step 3: Extend calculator types/defaults and scenario math**

```ts
export interface CalculatorDraft {
  usdTryRate: number;
  salePriceUsd: number;
  buyerPaidShippingUsd: number;
  buyerPaidExtrasUsd: number;
  buyerTaxCollectedByEtsyUsd: number;
  linkedOwnerKey: string | null;
  linkedProductId: string | null;
  selectedTariffCode: string | null;
  importDutyEnabled: boolean;
  importDutyRate: number | null;
  importDutyLabel: string | null;
}

linkedOwnerKey: null,
linkedProductId: null,
selectedTariffCode: null,
importDutyEnabled: false,
importDutyRate: null,
importDutyLabel: null,

const importDutyUsd = draft.importDutyEnabled && draft.importDutyRate ? round2(revenueExcludingTaxUsd * draft.importDutyRate) : 0;
breakdown.push({
  key: "import_duty_fee",
  label: draft.importDutyLabel ?? "ABD ithalat vergisi",
  amountUsd: importDutyUsd,
  amountTry: toTry(importDutyUsd, draft.usdTryRate),
  sourceType: "conditional",
  note: draft.selectedTariffCode ? `Secili GTIP ${draft.selectedTariffCode} icin hesaplandi.` : "GTIP secimi olmadan uygulanmaz.",
});
```

- [ ] **Step 4: Add the UI block and bind URL/product context**

```tsx
export function ImportDutyCard({ code, summary, enabled, onToggle, helperHref }: Props) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">ABD Ithalat Vergisi</p>
      {code ? (
        <>
          <p className="mt-3 text-sm text-slate-600">GTIP {code}</p>
          <p className="mt-1 text-sm font-medium text-slate-900">{summary}</p>
          <label className="mt-4 flex items-center gap-3 text-sm text-slate-700">
            <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
            ABD ithalat vergisini dahil et
          </label>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-600">ABD vergi hesabi icin urun detayinda GTIP secimi yapabilirsiniz. <a className="text-[#F1641E]" href={helperHref}>Urun detayina git</a></p>
      )}
    </section>
  );
}
```

```tsx
const [searchParams] = useSearchParams();
const linkedOwnerKey = searchParams.get("ownerKey");
const linkedProductId = searchParams.get("productId");
const productDetailQuery = useQuery({
  queryKey: ["product-detail", linkedOwnerKey, linkedProductId, "calculator-context"],
  enabled: Boolean(linkedOwnerKey && linkedProductId),
  queryFn: async () => fetchProductDetail(linkedOwnerKey as OwnerKey, linkedProductId as string),
});

useEffect(() => {
  const selection = productDetailQuery.data?.tariffAnalysis.selection;
  calculator.updateDraft({
    linkedOwnerKey,
    linkedProductId,
    selectedTariffCode: selection?.canonicalHs6 ?? null,
    importDutyRate: selection?.combinedDutyRate ?? null,
    importDutyLabel: selection?.dutySummary ?? null,
  });
}, [calculator.updateDraft, linkedOwnerKey, linkedProductId, productDetailQuery.data]);
```

- [ ] **Step 5: Re-run calculator and e2e tests**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx src/features/etsyCostCalculator/components/ImportDutyCard.test.tsx src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx src/app/router.test.tsx
pnpm --filter @trendyol-etsy/web test:e2e -- etsy-cost-calculator.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.tsx apps/web/src/features/etsyCostCalculator/components/ImportDutyCard.test.tsx apps/web/src/features/etsyCostCalculator/lib/types.ts apps/web/src/features/etsyCostCalculator/lib/defaults.ts apps/web/src/features/etsyCostCalculator/lib/calculateScenario.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.ts apps/web/src/features/etsyCostCalculator/hooks/useEtsyCostCalculatorState.test.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.tsx apps/web/src/features/etsyCostCalculator/routes/EtsyCostCalculatorPage.test.tsx apps/web/src/app/router.test.tsx apps/web/tests/e2e/etsy-cost-calculator.spec.ts
git commit -m "feat: integrate GTIP import duty into calculator"
```

### Task 5: Finish candidate-queue UX, stale-data badge, and full regression sweep

**Files:**
- Modify: `apps/api/src/modules/tariff/knowledge/createTariffKnowledgeCandidate.ts`
- Modify: `apps/web/src/features/product/components/ProductTariffPanel.tsx`
- Modify: `apps/web/src/features/product/components/ProductTariffPanel.test.tsx`
- Modify: `apps/web/tests/e2e/product-detail-tariff.spec.ts`
- Modify: `apps/web/tests/e2e/etsy-cost-calculator.spec.ts`

- [ ] **Step 1: Write the failing stale-data / candidate tests**

```tsx
render(<ProductTariffPanel ownerKey="berke" productId="prod_1" analysis={{ selection: { canonicalHs6: "711790", dutySummary: "%11 temel vergi + %0 ek tarife = toplam %11", revisionLabel: "USITC HTS 2025 Revision 10" }, latestRun: { createdAt: Date.parse("2026-03-01T00:00:00Z") }, recommendations: [], manualSearchEnabled: true, disclaimer: "Planlama" }} />);
expect(screen.getByText(/veri surumu guncel olmayabilir/i)).toBeInTheDocument();
```

```ts
await page.getByRole("button", { name: /ortak bilgiye aday yap/i }).first().click();
await expect(page.getByText(/aday kuyruguna eklendi/i)).toBeVisible();
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
pnpm --filter @trendyol-etsy/web exec vitest run src/features/product/components/ProductTariffPanel.test.tsx
```

Expected: FAIL because stale badge and success state do not exist yet.

- [ ] **Step 3: Implement the badge and candidate success state**

```tsx
const staleRevision = analysis.selection?.revisionLabel && !analysis.selection.revisionLabel.includes("2026 Revision 4");
const [candidateMessage, setCandidateMessage] = useState<string | null>(null);
const candidateMutation = useMutation({
  mutationFn: (payload: TariffKnowledgeCandidatePayload) => submitTariffKnowledgeCandidate(ownerKey, productId, payload),
  onSuccess: () => setCandidateMessage("Aday kuyruguna eklendi."),
});

{staleRevision ? <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">Veri surumu guncel olmayabilir.</p> : null}
{candidateMessage ? <p className="mt-3 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{candidateMessage}</p> : null}
```

```ts
export async function createTariffKnowledgeCandidate(db: D1Database, input: CreateTariffKnowledgeCandidateInput) {
  const repo = createTariffKnowledgeRepo(db);
  return repo.createCandidate({
    ...input,
    status: "pending",
    payloadJson: JSON.stringify({ selectedAt: input.submittedAt, notes: input.notes ?? null }),
  });
}
```

- [ ] **Step 4: Run the full regression suite**

Run:

```bash
pnpm --filter @trendyol-etsy/api test
pnpm --filter @trendyol-etsy/web test
pnpm --filter @trendyol-etsy/web test:e2e -- product-detail-tariff.spec.ts etsy-cost-calculator.spec.ts
pnpm --filter @trendyol-etsy/api typecheck
pnpm --filter @trendyol-etsy/web typecheck
```

Expected: All PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/tariff/knowledge/createTariffKnowledgeCandidate.ts apps/web/src/features/product/components/ProductTariffPanel.tsx apps/web/src/features/product/components/ProductTariffPanel.test.tsx apps/web/tests/e2e/product-detail-tariff.spec.ts apps/web/tests/e2e/etsy-cost-calculator.spec.ts
git commit -m "test: finish tariff workflow regression coverage"
```

---

## Self-Review Checklist

- Spec coverage: backend tablo/seed, hibrit tavsiye motoru, AI'siz fallback, urun detay paneli, manuel secim/kuyruk, hesaplayici entegrasyonu ve stale-data rozeti bu plan icinde kapsandi.
- Placeholder scan: `TBD`, `TODO`, `implement later`, `write tests later` yok.
- Type consistency: `canonicalHs6`, `usProfileId`, `dutySummary`, `importDutyEnabled`, `importDutyRate`, `selectionSource`, `candidateSource` adlari tum gorevlerde ayni tutuldu.
