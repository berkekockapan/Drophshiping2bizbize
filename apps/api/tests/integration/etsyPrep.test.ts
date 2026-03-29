import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/index";
import * as openAiOAuthModule from "../../src/modules/ai/openAiOAuth";
import { buildEtsyPrepAnalysis } from "../../src/modules/etsyPrep/buildEtsyPrepAnalysis";
import { buildEtsyPrepView } from "../../src/modules/etsyPrep/buildEtsyPrepView";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

function createDeferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((innerResolve) => {
    resolve = innerResolve;
  });

  return { promise, resolve };
}

function readNdjsonLine(value: Uint8Array | undefined) {
  return JSON.parse(new TextDecoder().decode(value).trim());
}

function parseOutputSchema(prompt: string) {
  const schemaLine = prompt
    .split("\n")
    .find((line) => line.startsWith("OUTPUT_SCHEMA: "));

  if (!schemaLine) {
    throw new Error("OUTPUT_SCHEMA line not found");
  }

  return JSON.parse(schemaLine.replace("OUTPUT_SCHEMA: ", ""));
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function expectKeywordAnglesToContainToken(keywordAngles: string[], token: string) {
  const pattern = new RegExp(escapeRegExp(token.normalize("NFC")), "iu");
  expect(keywordAngles.some((angle) => pattern.test(String(angle).normalize("NFC")))).toBe(true);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("etsy prep", () => {
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

    const bootstrap = await app.request(`http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep`, undefined, env);
    expect(bootstrap.status).toBe(200);
    const bootstrapJson = await bootstrap.json();
    expect(bootstrapJson).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({ id: seeded.product.id, title: expect.any(String) }),
        draft: expect.objectContaining({ productId: seeded.product.id }),
      }),
    );
    expect(bootstrapJson).not.toHaveProperty("connectorProfileSnapshot");

    const save = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/save`,
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

  it("returns 400 for invalid prep save payloads", async () => {
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

    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/save`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["not", "a", "valid", "payload"]),
      },
      env,
    );

    expect(response.status).toBe(400);
  });

  it("preserves existing manual edit state when prep save has generated fields only", async () => {
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

    const manualEdit = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/draft`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishTitle: "Manually edited title" }),
      },
      env,
    );
    expect(manualEdit.status).toBe(200);

    const save = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/save`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          englishTitle: "Generated Etsy Title",
          longDescription: "Generated Etsy description",
          tags: ["hoodie"],
          seoNotes: "SEO notes",
          policyNotes: "Policy notes",
          generatedFields: ["title", "description", "tags"],
          editedFields: [],
        }),
      },
      env,
    );

    expect(save.status).toBe(200);
    const savedJson = await save.json();
    expect(savedJson.manualEditsPresent).toBe(true);
  });

  it("streams Etsy prep analysis steps as ndjson", async () => {
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

    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/analyze`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines.map((line) => line.type)).toEqual([
      "step_started",
      "step_completed",
      "research_summary",
      "result_ready",
    ]);
    expect(lines.at(-1)?.result.insights.seoNotes).toContain("keyword");
  });

  it("returns the analysis response immediately and emits the first event before async work completes", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const detail = await buildEtsyPrepView(env.DB, "berke", seeded.product.id);
    expect(detail).not.toBeNull();

    const gate = createDeferred();
    const responsePromise = buildEtsyPrepAnalysis(detail!, { fetchImpl: fetch, waitFor: gate.promise });
    let settled = false;
    responsePromise.then(() => {
      settled = true;
    });

    await Promise.resolve();
    expect(settled).toBe(true);

    const response = await responsePromise;
    const reader = response.body?.getReader();
    expect(reader).toBeDefined();

    const firstChunk = await reader!.read();
    expect(readNdjsonLine(firstChunk.value)).toEqual(
      expect.objectContaining({
        type: "step_started",
        step: "fetch_listing_signals",
      }),
    );

    let secondChunkResolved = false;
    const secondChunkPromise = reader!.read().then((chunk) => {
      secondChunkResolved = true;
      return chunk;
    });

    await Promise.resolve();
    expect(secondChunkResolved).toBe(false);

    gate.resolve();
    expect(readNdjsonLine((await secondChunkPromise).value)).toEqual(
      expect.objectContaining({
        type: "step_completed",
        step: "fetch_listing_signals",
      }),
    );
  });

  it("streams a title prompt package instead of trying to call the local connector from the API", async () => {
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

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      throw new Error(`Unexpected fetch call during Etsy prep packaging: ${String(input)}`);
    };

    try {
      const response = await app.request(
        `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-title`,
        { method: "POST" },
        env,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/x-ndjson");

      const lines = (await response.text())
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      const finalEvent = lines.at(-1);
      expect(finalEvent).toEqual(
        expect.objectContaining({
          type: "prompt_ready",
          field: "title",
          prompt: expect.stringContaining("Return ONLY valid JSON"),
        }),
      );

      const outputSchema = parseOutputSchema(finalEvent.prompt);
      expect(outputSchema).toEqual(
        expect.objectContaining({
          required: ["title", "keywords"],
          properties: expect.objectContaining({
            title: expect.objectContaining({ type: "string", maxLength: 140 }),
          }),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("returns listing and image prompt packs together", async () => {
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
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/prompt-pack`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload).toEqual(
      expect.objectContaining({
        rulebookVersion: "etsy-prompt-pack-v1",
        systemListingPromptPack: expect.objectContaining({
          outputContract: {
            type: "json",
            fields: ["title", "description", "tags"],
          },
        }),
        chatGptResearchPromptPack: expect.objectContaining({
          outputFormat: "sectioned-text",
          researchMode: "required",
          expectedSections: ["title", "description", "tags"],
        }),
        imagePromptPack: expect.objectContaining({
          mainPrompt: expect.stringContaining("reference image"),
          variations: expect.any(Array),
        }),
      }),
    );
    expect(payload.listingPromptPack.prompt).toBe(payload.systemListingPromptPack.prompt);
    expect(payload.systemListingPromptPack.prompt).toContain("Non-Negotiable Rules");
    expect(payload.systemListingPromptPack.prompt).toContain("Sanitized Product Facts");
    expect(payload.systemListingPromptPack.prompt).toContain("exactly 13 unique entries");
    expect(payload.chatGptResearchPromptPack.prompt).toContain("Browse the Etsy Seller Handbook");
    expect(payload.chatGptResearchPromptPack.prompt).toContain("research competing English-language Etsy listings");
    expect(payload.chatGptResearchPromptPack.prompt).toContain("natural English only");
    expect(payload.chatGptResearchPromptPack.prompt).toContain("Never mention any brand name or seller name");
    expect(JSON.stringify(payload)).not.toMatch(/descriptionRaw|Trendyol|yorumlarini inceleyin|indirimli fiyat|https?:\/\/|cdn\./i);
  });

  it("generate-listing-pack reuses the listing prompt and returns parsed JSON", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    vi.spyOn(openAiOAuthModule, "resolveActiveOpenAiCredential").mockResolvedValue({
      profile: {
        id: "profile_main",
        label: "OpenAI Workspace",
        emailMasked: "wo***@company.com",
        provider: "openai-oauth",
        isActive: true,
        status: "connected",
        lastSeenAt: null,
        lastValidatedAt: null,
        lastError: null,
        connectorStatusSnapshot: null,
        updatedAt: Date.now(),
      },
      accessToken: "token_test",
      apiKey: null,
      selectedWorkspaceProjectId: null,
    });

    let requestBody = "";
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      requestBody = String(init?.body ?? "");
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "Oversize Cotton Hoodie",
                  description: "Soft cotton hoodie for everyday wear.",
                  tags:
                    "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
                }),
              },
            },
          ],
          model: "gpt-5-mini",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    const app = createApp();
    const promptPackResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/prompt-pack`,
      { method: "POST" },
      env,
    );
    const promptPack = await promptPackResponse.json();

    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-listing-pack`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    expect(JSON.parse(requestBody)).toEqual(
      expect.objectContaining({
        messages: [
          expect.objectContaining({
            role: "user",
            content: promptPack.systemListingPromptPack.prompt,
          }),
        ],
      }),
    );
    expect((await response.json()).result).toEqual({
      title: "Oversize Cotton Hoodie",
      description: "Soft cotton hoodie for everyday wear.",
      tags:
        "oversize hoodie, streetwear gift, black hoodie, cotton hoodie, everyday wear, casual layer, soft cotton, street style, neutral staple, winter layer, gift idea, wardrobe essential, minimalist look",
    });
  });

  it("returns 422 when generated listing output violates the contract", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    vi.spyOn(openAiOAuthModule, "resolveActiveOpenAiCredential").mockResolvedValue({
      profile: {
        id: "profile_main",
        label: "OpenAI Workspace",
        emailMasked: "wo***@company.com",
        provider: "openai-oauth",
        isActive: true,
        status: "connected",
        lastSeenAt: null,
        lastValidatedAt: null,
        lastError: null,
        connectorStatusSnapshot: null,
        updatedAt: Date.now(),
      },
      accessToken: "token_test",
      apiKey: null,
      selectedWorkspaceProjectId: null,
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  title: "14K Gold Mirror Chain Necklace with Opal, Long Gold Necklace",
                  description:
                    "This 14K gold mirror chain necklace brings together a refined gold finish and opal detail for an elegant everyday look. Origin: TR. Warranty period: 1 year. Care instructions are included.",
                  tags:
                    "14k gold necklace, mirror chain necklace, opal necklace, long gold necklace, gold chain necklace, 14 karat necklace, elegant gold jewelry, minimalist necklace, layered look necklace, women gold necklace, opal gold jewelry, turkish gold necklace, fine gold necklace",
                }),
              },
            },
          ],
          model: "gpt-5-mini",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const app = createApp();
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-listing-pack`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "INVALID_LISTING_OUTPUT",
        }),
      }),
    );
  });

  it("keeps prompt-pack available when automatic generation has no active AI profile", async () => {
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
    const promptResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/prompt-pack`,
      { method: "POST" },
      env,
    );
    expect(promptResponse.status).toBe(200);

    const generateResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-listing-pack`,
      { method: "POST" },
      env,
    );
    expect(generateResponse.status).toBe(409);
    expect(await generateResponse.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "NO_ACTIVE_PROFILE",
        }),
      }),
    );
  });

  it("keeps Turkish keyword angles intact in tag packages", async () => {
    const turkishProductHtml = `
      <html>
        <body>
          <div data-product-page="trendyol">
            <h1 data-testid="product-title">Örgü Şal Çanta</h1>
            <span data-testid="product-brand">El İşi Atölyesi</span>
            <span data-testid="product-category">Kadın Aksesuar</span>
            <div data-testid="product-description">Günlük kullanım için yumuşak dokulu örgü şal çanta.</div>
            <ul data-testid="product-attributes">
              <li data-key="Materyal">Pamuk</li>
            </ul>
            <div data-testid="product-images">
              <img src="https://cdn.example.com/orgu-canta-1.jpg" />
            </div>
            <div data-testid="product-price" data-price="699.90">699.90</div>
          </div>
        </body>
      </html>
    `;

    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/el-isi-atolyesi/orgu-sal-canta-p-999?merchantId=1" },
      {
        fetchImpl: async () => new Response(turkishProductHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-tags`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const finalEvent = lines.at(-1);

    expect(finalEvent).toEqual(expect.objectContaining({ type: "prompt_ready", field: "tags" }));
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "Örgü");
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "Şal");
  });

  it("keeps mixed-locale uppercase keywords intact in title packages", async () => {
    const mixedLocaleProductHtml = `
      <html>
        <body>
          <div data-product-page="trendyol">
            <h1 data-testid="product-title">IKEA INSPIRED Ihlamur ŞIK</h1>
            <span data-testid="product-brand">Nordic Home</span>
            <span data-testid="product-category">Ev Düzeni</span>
            <div data-testid="product-description">IKEA inspired saklama icin Ihlamur tonlu sik organizer.</div>
            <ul data-testid="product-attributes">
              <li data-key="Materyal">Pamuk</li>
            </ul>
            <div data-testid="product-images">
              <img src="https://cdn.example.com/ikea-organizer-1.jpg" />
            </div>
            <div data-testid="product-price" data-price="499.90">499.90</div>
          </div>
        </body>
      </html>
    `;

    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/nordic-home/ikea-orgu-organizer-p-321?merchantId=1" },
      {
        fetchImpl: async () => new Response(mixedLocaleProductHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-title`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const finalEvent = lines.at(-1);

    expect(finalEvent).toEqual(expect.objectContaining({ type: "prompt_ready", field: "title" }));
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "IKEA");
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "INSPIRED");
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "Ihlamur");
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "ŞIK");
  });

  it("keeps Turkish capital İ words intact in title packages", async () => {
    const turkishCapitalIHtml = `
      <html>
        <body>
          <div data-product-page="trendyol">
            <h1 data-testid="product-title">İşlemeli Örgü Şal</h1>
            <span data-testid="product-brand">Anadolu Tasarım</span>
            <span data-testid="product-category">Kadın Aksesuar</span>
            <div data-testid="product-description">El yapımı işlemeli örgü şal.</div>
            <ul data-testid="product-attributes">
              <li data-key="Materyal">Pamuk</li>
            </ul>
            <div data-testid="product-images">
              <img src="https://cdn.example.com/islemeli-sal-1.jpg" />
            </div>
            <div data-testid="product-price" data-price="549.90">549.90</div>
          </div>
        </body>
      </html>
    `;

    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/anadolu-tasarim/islemeli-orgu-sal-p-654?merchantId=1" },
      {
        fetchImpl: async () => new Response(turkishCapitalIHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-title`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const finalEvent = lines.at(-1);

    expect(finalEvent).toEqual(expect.objectContaining({ type: "prompt_ready", field: "title" }));
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "İşlemeli");
    expectKeywordAnglesToContainToken(finalEvent.context.signals.keywordAngles, "Örgü");
  });

  it("streams a description prompt package with a field-specific schema", async () => {
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
    const response = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/etsy-prep/generate-description`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    const finalEvent = lines.at(-1);
    const outputSchema = parseOutputSchema(finalEvent.prompt);

    expect(finalEvent).toEqual(expect.objectContaining({ type: "prompt_ready", field: "description" }));
    expect(outputSchema).toEqual(
      expect.objectContaining({
        required: ["shortDescription", "longDescription"],
        properties: expect.objectContaining({
          longDescription: expect.objectContaining({ type: "string" }),
        }),
      }),
    );
  });
});
