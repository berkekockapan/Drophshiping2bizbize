import { expect, test } from "@playwright/test";

test("product detail runs tariff analysis and lets the user save a recommendation", async ({ page }) => {
  const detailPayload = {
    product: {
      id: "prod_1",
      ownerKey: "berke",
      trendyolUrl: "https://www.trendyol.com/example",
      sourceProductId: "123",
      title: "Deri Bileklik",
      brand: "Atolye",
      category: "Aksesuar",
      userCategory: null,
      descriptionRaw: "El yapimi deri aksesuar",
      attributes: [{ key: "Materyal", value: "Deri" }],
      images: ["https://cdn.example.com/bileklik-1.jpg"],
      status: "ACTIVE",
      parseStatus: "OK",
      lastCheckedAt: Date.parse("2026-03-28T10:00:00.000Z"),
    },
    currentState: {
      currentPrice: 14990,
      minPrice: 12990,
      maxPrice: 14990,
      inStockVariantCount: 1,
      totalVariantCount: 1,
      lastChangeAt: Date.parse("2026-03-28T09:30:00.000Z"),
      lastCheckedAt: Date.parse("2026-03-28T10:00:00.000Z"),
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
          label: "Standart",
          autoProductCost: { amount: 149.9, currency: "TRY" },
          manualProductCost: null,
          autoShippingEstimate: { amount: 4.9, currency: "USD", sourceType: "profile_default" },
          manualShippingCost: null,
        },
      ],
      usState: {
        status: "automatic_confirmed",
        label: "otomatik dogrulandi",
        lockedReason: null,
        profile: {
          catalogId: "catalog_711790",
          profileName: "Deri aksesuar",
          canonicalHs6: "711790",
          htsCode10: "7117.90.7500",
          combinedDutyRate: 0.11,
          dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
          defaultShipentegraUsd: 4.9,
        },
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
              catalogId: "catalog_711790",
              canonicalHs6: "711790",
              profileName: "Deri aksesuar",
              title: "Imitation jewelry",
              rationale: "Eslesen urun sinyali bulundu.",
              score: 120,
              usProfileId: "us_711790_2026r4",
              htsCode10: "7117.90.7500",
              generalDutyRate: 0.11,
              additionalDutyRate: 0,
              combinedDutyRate: 0.11,
              dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
              defaultShipentegraUsd: 4.9,
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
          catalogId: "catalog_711790",
          canonicalHs6: "711790",
          profileName: "Deri aksesuar",
          title: "Imitation jewelry",
          rationale: "Eslesen urun sinyali bulundu.",
          score: 120,
          usProfileId: "us_711790_2026r4",
          htsCode10: "7117.90.7500",
          generalDutyRate: 0.11,
          additionalDutyRate: 0,
          combinedDutyRate: 0.11,
          dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
          defaultShipentegraUsd: 4.9,
          sourceBadges: ["Kural eslesmesi"],
        },
      ],
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    },
  };

  await page.addInitScript((payload) => {
    const detailPayload = payload as Record<string, unknown>;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const method = init?.method ?? (input instanceof Request ? input.method : "GET");

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

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

      if (url.includes("/owners/berke/products/prod_1/tariff-selection") && method === "PUT") {
        return new Response(
          JSON.stringify({
            selection: {
              productId: "prod_1",
              ownerKey: "berke",
              catalogId: "catalog_711790",
              canonicalHs6: "711790",
              title: "Imitation jewelry",
              usProfileId: "us_711790_2026r4",
              selectionSource: "recommended",
              selectedBy: "berke",
              selectedAt: Date.now(),
              analysisRunId: "run_1",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              generalDutyRate: 0.11,
              additionalDutyRate: 0,
              combinedDutyRate: 0.11,
              dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
              revisionLabel: "USITC HTS 2026 Revision 4",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
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

  await expect(page.getByRole("heading", { name: "GTIP / ABD Vergi Analizi" })).toBeVisible();
  await expect(page.getByText(/toplam %11.0/i).first()).toBeVisible();
  await page.getByRole("button", { name: /bu kodu sec/i }).first().click();
  await expect(page.getByText(/bu urun icin secilen gtip: 711790/i)).toBeVisible();
});
