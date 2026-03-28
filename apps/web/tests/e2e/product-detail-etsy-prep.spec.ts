import { expect, test } from "@playwright/test";

function ndjsonBody(events: unknown[]) {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

test("user opens Etsy prep from product detail, generates the prompt pack, and saves the workspace", async ({ page }) => {
  const savePayloads: Array<{
    englishTitle: string | null;
    longDescription: string | null;
    tags: string[];
    seoNotes: string | null;
    policyNotes: string | null;
    generatedFields: string[];
    editedFields: string[];
  }> = [];

  await page.route("**/products/prod_1", async (route) => {
    const request = route.request();
    if (request.resourceType() === "document") {
      const rootResponse = await route.fetch({ url: "/" });
      await route.fulfill({ response: rootResponse });
      return;
    }

    if (request.method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: "prod_1",
          trendyolUrl: "https://www.trendyol.com/example",
          sourceProductId: "123",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          descriptionRaw: "Yumusak dokulu oversize hoodie.",
          attributes: [{ key: "Renk", value: "Siyah" }],
          images: ["https://cdn.example.com/hoodie-1.jpg"],
          status: "ACTIVE",
          parseStatus: "OK",
          lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        },
        currentState: {
          currentPrice: 44990,
          minPrice: 34990,
          maxPrice: 44990,
          inStockVariantCount: 2,
          totalVariantCount: 3,
          lastChangeAt: Date.parse("2026-03-20T09:30:00.000Z"),
          lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        },
        variants: [],
        priceHistory: [],
        stockHistory: [],
        changeTimeline: [],
        notifications: [],
      }),
    });
  });

  await page.route("**/owners/berke/products/refresh-runs/active", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ run: null }),
    });
  });

  await page.route("**/owners/berke/categories", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [] }),
    });
  });

  await page.route("**/owners/berke/products/prod_1/tariff-analysis/run", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        runId: "run_1",
        usedAi: false,
        recommendations: [],
      }),
    });
  });

  await page.route("**/owners/berke/products", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: {
          trackedCount: 1,
          activeCount: 1,
          reviewNeededCount: 0,
        },
        items: [
          {
            id: "prod_1",
            trendyolUrl: "https://www.trendyol.com/example",
            title: "Oversize Hoodie",
            brand: "North Apparel",
            status: "ACTIVE",
            parseStatus: "OK",
            thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
            currentPrice: 44990,
            minPrice: 34990,
            maxPrice: 44990,
            inStockVariantCount: 2,
            totalVariantCount: 3,
            isFavorite: false,
            lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
          },
        ],
        filters: {},
      }),
    });
  });

  await page.route("**/products/prod_1/etsy-prep", async (route) => {
    if (route.request().method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: "prod_1",
          trendyolUrl: "https://www.trendyol.com/example",
          sourceProductId: "123",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          descriptionRaw: "Yumusak dokulu oversize hoodie.",
          attributes: [{ key: "Renk", value: "Siyah" }],
          images: ["https://cdn.example.com/hoodie-1.jpg"],
          status: "ACTIVE",
          parseStatus: "OK",
          lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        },
        draft: {
          id: "draft_1",
          productId: "prod_1",
          englishTitle: null,
          shortDescription: null,
          longDescription: null,
          tags: [],
          materials: [],
          attributes: [],
          seoNotes: null,
          policyNotes: null,
          generatedVersion: 0,
          editedVersion: 0,
          lastGeneratedAt: null,
          manualEditsPresent: false,
        },
      }),
    });
  });

  await page.route("**/products/prod_1/etsy-prep/prompt-pack", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rulebookVersion: "etsy-prompt-pack-v1",
        generatedAt: Date.parse("2026-03-29T09:00:00.000Z"),
        productSnapshot: {
          productId: "prod_1",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          attributeCount: 2,
          variantCount: 1,
          imageCount: 1,
        },
        listingPromptPack: {
          prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
          outputContract: { type: "json", fields: ["title", "description", "tags"] },
        },
        imagePromptPack: {
          mainPrompt: "Use the reference image as truth.",
          variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
          guardrailSummary: ["Urun formunu degistirme"],
        },
      }),
    });
  });

  await page.route("**/ai-profiles/health", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "online",
        provider: "openai-oauth",
        activeProfile: {
          id: "profile_main",
          label: "OpenAI Workspace",
          emailMasked: "wo***@company.com",
          provider: "openai-oauth",
          status: "connected",
          lastValidatedAt: Date.now(),
          lastError: null,
        },
        connectionAttempt: null,
      }),
    });
  });

  await page.route("**/products/prod_1/etsy-prep/analyze", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
      body: ndjsonBody([
        { type: "step_started", step: "fetch_listing_signals", field: "general" },
        {
          type: "step_completed",
          step: "fetch_listing_signals",
          field: "general",
          signals: { keywordAngles: ["hoodie", "oversize"] },
        },
        {
          type: "research_summary",
          summary: {
            title: "Oversize Hoodie",
            keywordAngles: ["hoodie", "oversize"],
            audienceThemes: ["streetwear", "gift buyer"],
            policyNotes: ["care instructions"],
          },
        },
        {
          type: "result_ready",
          result: {
            productId: "prod_1",
            insights: {
              seoNotes: "Lead with hoodie keyword.",
              policyNotes: "Care instructions should be explicit.",
              merchandisingNotes: "Missing lifestyle context.",
            },
          },
        },
      ]),
    });
  });

  await page.route("**/settings", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "default",
        refreshIntervalHours: 5,
        promptPreferences: null,
        connectorHealthcheckEnabled: true,
        aiTargetBaseUrl: null,
        aiTargetManagementKey: null,
        aiTargetLabel: null,
        aiTargetApiKey: null,
      }),
    });
  });

  await page.route("**/products/prod_1/etsy-prep/generate-listing-pack", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai-oauth",
        rulebookVersion: "etsy-prompt-pack-v1",
        result: {
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "oversize hoodie, streetwear gift",
        },
      }),
    });
  });

  await page.route("**/products/prod_1/etsy-prep/save", async (route) => {
    const payload = route.request().postDataJSON() as {
      englishTitle: string | null;
      longDescription: string | null;
      tags: string[];
      seoNotes: string | null;
      policyNotes: string | null;
      generatedFields: string[];
      editedFields: string[];
    };

    savePayloads.push(payload);

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "draft_1",
        productId: "prod_1",
        englishTitle: payload.englishTitle,
        shortDescription: null,
        longDescription: payload.longDescription,
        tags: payload.tags,
        materials: [],
        attributes: [],
        seoNotes: payload.seoNotes,
        policyNotes: payload.policyNotes,
        generatedVersion: 1,
        editedVersion: payload.editedFields.length > 0 ? 1 : 0,
        lastGeneratedAt: Date.parse("2026-03-24T09:00:00.000Z"),
        manualEditsPresent: payload.editedFields.length > 0,
      }),
    });
  });

  await page.route("**/products/prod_1*", async (route) => {
    const request = route.request();
    if (request.resourceType() === "document") {
      await route.continue();
      return;
    }

    if (request.method() !== "GET") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: {
          id: "prod_1",
          trendyolUrl: "https://www.trendyol.com/example",
          sourceProductId: "123",
          title: "Oversize Hoodie",
          brand: "North Apparel",
          category: "Sweatshirt",
          descriptionRaw: "Yumusak dokulu oversize hoodie.",
          attributes: [{ key: "Renk", value: "Siyah" }],
          images: ["https://cdn.example.com/hoodie-1.jpg"],
          status: "ACTIVE",
          parseStatus: "OK",
          lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        },
        currentState: {
          currentPrice: 44990,
          minPrice: 34990,
          maxPrice: 44990,
          inStockVariantCount: 2,
          totalVariantCount: 3,
          lastChangeAt: Date.parse("2026-03-20T09:30:00.000Z"),
          lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
        },
        variants: [],
        priceHistory: [],
        stockHistory: [],
        changeTimeline: [],
        notifications: [],
      }),
    });
  });

  await page.goto("/");
  await page.getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i }).click();
  await expect(page).toHaveURL(/\/products\/prod_1$/);
  await expect(page.getByText(/Ürün Özeti/i)).toBeVisible();

  await page.getByRole("button", { name: "Etsy'e Yükle" }).click();

  await expect(page.getByRole("heading", { name: /listing prompt pack/i })).toBeVisible();
  await expect(page.getByText(/rulebook: etsy-prompt-pack-v1/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /gorsel prompt pack/i })).toBeVisible();

  await page.getByRole("button", { name: /ai ile uret/i }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Handmade Oversize Hoodie");
  await expect(page.getByLabel("Description")).toHaveValue("Soft cotton hoodie for everyday wear.");
  await expect(page.getByLabel("Tags")).toHaveValue("oversize hoodie, streetwear gift");

  await page.getByRole("button", { name: /kaydet/i }).click();
  await expect(page.getByText(/^Kaydedildi$/i)).toBeVisible();

  expect(savePayloads[0]?.generatedFields).toEqual(["title", "description", "tags"]);
});
