import { expect, test } from "@playwright/test";

test("product detail shows variant visuals and updates selected variant details", async ({ page }) => {
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
      shops: [],
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
        rawPayload: {
          stockState: "IN_STOCK",
          imageUrl: "https://cdn.example.com/hoodie-l.jpg",
          url: "https://www.trendyol.com/example/l-siyah",
        },
      },
      {
        id: "var_2",
        variantKey: "M-Siyah",
        option1: "M",
        option2: "Siyah",
        option3: null,
        trendyolUrl: "https://www.trendyol.com/example/m-siyah",
        currentStockState: "OUT_OF_STOCK",
        currentPrice: 42990,
        lastSeenAt: Date.parse("2026-03-28T10:00:00.000Z"),
        rawPayload: {
          stockState: "OUT_OF_STOCK",
          imageUrl: "https://cdn.example.com/hoodie-m.jpg",
          url: "https://www.trendyol.com/example/m-siyah",
        },
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
      latestRun: null,
      recommendations: [],
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    },
  };

  await page.addInitScript((payload) => {
    const detailPayload = payload as Record<string, any>;
    const originalFetch = window.fetch.bind(window);

    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

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

      if (url.includes("/owners/berke/etsy-shops")) {
        return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), { status: 200, headers: { "Content-Type": "application/json" } });
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

  await expect(page.getByText(/varyant görünümü/i)).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /görsel/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /ürün başlığı/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /urun maliyet gorunumu/i })).toHaveCount(0);

  await page.getByRole("button", { name: /varyant sec: m \/ siyah/i }).click();

  await expect(page.getByText("M / Siyah").first()).toBeVisible();
  await expect(page.getByText(/429,90/).first()).toBeVisible();
});
