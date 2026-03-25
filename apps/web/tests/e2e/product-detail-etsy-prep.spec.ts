import { expect, test } from "@playwright/test";

function ndjsonBody(events: unknown[]) {
  return `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
}

test("user opens Etsy prep from product detail, generates a field, and saves the workspace", async ({ page }) => {
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
          descriptionRaw: "Yumuşak dokulu oversize hoodie.",
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

  await page.route("**/tracking/products*", async (route) => {
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
          descriptionRaw: "Yumuşak dokulu oversize hoodie.",
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

  await page.route("**/settings", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: "default",
        refreshIntervalHours: 5,
        promptPreferences: null,
        connectorHealthcheckEnabled: true,
        aiTargetBaseUrl: "https://clip.example.com",
        aiTargetManagementKey: null,
        aiTargetLabel: null,
        aiTargetApiKey: null,
      }),
    });
  });

  await page.route("https://clip.example.com/health", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "online",
        provider: "chatgpt-web",
        activeProfile: {
          id: "profile_main",
          label: "OpenAI Workspace",
          emailMasked: "wo***@company.com",
          provider: "chatgpt-web",
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

  await page.route("**/products/prod_1/etsy-prep/generate-title", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/x-ndjson" },
      body: ndjsonBody([
        { type: "step_started", step: "build_prompt_package", field: "title" },
        { type: "step_completed", step: "build_prompt_package", field: "title" },
        {
          type: "prompt_ready",
          field: "title",
          prompt: "Return ONLY valid JSON",
          context: { productId: "prod_1" },
        },
      ]),
    });
  });

  await page.route("https://clip.example.com/generate-field", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        field: "title",
        value: "Handmade Oversize Hoodie",
        provider: "chatgpt-web",
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
          descriptionRaw: "Yumuşak dokulu oversize hoodie.",
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
  await page.getByRole("link", { name: /ürün görseli: oversize hoodie/i }).click();
  await expect(page).toHaveURL(/\/products\/prod_1$/);
  await expect(page.getByText(/Ürün Özeti/i)).toBeVisible();
  await page.getByRole("button", { name: "Etsy'e Yükle" }).click();

  await expect(page.getByRole("heading", { name: /etsy hazırlık çalışma alanı/i })).toBeVisible();
  await expect(page.getByText(/Lead with hoodie keyword\./i)).toBeVisible();

  await page.getByRole("button", { name: /title üret/i }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Handmade Oversize Hoodie");

  await page.getByRole("button", { name: /kaydet/i }).click();
  await expect(page.getByText(/^Kaydedildi$/i)).toBeVisible();

  await page.getByLabel("Title").fill("Handmade Oversize Hoodie Updated");
  await page.getByRole("button", { name: /kaydet/i }).click();

  await expect(page.getByText(/^Kaydedildi$/i)).toBeVisible();
  expect(savePayloads).toHaveLength(2);
  expect(savePayloads[0]?.generatedFields).toContain("title");
  expect(savePayloads[0]?.policyNotes).toContain("Etsy Uyum Kontrolleri:");
  expect(savePayloads[0]?.policyNotes).toContain("Eksik Veri / Riskler:");
  expect(savePayloads[1]?.generatedFields).toEqual([]);
  expect(savePayloads[1]?.editedFields).toContain("title");
});
