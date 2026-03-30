import { expect, test } from "@playwright/test";

test("product detail updates cost cards when the variant and overrides change", async ({ page }) => {
  const detailPayload = {
    product: {
      id: "prod_1",
      ownerKey: "berke",
      trendyolUrl: "https://www.trendyol.com/example",
      sourceProductId: "123",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      category: "Sweatshirt",
      userCategory: null,
      descriptionRaw: "Yumusak dokulu oversize hoodie.",
      attributes: [{ key: "Renk", value: "Siyah" }],
      images: ["https://cdn.example.com/hoodie-1.jpg"],
      status: "ACTIVE",
      parseStatus: "OK",
      lastCheckedAt: Date.parse("2026-03-28T10:00:00.000Z"),
    },
    currentState: {
      currentPrice: 44990,
      minPrice: 34990,
      maxPrice: 44990,
      inStockVariantCount: 2,
      totalVariantCount: 2,
      lastChangeAt: Date.parse("2026-03-28T09:30:00.000Z"),
      lastCheckedAt: Date.parse("2026-03-28T10:00:00.000Z"),
    },
    variants: [
      {
        id: "var_1",
        variantKey: "L-Siyah",
        option1: "L",
        option2: "Siyah",
        option3: null,
        trendyolUrl: "https://www.trendyol.com/example/l-siyah",
        currentStockState: "IN_STOCK",
        currentPrice: 44990,
        lastSeenAt: Date.parse("2026-03-28T10:00:00.000Z"),
        rawPayload: { stockState: "IN_STOCK", url: "https://www.trendyol.com/example/l-siyah" },
      },
      {
        id: "var_2",
        variantKey: "M-Siyah",
        option1: "M",
        option2: "Siyah",
        option3: null,
        trendyolUrl: "https://www.trendyol.com/example/m-siyah",
        currentStockState: "IN_STOCK",
        currentPrice: 42990,
        lastSeenAt: Date.parse("2026-03-28T10:00:00.000Z"),
        rawPayload: { stockState: "IN_STOCK", url: "https://www.trendyol.com/example/m-siyah" },
      },
    ],
    priceHistory: [],
    stockHistory: [],
    changeTimeline: [],
    notifications: [],
    costContext: {
      selectedVariantId: "var_1",
      variants: [
        {
          variantId: "var_1",
          label: "L / Siyah",
          autoProductCost: { amount: 449.9, currency: "TRY" },
          manualProductCost: null,
          autoShippingEstimate: { amount: 7.5, currency: "USD", sourceType: "profile_default" },
          manualShippingCost: null,
        },
        {
          variantId: "var_2",
          label: "M / Siyah",
          autoProductCost: { amount: 429.9, currency: "TRY" },
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
              catalogId: "catalog_611030",
              canonicalHs6: "611030",
              profileName: "Sweatshirt",
              title: "Sweatshirt",
              rationale: "Tekstil sinyali ile eslesti.",
              score: 96,
              usProfileId: "us_611030_2026r4",
              htsCode10: "6110.30.3059",
              generalDutyRate: 0.16,
              additionalDutyRate: 0,
              combinedDutyRate: 0.16,
              dutySummary: "%16.0 temel vergi + %0.0 ek tarife = toplam %16.0",
              defaultShipentegraUsd: 7.5,
              sourceBadges: ["Kural eslesmesi"],
            },
          ],
        },
        engineVersion: "tariff-v1",
        createdAt: Date.parse("2026-03-28T10:00:00.000Z"),
        completedAt: Date.parse("2026-03-28T10:00:03.000Z"),
      },
      recommendations: [
        {
          catalogId: "catalog_611030",
          canonicalHs6: "611030",
          profileName: "Sweatshirt",
          title: "Sweatshirt",
          rationale: "Tekstil sinyali ile eslesti.",
          score: 96,
          usProfileId: "us_611030_2026r4",
          htsCode10: "6110.30.3059",
          generalDutyRate: 0.16,
          additionalDutyRate: 0,
          combinedDutyRate: 0.16,
          dutySummary: "%16.0 temel vergi + %0.0 ek tarife = toplam %16.0",
          defaultShipentegraUsd: 7.5,
          sourceBadges: ["Kural eslesmesi"],
        },
      ],
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    },
  };

  await page.addInitScript((payload) => {
    const detailPayload = payload as Record<string, any>;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (url.endsWith("/settings")) {
        return new Response(
          JSON.stringify({
            id: "default",
            refreshIntervalHours: 5,
            promptPreferences: null,
            connectorHealthcheckEnabled: true,
            aiTargetBaseUrl: null,
            aiTargetManagementKey: null,
            aiTargetLabel: null,
            aiTargetApiKey: null,
            etsyCostCalculator: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/owners/berke/products/prod_1/variants/var_2/cost-overrides") && method === "PUT") {
        const body = JSON.parse(init?.body ? String(init.body) : "{}");
        const variant = detailPayload.costContext.variants.find((item: { variantId: string }) => item.variantId === "var_2");

        if (variant) {
          variant.manualProductCost = body.manualProductCost ?? null;
          variant.manualShippingCost = body.manualShippingCost ?? null;
        }

        return new Response(JSON.stringify({ override: { variantId: "var_2" } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return new Response(JSON.stringify(detailPayload), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (/\/owners\/berke\/products(?:\?|$)/.test(url)) {
        return new Response(
          JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return originalFetch(input, init);
    };
  }, detailPayload);

  await page.goto("/");
  await page.evaluate(() => {
    window.history.pushState({}, "", "/owners/berke/products/prod_1");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });

  await expect(page.getByRole("heading", { name: /urun maliyet gorunumu/i })).toBeVisible();
  await expect(page.getByText(/hesap kilitli/i)).toBeVisible();

  await page.getByLabel(/secili varyant/i).selectOption("var_2");
  await page.getByLabel(/urun maliyeti override/i).fill("399");
  await page.getByLabel(/kargo override/i).fill("8.25");

  await expect(page.getByText(/diger toplam maliyet/i)).toBeVisible();
  await expect(page.getByText(/manuel override kullaniliyor/i).first()).toBeVisible();
});
