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

  await page.route("**/owners/berke/products/prod_1", async (route) => {
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
        costContext: {
          selectedVariantId: "var_1",
          variants: [
            {
              variantId: "var_1",
              label: "Tek Varyant",
              autoProductCost: { amount: 449.9, currency: "TRY" },
              manualProductCost: null,
              autoShippingEstimate: { amount: 7.5, currency: "USD", sourceType: "profile_default" },
              manualShippingCost: null,
            },
          ],
          usState: {
            status: "locked",
            label: "hesap kilitli",
            lockedReason: "Sistem ABD profilinden yeterince emin degil.",
            profile: null,
          },
        },
        tariffAnalysis: {
          selection: null,
          latestRun: {
            id: "run_1",
            productId: "prod_1",
            ownerKey: "berke",
            status: "completed",
            usedAi: false,
            inputSnapshot: {},
            resultSnapshot: {
              recommendations: [
                {
                  catalogId: "catalog_611020",
                  canonicalHs6: "611020",
                  profileName: "Pamuklu ust giysi",
                  title: "Textile apparel",
                  rationale: "Hoodie sinyali ile eslesti.",
                  score: 92,
                  usProfileId: "us_611020_2026r4",
                  htsCode10: "6110.20.2079",
                  generalDutyRate: 0.165,
                  additionalDutyRate: 0,
                  combinedDutyRate: 0.165,
                  dutySummary: "%16.5 temel vergi + %0 ek tarife = toplam %16.5",
                  defaultShipentegraUsd: 7.5,
                  sourceBadges: ["Kural eslesmesi"],
                },
              ],
            },
            engineVersion: "tariff-v1",
            createdAt: Date.parse("2026-03-20T10:00:00.000Z"),
            completedAt: Date.parse("2026-03-20T10:00:05.000Z"),
          },
          recommendations: [
            {
              catalogId: "catalog_611020",
              canonicalHs6: "611020",
              profileName: "Pamuklu ust giysi",
              title: "Textile apparel",
              rationale: "Hoodie sinyali ile eslesti.",
              score: 92,
              usProfileId: "us_611020_2026r4",
              htsCode10: "6110.20.2079",
              generalDutyRate: 0.165,
              additionalDutyRate: 0,
              combinedDutyRate: 0.165,
              dutySummary: "%16.5 temel vergi + %0 ek tarife = toplam %16.5",
              defaultShipentegraUsd: 7.5,
              sourceBadges: ["Kural eslesmesi"],
            },
          ],
          manualSearchEnabled: true,
          disclaimer: "Planlama amacli GTIP tahminidir.",
        },
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

  await page.route("**/owners/berke/products/prod_1/etsy-prep", async (route) => {
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

  await page.route("**/owners/berke/products/prod_1/etsy-prep/prompt-pack", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rulebookVersion: "etsy-prompt-pack-v6",
        generatedAt: Date.parse("2026-03-31T09:00:00.000Z"),
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
        systemListingPromptPack: {
          prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
          outputContract: { type: "json", fields: ["title", "description", "tags"] },
        },
        chatGptResearchPromptPack: {
          prompt:
            "Check Etsy Seller Handbook guidance on listing quality and keyword strategy before drafting.\nGenerate 30 candidate Etsy search phrases first, then keep only the strongest 13.\nEvery tag must read like a natural Etsy buyer query, not a literal attribute dump or awkward translated phrase.\nTreat size tags as optional. Use a size-based tag only when the exact phrase sounds like a natural Etsy buyer search and is stronger than available material, style, recipient, or use-case tags.\nDo not reject a tag only because it is broad.\nDo not let generic fallback nouns such as jewelry or accessory dominate the tag set; keep them only when they add distinct search intent that a more specific product noun cannot express cleanly.\nReject weak generic tags such as everyday jewelry, wrist jewelry, or long stone bracelet when stronger product-led queries are available.",
          outputFormat: "sectioned-text",
          researchMode: "required",
          expectedSections: ["title", "description", "tags"],
        },
        imagePromptPack: {
          mainPrompt: "Reference Truth\n- The manual reference image is the single source of truth for the exact product.",
          variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"],
          guardrailSummary: ["Do not redesign, reinterpret, embellish, or reconstruct the product."],
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

  await page.route("**/owners/berke/products/prod_1/etsy-prep/analyze", async (route) => {
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

  await page.route("**/owners/berke/products/prod_1/etsy-prep/generate-listing-pack", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: "openai-oauth",
        rulebookVersion: "etsy-prompt-pack-v6",
        result: {
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "oversize hoodie, streetwear gift",
        },
      }),
    });
  });

  await page.route("**/owners/berke/products/prod_1/etsy-prep/save", async (route) => {
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

  await page.goto("/owners/berke/products/prod_1");
  await expect(page).toHaveURL(/\/owners\/berke\/products\/prod_1$/);

  await page.getByRole("button", { name: /etsy'e yükle/i }).click();

  const listingCard = page.getByRole("heading", { name: /listing prompt pack/i }).locator("xpath=ancestor::section[1]");
  const imageCard = page.getByRole("heading", { name: /gorsel prompt pack/i }).locator("xpath=ancestor::section[1]");

  await expect(page.getByRole("heading", { name: /listing prompt pack/i })).toBeVisible();
  await expect(page.getByText(/rulebook: etsy-prompt-pack-v6/i)).toBeVisible();
  await expect(page.getByText(/chatgpt research mode/i)).toBeVisible();
  await expect(page.getByText(/system generate mode/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /chatgpt arastirma promptunu kopyala/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /sistem promptunu kopyala/i })).toBeVisible();
  await expect(page.getByText(/generate 30 candidate etsy search phrases first/i)).toBeVisible();
  await expect(page.getByText(/treat size tags as optional/i)).toBeVisible();
  await expect(page.getByRole("heading", { name: /gorsel prompt pack/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /10 varyasyonu kopyala/i })).toBeVisible();
  await expect(listingCard.getByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toBeVisible();
  await expect(imageCard.getByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toBeVisible();
  await expect(listingCard.getByText("PRODUCT_CONTEXT")).toHaveCount(0);
  await expect(listingCard.getByText("https://cdn.example.com/hoodie-1.jpg")).toHaveCount(0);
  await expect(imageCard.getByText("PRODUCT_CONTEXT")).toHaveCount(0);
  await expect(imageCard.getByText("https://cdn.example.com/hoodie-1.jpg")).toHaveCount(0);

  await page.getByRole("button", { name: /ai ile uret/i }).click();
  await expect(page.getByLabel("Title")).toHaveValue("Handmade Oversize Hoodie");
  await expect(page.getByLabel("Description")).toHaveValue("Soft cotton hoodie for everyday wear.");
  await expect(page.getByLabel("Tags")).toHaveValue("oversize hoodie, streetwear gift");

  await page.getByRole("button", { name: /kaydet/i }).click();
  await expect(page.getByText(/^Kaydedildi$/i)).toBeVisible();

  expect(savePayloads[0]?.generatedFields).toEqual(["title", "description", "tags"]);
});
