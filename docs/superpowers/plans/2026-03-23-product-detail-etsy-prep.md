# Product Detail Etsy Prep Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Urun detay sayfasinda acilan Etsy hazirlik calisma alanini; canli analiz, alan bazli uretim ve urune bagli kalici Etsy taslagi kaydetme akisiyla birlikte eklemek.

**Architecture:** API tarafi urun + draft bootstrap verisini, Etsy-odakli arastirma adimlarini ve alan bazli prompt paketlerini uretir; web tarafi bu stream olaylarini canli gosterir, sonra final metin uretimini yerel connector uzerinden tamamlar. Mevcut `etsy_drafts` tablosu korunur; yeni migration acilmaz. Urun detay route'u korunur, yeni `EtsyPrepWorkspace` modulu ayni sayfada `Hazirlik` modunu render eder.

**Tech Stack:** TypeScript, Hono, Cloudflare Worker/D1, React, TanStack Query, Tailwind CSS, Vitest, Playwright, Fastify, Playwright-based local connector

---

## Implementation Notes

- Source spec: `docs/superpowers/specs/2026-03-23-product-detail-etsy-prep-design.md`
- **Critical architecture constraint:** Cloudflare Worker tarafindaki API, kullanicinin makinesindeki `http://127.0.0.1:4317` local connector'a ulasamaz. Bu yuzden backend `generate-*` akislarinda arastirma + prompt paketleme yapacak; web tarafi yerel connector'u cagirip nihai alan degerini alacak.
- Bu ozellik mevcut `/products/:productId/seo` sayfasini kirmamali. Legacy draft generation akisi ve testleri yesil kalmali.
- Bu feature icin yeni D1 migration **gerekmez**; kalicilik `etsy_drafts` tablosundaki mevcut kolonlarla cozulur.
- Canli analiz icin `application/x-ndjson` kullan; Hono/Worker tarafinda SSE yerine satir bazli JSON parse etmek web testlerinde daha sade olur.
- `Description` alanini bu iterasyonda `etsy_drafts.long_description` ile esle. `short_description` mevcut SEO editorunun kendi akisinda kalmaya devam etsin.
- `SEO Notlari` -> `seo_notes`, `Etsy Uyum Kontrolleri` + `Eksik Veri / Riskler` -> `policy_notes` olarak saklanacak.
- Save davranisi `applyManualEdits` ve `saveGenerated` metodlarina zorla yedirilmemeli; `draftsRepo` icine hazirlik ekranina ozel bir `savePrepDraft(...)` yardimcisi ekle.
- Because explicit subagent delegation was not requested, do a local plan review instead of the skill's reviewer subagent loop.

## File Structure

### API: Etsy prep domain and persistence
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts` - urun detayi + kayitli draft + persisted AI profil snapshot'ini hazirlik ekraninin bootstrap cevabina map eder.
- Create: `apps/api/src/modules/etsyPrep/fetchEtsyListingSignals.ts` - Etsy seller/help sayfalari ve listing/search sinyallerini cekip normalize eder.
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepAnalysis.ts` - genel analiz icin NDJSON olay akisini uretir.
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepFieldPackage.ts` - `title` / `description` / `tags` icin hedefli arastirma ve prompt paketi cikarir.
- Create: `apps/api/src/modules/etsyPrep/saveEtsyPrepDraft.ts` - hazirlik ekraninin kaydetme semantigini `draftsRepo` ile koordine eder.
- Modify: `apps/api/src/db/repositories/draftsRepo.ts` - `savePrepDraft` ve gerekiyorsa prep bootstrap icin yardimci okuma metodlari ekle.
- Modify: `apps/api/src/routes/products.ts` - `/:productId/etsy-prep`, `analyze`, `generate-title`, `generate-description`, `generate-tags`, `save` route'larini ekle.
- Create: `apps/api/tests/integration/etsyPrep.test.ts` - bootstrap/save/stream davranisini kapsa.

### Connector: field-level local generation
- Modify: `packages/shared/src/contracts/connector.ts` - yeni field-level request/response kontratini enum ile netlestir.
- Modify: `apps/connector/src/providers/base.ts` - field generation icin ayri request/response tipi ekle.
- Create: `apps/connector/src/routes/generateField.ts` - `POST /generate-field` endpoint'i.
- Create: `apps/connector/src/browser/runFieldPrompt.ts` - ChatGPT Web icin field-specific prompt ve JSON parse akisi.
- Modify: `apps/connector/src/providers/mockProvider.ts` - deterministic field-level mock cevaplari dondur.
- Modify: `apps/connector/src/server.ts` - yeni route'u register et.
- Modify: `apps/connector/tests/integration/server.test.ts` - yeni endpointi dogrula.
- Modify: `apps/connector/tests/unit/mockProvider.test.ts` - field-level davranisi assert et.

### Web: API clients, state, and workspace UI
- Modify: `apps/web/src/app/api.ts` - Etsy prep tipleri, NDJSON stream helper'lari ve local connector `generate-field` yardimcisini ekle.
- Create: `apps/web/src/features/etsyPrep/lib/readNdjsonStream.ts` - stream'i olay listesine/parcali callback'e ceviren ortak helper.
- Create: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts` - bootstrap, analiz, alan uretimi, kaydetme ve dirty-state orkestrasyonu.
- Create: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx` - ust bar, durum etiketi, kaydet butonu.
- Create: `apps/web/src/features/etsyPrep/components/LiveAnalysisPanel.tsx` - canli adimlar, hatalar, retry.
- Create: `apps/web/src/features/etsyPrep/components/GenerationFieldRow.tsx` - `Title` / `Description` / `Tags` icin ortak satir.
- Create: `apps/web/src/features/etsyPrep/components/InsightBlocks.tsx` - `SEO Notlari`, `Etsy Uyum Kontrolleri`, `Eksik Veri / Riskler`.
- Create: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx` - tum hazirlik alanini birlestirir.
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx` - ustte aksiyon slot'u alabilecek sekilde genislet.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx` - `Genel Bakis` / `Hazirlik` mod gecisini yonet.
- Create: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx` - stream + connector + save davranisini test et.
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx` - mod degisimi ve entegrasyon coverage'i ekle.

### End-to-end and regression coverage
- Create: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts` - kullanici urun detayindan hazirliga gecip title/description/tags uretir ve kaydeder.
- Modify: `apps/web/tests/e2e/draft-generation.spec.ts` - yeni connector route'u varken legacy SEO editorun kirilmadigini dogrula.
- Modify: `apps/api/tests/integration/draftFlows.test.ts` - `savePrepDraft` metadata semantikleri legacy draft davranisini bozmuyor mu kontrol et.

## Task 1: Add API bootstrap and save endpoints for Etsy prep

**Files:**
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts`
- Create: `apps/api/src/modules/etsyPrep/saveEtsyPrepDraft.ts`
- Modify: `apps/api/src/db/repositories/draftsRepo.ts`
- Modify: `apps/api/src/routes/products.ts`
- Create: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Write the failing integration test for prep bootstrap and save**

```ts
it("returns Etsy prep bootstrap data and persists saved workspace fields", async () => {
  const { env } = createTestEnv();
  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
      now: new Date("2026-03-23T09:00:00.000Z"),
    },
  );

  const app = createApp();

  const bootstrap = await app.request(`http://localhost/products/${seeded.product.id}/etsy-prep`, undefined, env);
  expect(bootstrap.status).toBe(200);
  expect(await bootstrap.json()).toEqual(
    expect.objectContaining({
      product: expect.objectContaining({ id: seeded.product.id, title: expect.any(String) }),
      draft: expect.objectContaining({ productId: seeded.product.id }),
    }),
  );

  const save = await app.request(
    `http://localhost/products/${seeded.product.id}/etsy-prep/save`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        englishTitle: "Handmade Oversize Hoodie for Etsy",
        longDescription: "Detailed Etsy description",
        tags: ["oversize hoodie", "streetwear gift"],
        seoNotes: "Lead with hoodie + material intent.",
        policyNotes: "Missing care instructions.",
        generatedFields: ["title", "description", "tags"],
        editedFields: ["title"],
      }),
    },
    env,
  );

  expect(save.status).toBe(200);
  const savedJson = await save.json();
  expect(savedJson.englishTitle).toBe("Handmade Oversize Hoodie for Etsy");
  expect(savedJson.longDescription).toBe("Detailed Etsy description");
  expect(savedJson.tags).toEqual(["oversize hoodie", "streetwear gift"]);
  expect(savedJson.manualEditsPresent).toBe(true);
});
```

- [ ] **Step 2: Run the focused API test to confirm the routes do not exist yet**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts`
Expected: FAIL with `404` responses for `/products/:productId/etsy-prep` and `/products/:productId/etsy-prep/save`.

- [ ] **Step 3: Add `savePrepDraft` to `draftsRepo` and wire bootstrap/save modules**

```ts
async savePrepDraft(
  productId: string,
  input: {
    englishTitle: string | null;
    longDescription: string | null;
    tags: string[];
    seoNotes: string | null;
    policyNotes: string | null;
    generatedFields: Array<"title" | "description" | "tags">;
    editedFields: Array<"title" | "description" | "tags">;
    savedAt: number;
  },
) {
  const existing = await ensureForProduct(productId);
  const generatedChanged = input.generatedFields.length > 0;
  const manualEdited = input.editedFields.length > 0;

  await db.prepare(
    `update etsy_drafts
     set english_title = ?, long_description = ?, tags_json = ?, seo_notes = ?, policy_notes = ?,
         generated_version = ?, edited_version = ?, last_generated_at = ?, manual_edits_present = ?
     where product_id = ?`,
  ).bind(
    input.englishTitle,
    input.longDescription,
    JSON.stringify(input.tags),
    input.seoNotes,
    input.policyNotes,
    generatedChanged ? existing.generatedVersion + 1 : existing.generatedVersion,
    manualEdited ? existing.editedVersion + 1 : existing.editedVersion,
    generatedChanged ? input.savedAt : existing.lastGeneratedAt,
    manualEdited ? 1 : 0,
    productId,
  ).run();

  return ensureForProduct(productId);
}
```

- [ ] **Step 4: Expose the new product routes**

```ts
app.get("/:productId/etsy-prep", async (c) => {
  const view = await buildEtsyPrepView(c.env.DB, c.req.param("productId"));
  if (!view) {
    return c.json({ error: "Product not found" }, 404);
  }

  return c.json(view);
});

app.put("/:productId/etsy-prep/save", async (c) => {
  const body = await c.req.json();
  const saved = await saveEtsyPrepDraft(c.env.DB, c.req.param("productId"), body, Date.now());
  return c.json(saved);
});
```

- [ ] **Step 5: Re-run the focused API test**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts`
Expected: PASS with bootstrap returning product + draft data and save updating `etsy_drafts`.

- [ ] **Step 6: Commit the bootstrap/save groundwork**

```bash
git add apps/api/src/modules/etsyPrep/buildEtsyPrepView.ts apps/api/src/modules/etsyPrep/saveEtsyPrepDraft.ts apps/api/src/db/repositories/draftsRepo.ts apps/api/src/routes/products.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: add Etsy prep bootstrap and save endpoints"
```

## Task 2: Stream general analysis and field prompt packages from the API

**Files:**
- Create: `apps/api/src/modules/etsyPrep/fetchEtsyListingSignals.ts`
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepAnalysis.ts`
- Create: `apps/api/src/modules/etsyPrep/buildEtsyPrepFieldPackage.ts`
- Modify: `apps/api/src/routes/products.ts`
- Modify: `apps/api/tests/integration/etsyPrep.test.ts`

- [ ] **Step 1: Add failing tests for NDJSON analysis and field-package streams**

```ts
it("streams Etsy prep analysis steps as ndjson", async () => {
  const response = await app.request(
    `http://localhost/products/${seeded.product.id}/etsy-prep/analyze`,
    { method: "POST" },
    env,
  );

  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("application/x-ndjson");

  const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  expect(lines.map((line) => line.type)).toEqual([
    "step_started",
    "step_completed",
    "research_summary",
    "result_ready",
  ]);
  expect(lines.at(-1)?.result.insights.seoNotes).toContain("keyword");
});
```

```ts
it("streams a title prompt package instead of trying to call the local connector from the API", async () => {
  const response = await app.request(
    `http://localhost/products/${seeded.product.id}/etsy-prep/generate-title`,
    { method: "POST" },
    env,
  );

  const lines = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  expect(lines.at(-1)).toEqual(
    expect.objectContaining({
      type: "prompt_ready",
      field: "title",
      prompt: expect.stringContaining("Return ONLY valid JSON"),
    }),
  );
});
```

- [ ] **Step 2: Run the focused test to verify the analysis endpoints do not exist yet**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts`
Expected: FAIL because `/analyze` and `/generate-title` are missing and no NDJSON stream is produced.

- [ ] **Step 3: Implement a minimal NDJSON stream helper and deterministic Etsy research modules**

```ts
function jsonLine(value: unknown) {
  return `${JSON.stringify(value)}\n`;
}

export function streamEvents(events: Array<Record<string, unknown>>) {
  return new Response(
    new ReadableStream({
      start(controller) {
        for (const event of events) {
          controller.enqueue(new TextEncoder().encode(jsonLine(event)));
        }
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
```

```ts
export async function buildEtsyPrepFieldPackage(input: EtsyPrepFieldPackageInput) {
  const signals = await fetchEtsyListingSignals(input.fetchImpl, input.field, input.product);

  return {
    field: input.field,
    prompt: [
      "Return ONLY valid JSON.",
      `Field: ${input.field}`,
      `Source title: ${input.product.title ?? ""}`,
      `Signals: ${JSON.stringify(signals.keywordAngles)}`,
    ].join("\n"),
    context: {
      productId: input.product.id,
      signals,
      constraints: input.constraints,
    },
  };
}
```

- [ ] **Step 4: Wire `/analyze` and `/generate-*` routes to stream events**

```ts
app.post("/:productId/etsy-prep/analyze", async (c) => {
  const detail = await buildEtsyPrepView(c.env.DB, c.req.param("productId"));
  if (!detail) {
    return c.json({ error: "Product not found" }, 404);
  }

  return buildEtsyPrepAnalysis(detail, { fetchImpl: fetch });
});

app.post("/:productId/etsy-prep/generate-title", async (c) => {
  const detail = await buildEtsyPrepView(c.env.DB, c.req.param("productId"));
  if (!detail) {
    return c.json({ error: "Product not found" }, 404);
  }

  return buildEtsyPrepFieldPackageStream("title", detail, { fetchImpl: fetch });
});
```

- [ ] **Step 5: Re-run the API test and confirm the stream contract**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts`
Expected: PASS with `application/x-ndjson` responses and `prompt_ready` as the last event for field routes.

- [ ] **Step 6: Commit the streaming analysis layer**

```bash
git add apps/api/src/modules/etsyPrep/fetchEtsyListingSignals.ts apps/api/src/modules/etsyPrep/buildEtsyPrepAnalysis.ts apps/api/src/modules/etsyPrep/buildEtsyPrepFieldPackage.ts apps/api/src/routes/products.ts apps/api/tests/integration/etsyPrep.test.ts
git commit -m "feat: stream Etsy prep analysis packages"
```

## Task 3: Add field-level generation to the local connector without breaking the legacy draft route

**Files:**
- Modify: `packages/shared/src/contracts/connector.ts`
- Modify: `apps/connector/src/providers/base.ts`
- Create: `apps/connector/src/routes/generateField.ts`
- Create: `apps/connector/src/browser/runFieldPrompt.ts`
- Modify: `apps/connector/src/providers/mockProvider.ts`
- Modify: `apps/connector/src/server.ts`
- Modify: `apps/connector/tests/integration/server.test.ts`
- Modify: `apps/connector/tests/unit/mockProvider.test.ts`

- [ ] **Step 1: Add failing tests for `POST /generate-field`**

```ts
const generatedField = await context.server.inject({
  method: "POST",
  url: "/generate-field",
  payload: {
    field: "title",
    prompt: "Return ONLY valid JSON with a title field value.",
    context: { productId: "prod_1" },
  },
});

expect(generatedField.statusCode).toBe(200);
expect(generatedField.json()).toEqual(
  expect.objectContaining({
    field: "title",
    value: expect.stringContaining("title"),
    provider: "mock",
  }),
);
```

```ts
await expect(
  provider.generateField({
    field: "tags",
    prompt: "Return ONLY valid JSON with tags.",
    context: { productId: "prod_1" },
  }),
).resolves.toEqual(
  expect.objectContaining({ field: "tags", value: expect.any(String) }),
);
```

- [ ] **Step 2: Run connector tests to confirm the new endpoint and provider method are missing**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/integration/server.test.ts tests/unit/mockProvider.test.ts`
Expected: FAIL because `generateField` is undefined and `/generate-field` is not registered.

- [ ] **Step 3: Add the shared field contract and provider method**

```ts
export const connectorGenerationFieldSchema = z.enum(["title", "description", "tags"]);
export type ConnectorGenerationField = z.infer<typeof connectorGenerationFieldSchema>;

export interface GenerateFieldRequest {
  field: ConnectorGenerationField;
  prompt: string;
  context: Record<string, unknown>;
}

export interface GenerateFieldResponse {
  field: ConnectorGenerationField;
  value: string;
  provider: ProviderId;
}
```

- [ ] **Step 4: Implement `runFieldPrompt` and the `/generate-field` route**

```ts
export function registerGenerateFieldRoute(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.post<{ Body: GenerateFieldRequest }>("/generate-field", async (request, reply) => {
    const body = request.body;
    if (!body?.field || !body?.prompt) {
      return reply.code(400).send({ error: "field and prompt are required" });
    }

    return deps.provider.generateField(body);
  });
}
```

```ts
function buildPrompt(request: GenerateFieldRequest) {
  return [
    `You are generating Etsy field output for ${request.field}.`,
    "Return ONLY valid JSON.",
    '{ "field": "<same-field>", "value": "<final text>" }',
    request.prompt,
    `Context: ${JSON.stringify(request.context)}`,
  ].join("\n");
}
```

- [ ] **Step 5: Re-run connector tests and confirm the legacy `/generate` route still passes**

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/integration/server.test.ts tests/unit/mockProvider.test.ts`
Expected: PASS with both `/generate` and `/generate-field` green.

- [ ] **Step 6: Commit the connector contract extension**

```bash
git add packages/shared/src/contracts/connector.ts apps/connector/src/providers/base.ts apps/connector/src/routes/generateField.ts apps/connector/src/browser/runFieldPrompt.ts apps/connector/src/providers/mockProvider.ts apps/connector/src/server.ts apps/connector/tests/integration/server.test.ts apps/connector/tests/unit/mockProvider.test.ts
git commit -m "feat: add field-level connector generation"
```

## Task 4: Build web API clients and workspace orchestration for streams, connector calls, and dirty state

**Files:**
- Modify: `apps/web/src/app/api.ts`
- Create: `apps/web/src/features/etsyPrep/lib/readNdjsonStream.ts`
- Create: `apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts`
- Create: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`

- [ ] **Step 1: Write a failing workspace test that exercises analysis, field generation, and save**

```tsx
it("streams analysis steps, writes generated title directly into the field, and saves the workspace", async () => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init?.method === "GET")) {
      return jsonResponse({
        product: productDetailPayload.product,
        draft: {
          id: "draft_1",
          productId: "prod_1",
          englishTitle: "",
          longDescription: "",
          tags: [],
          seoNotes: null,
          policyNotes: null,
          generatedVersion: 0,
          editedVersion: 0,
          lastGeneratedAt: null,
          manualEditsPresent: false,
        },
        connectorProfileSnapshot: null,
      });
    }

    if (url.includes("/etsy-prep/analyze")) {
      return ndjsonResponse([
        { type: "step_started", step: "signals" },
        { type: "result_ready", result: { insights: { seoNotes: "Lead with hoodie keyword." } } },
      ]);
    }

    if (url.includes("/etsy-prep/generate-title")) {
      return ndjsonResponse([
        { type: "prompt_ready", field: "title", prompt: "Return ONLY valid JSON", context: { productId: "prod_1" } },
      ]);
    }

    if (url.includes("127.0.0.1:4317/generate-field")) {
      return jsonResponse({ field: "title", value: "Handmade Oversize Hoodie", provider: "mock" });
    }

    if (url.includes("/etsy-prep/save")) {
      return jsonResponse({ ...savedDraftPayload, englishTitle: "Handmade Oversize Hoodie" });
    }

    throw new Error(`Unhandled request: ${url}`);
  });

  render(<EtsyPrepWorkspace productId="prod_1" />);

  expect(await screen.findByText(/signals/i)).toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: /title üret/i }));
  expect(await screen.findByLabelText(/title/i)).toHaveValue("Handmade Oversize Hoodie");
  await user.click(screen.getByRole("button", { name: /kaydet/i }));
  expect(await screen.findByText(/kaydedildi/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused web test to confirm the workspace files do not exist yet**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
Expected: FAIL because `EtsyPrepWorkspace` and its API helpers are missing.

- [ ] **Step 3: Add typed clients for prep bootstrap, stream parsing, field generation, and save**

```ts
export interface EtsyPrepBootstrapResponse {
  product: ProductDetailResponse["product"];
  draft: EtsyDraft;
  connectorProfileSnapshot: { id: string; label: string } | null;
}

export async function fetchEtsyPrepBootstrap(productId: string) {
  const response = await fetchWithTimeout(`/products/${productId}/etsy-prep`);
  return parseJson<EtsyPrepBootstrapResponse>(response);
}

export async function generateConnectorField(payload: {
  field: "title" | "description" | "tags";
  prompt: string;
  context: Record<string, unknown>;
}) {
  const response = await fetchWithTimeout(`${connectorBaseUrl}/generate-field`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  return parseJson<{ field: string; value: string; provider: string }>(response);
}
```

- [ ] **Step 4: Implement the workspace hook with optimistic UI state and unsaved-change tracking**

```ts
const [draftState, setDraftState] = useState({ title: "", description: "", tagsText: "" });
const [dirty, setDirty] = useState(false);

async function runFieldGeneration(field: "title" | "description" | "tags") {
  const stream = await streamEtsyPrepField(productId, field);
  const promptReady = await readNdjsonStream(stream, handleEvent);
  const generated = await generateConnectorField({
    field,
    prompt: promptReady.prompt,
    context: promptReady.context,
  });

  setDraftState((current) => applyGeneratedField(current, field, generated.value));
  setDirty(true);
}
```

- [ ] **Step 5: Re-run the focused workspace test**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx`
Expected: PASS with streamed analysis events rendered, connector generation filling the field, and save clearing the dirty state.

- [ ] **Step 6: Commit the workspace orchestration layer**

```bash
git add apps/web/src/app/api.ts apps/web/src/features/etsyPrep/lib/readNdjsonStream.ts apps/web/src/features/etsyPrep/hooks/useEtsyPrepWorkspace.ts apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx
git commit -m "feat: add Etsy prep workspace state orchestration"
```

## Task 5: Build the Etsy prep UI and integrate it into the product detail page

**Files:**
- Create: `apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx`
- Create: `apps/web/src/features/etsyPrep/components/LiveAnalysisPanel.tsx`
- Create: `apps/web/src/features/etsyPrep/components/GenerationFieldRow.tsx`
- Create: `apps/web/src/features/etsyPrep/components/InsightBlocks.tsx`
- Create: `apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx`
- Modify: `apps/web/src/features/product/components/ProductSummary.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.tsx`
- Modify: `apps/web/src/features/product/routes/ProductDetailPage.test.tsx`

- [ ] **Step 1: Extend the product detail test with the new mode switch expectations**

```tsx
it("switches from genel bakis to hazirlik mode inside the same product page", async () => {
  renderWithProviders(<ProductDetailPage />, {
    route: "/products/prod_1",
    path: "/products/:productId",
  });

  expect(await screen.findByRole("button", { name: /etsy'e yükle/i })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /etsy'e yükle/i }));

  expect(await screen.findByText(/hazırlık/i)).toBeInTheDocument();
  expect(screen.queryByText(/varyasyon matrisi/i)).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /genel bakışa dön/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused product detail test to confirm the button and mode do not exist yet**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/product/routes/ProductDetailPage.test.tsx`
Expected: FAIL because `Etsy'e Yükle` and `Hazırlık` mode are not rendered.

- [ ] **Step 3: Add an action slot to `ProductSummary` and render the workspace in `ProductDetailPage`**

```tsx
export function ProductSummary({ detail, actions }: ProductSummaryProps & { actions?: ReactNode }) {
  // ...
  <div className="flex items-center gap-2">
    {actions}
    <TrendyolExternalLink ... />
    <StatusBadge status={detail.product.status} />
    <StatusBadge status={detail.product.parseStatus} />
  </div>
}
```

```tsx
const [mode, setMode] = useState<"overview" | "prep">("overview");

{detailQuery.data ? (
  <>
    <ProductSummary
      detail={detailQuery.data}
      actions={
        <button type="button" onClick={() => setMode("prep")} className="rounded-xl bg-[#F1641E] px-4 py-2 text-sm font-semibold text-white">
          Etsy'e Yükle
        </button>
      }
    />
    {mode === "overview" ? (
      <>
        <VariantTable variants={detailQuery.data.variants} />
        <ChangeTimeline items={detailQuery.data.changeTimeline} />
      </>
    ) : (
      <EtsyPrepWorkspace productId={productId} onBack={() => setMode("overview")} />
    )}
  </>
) : null}
```

- [ ] **Step 4: Compose the presentational workspace components around the hook**

```tsx
<section className="space-y-6 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
  <PrepModeHeader statusLabel={saveStateLabel} dirty={dirty} onBack={onBack} onSave={saveWorkspace} />
  <LiveAnalysisPanel steps={analysisSteps} error={analysisError} onRetry={rerunAnalysis} />
  <GenerationFieldRow field="title" label="Title" value={draftState.title} onGenerate={generateTitle} onChange={setTitle} />
  <GenerationFieldRow field="description" label="Description" multiline value={draftState.description} onGenerate={generateDescription} onChange={setDescription} />
  <GenerationFieldRow field="tags" label="Tags" value={draftState.tagsText} onGenerate={generateTags} onChange={setTagsText} helperText="Her satir comma-separated tag listesi olarak tutulur." />
  <InsightBlocks seoNotes={insights.seoNotes} policyNotes={insights.policyNotes} riskNotes={insights.riskNotes} />
</section>
```

- [ ] **Step 5: Re-run product and workspace tests together**

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS with the same-page mode switch and prep UI rendering correctly.

- [ ] **Step 6: Commit the UI integration**

```bash
git add apps/web/src/features/etsyPrep/components/PrepModeHeader.tsx apps/web/src/features/etsyPrep/components/LiveAnalysisPanel.tsx apps/web/src/features/etsyPrep/components/GenerationFieldRow.tsx apps/web/src/features/etsyPrep/components/InsightBlocks.tsx apps/web/src/features/etsyPrep/components/EtsyPrepWorkspace.tsx apps/web/src/features/product/components/ProductSummary.tsx apps/web/src/features/product/routes/ProductDetailPage.tsx apps/web/src/features/product/routes/ProductDetailPage.test.tsx
git commit -m "feat: add Etsy prep workspace to product detail"
```

## Task 6: Cover end-to-end behavior and legacy regressions

**Files:**
- Create: `apps/web/tests/e2e/product-detail-etsy-prep.spec.ts`
- Modify: `apps/web/tests/e2e/draft-generation.spec.ts`
- Modify: `apps/api/tests/integration/draftFlows.test.ts`

- [ ] **Step 1: Add a failing Playwright spec for the new prep flow**

```ts
test("user opens Etsy prep from product detail, generates fields, and saves them", async ({ page }) => {
  await page.route("**/products/prod_1/etsy-prep", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({ status: 200, body: JSON.stringify(bootstrapPayload) });
      return;
    }

    await route.continue();
  });

  await page.route("**/products/prod_1/etsy-prep/analyze", async (route) => {
    await route.fulfill(ndjsonFulfill([...analysisEvents]));
  });

  await page.route("**/products/prod_1/etsy-prep/generate-title", async (route) => {
    await route.fulfill(ndjsonFulfill([{ type: "prompt_ready", field: "title", prompt: "Return ONLY valid JSON", context: {} }]));
  });

  await page.route("http://127.0.0.1:4317/generate-field", async (route) => {
    await route.fulfill({ status: 200, body: JSON.stringify({ field: "title", value: "Handmade Oversize Hoodie", provider: "mock" }) });
  });

  await page.goto("/products/prod_1");
  await page.getByRole("button", { name: "Etsy'e Yükle" }).click();
  await page.getByRole("button", { name: /title üret/i }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Handmade Oversize Hoodie");
  await page.getByRole("button", { name: /kaydet/i }).click();
  await expect(page.getByText(/kaydedildi/i)).toBeVisible();
});
```

- [ ] **Step 2: Extend regression coverage for legacy draft generation and draft metadata**

```ts
expect(generated.statusCode).toBe(200);
expect(generated.json().englishTitle).toContain("Oversize Hoodie");
```

```ts
expect(overwriteJson.generatedVersion).toBeGreaterThan(0);
expect(overwriteJson.manualEditsPresent).toBe(false);
```

- [ ] **Step 3: Run targeted API, connector, web, and E2E regression commands**

Run: `pnpm --filter @trendyol-etsy/api test -- tests/integration/etsyPrep.test.ts tests/integration/draftFlows.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/connector test -- tests/integration/server.test.ts tests/unit/mockProvider.test.ts`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test -- src/features/etsyPrep/components/EtsyPrepWorkspace.test.tsx src/features/product/routes/ProductDetailPage.test.tsx`
Expected: PASS

Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/product-detail-etsy-prep.spec.ts tests/e2e/draft-generation.spec.ts`
Expected: PASS

- [ ] **Step 4: Fix any flaky assumptions discovered by the focused runs**

```ts
await expect.poll(async () => page.getByText(/signals/i).isVisible()).toBe(true);
```

Use this only if the E2E stream rendering needs polling-friendly assertions; do not add arbitrary sleeps.

- [ ] **Step 5: Re-run the same focused regression commands until all pass**

Run the same four commands from Step 3.
Expected: PASS across API, connector, web unit, and Playwright coverage.

- [ ] **Step 6: Commit the regression coverage**

```bash
git add apps/web/tests/e2e/product-detail-etsy-prep.spec.ts apps/web/tests/e2e/draft-generation.spec.ts apps/api/tests/integration/draftFlows.test.ts
git commit -m "test: cover Etsy prep workspace flow"
```

## Final Verification

- [ ] Run: `pnpm --filter @trendyol-etsy/api typecheck`
- [ ] Run: `pnpm --filter @trendyol-etsy/connector test`
- [ ] Run: `pnpm --filter @trendyol-etsy/web typecheck`
- [ ] Run: `pnpm --filter @trendyol-etsy/web test`
- [ ] Run: `pnpm --filter @trendyol-etsy/web test:e2e -- tests/e2e/product-detail-etsy-prep.spec.ts tests/e2e/draft-generation.spec.ts`
- [ ] Confirm `/products/:productId/seo` still works and `/products/:productId` now supports `Hazirlik` mode.
- [ ] Confirm no migration files were added and `etsy_drafts` remains the only persistence layer for this feature.
