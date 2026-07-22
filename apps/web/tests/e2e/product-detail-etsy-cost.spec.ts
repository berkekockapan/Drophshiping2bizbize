import { expect, test } from "@playwright/test";

test("product detail manages persistent manually linked color variants", async ({ page }) => {
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
    linkedVariants: [],
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

      if (url.endsWith("/owners/berke/products/prod_1/linked-variants") && init?.method === "POST") {
        const linkedVariant = {
          id: "linked_blue",
          trendyolUrl: "https://www.trendyol.com/example/blue-p-456",
          sourceProductId: "456",
          title: "Oversize Hoodie Mavi",
          brand: "North Apparel",
          descriptionRaw: "Mavi renk seçeneği.",
          attributes: [{ key: "Renk", value: "Mavi" }],
          images: ["https://cdn.example.com/hoodie-blue.jpg"],
          currentPrice: 45990,
          currentStockState: "IN_STOCK",
          lastCheckedAt: Date.parse("2026-03-28T10:00:00.000Z"),
          createdAt: Date.parse("2026-03-28T10:00:00.000Z"),
        };
        detailPayload.linkedVariants = [linkedVariant];
        return new Response(JSON.stringify({ linkedVariant }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/products/prod_1/linked-variants/linked_blue") && init?.method === "DELETE") {
        detailPayload.linkedVariants = [];
        return new Response(null, { status: 204 });
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

  await expect(page.getByRole("heading", { name: /oversize hoodie/i })).toBeVisible();
  await expect(page.getByText(/varyant görünümü/i)).toHaveCount(0);
  await expect(page.getByText(/stokta olan varyasyon/i)).toHaveCount(0);
  await expect(page.getByText(/varyasyon matrisi/i)).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /urun maliyet gorunumu/i })).toHaveCount(0);

  await page.getByRole("button", { name: /varyant ekle/i }).click();
  await page.getByRole("textbox", { name: /trendyol ürün linki/i }).fill("https://www.trendyol.com/example/blue-p-456");
  await page.getByRole("button", { name: /^kaydet$/i }).click();
  await expect(page.getByText("Oversize Hoodie Mavi")).toBeVisible();

  await page.getByRole("button", { name: /oversize hoodie mavi/i }).click();
  await expect(page.getByText("Mavi renk seçeneği.")).toBeVisible();
  await expect(page.getByText(/459,90/).last()).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /^sil$/i }).click();
  await expect(page.getByText("Oversize Hoodie Mavi")).toHaveCount(0);
});
