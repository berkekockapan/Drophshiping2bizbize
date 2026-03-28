import { afterEach, describe, expect, it, vi } from "vitest";

describe("app api", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prefixes owner requests with VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://trendyol-etsy-api.workers.dev");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { fetchTrackingView } = await import("./api");
    await fetchTrackingView("berke");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://trendyol-etsy-api.workers.dev/owners/berke/products",
      expect.anything(),
    );
  });

  it("maps network failures to a clear cloud persistence message", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const { fetchTrackingView } = await import("./api");
    await expect(fetchTrackingView("berke")).rejects.toThrow(
      "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
    );

    expect(fetchMock).toHaveBeenCalledWith("/owners/berke/products", expect.anything());
  });

  it("forwards etsyCostCalculator in patchSettings payload", async () => {
    const storage = {
      version: 1,
      profileVersion: "etsy-tr-2026-03-28",
      draft: { usdTryRate: 40, salePriceUsd: 55 },
      presets: [],
      updatedAt: 1,
    };

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: null,
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
          etsyCostCalculator: storage,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { patchSettings } = await import("./api");
    await patchSettings({ etsyCostCalculator: storage as never });

    expect(fetchMock).toHaveBeenCalledWith(
      "/settings",
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ etsyCostCalculator: storage }),
      }),
    );
  });

  it("normalizes missing tariffAnalysis in product detail response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          product: {
            id: "prod_1",
            ownerKey: "berke",
            trendyolUrl: "https://www.trendyol.com/p/test",
            sourceProductId: null,
            title: "Test urun",
            brand: "Test marka",
            category: "Giyim",
            userCategory: null,
            descriptionRaw: null,
            attributes: [],
            images: [],
            status: "ACTIVE",
            parseStatus: "PARSED",
            lastCheckedAt: null,
          },
          currentState: {
            currentPrice: null,
            minPrice: null,
            maxPrice: null,
            inStockVariantCount: 0,
            totalVariantCount: 0,
            lastChangeAt: null,
            lastCheckedAt: null,
          },
          variants: [],
          priceHistory: [],
          stockHistory: [],
          changeTimeline: [],
          notifications: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { fetchProductDetail } = await import("./api");
    const detail = await fetchProductDetail("berke", "prod_1");

    expect(detail.tariffAnalysis).toEqual({
      selection: null,
      latestRun: null,
      recommendations: [],
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    });
  });

  it("posts to the owner-scoped prompt-pack endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          rulebookVersion: "etsy-prompt-pack-v1",
          generatedAt: 1774742400000,
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
            prompt: "Return ONLY valid JSON.",
            outputContract: { type: "json", fields: ["title", "description", "tags"] },
          },
          imagePromptPack: {
            mainPrompt: "Use the reference image.",
            variations: ["a", "b", "c", "d", "e", "f", "g"],
            guardrailSummary: ["Urun formunu degistirme"],
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { fetchEtsyPromptPack } = await import("./api");
    const result = await fetchEtsyPromptPack("berke", "prod_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/products/prod_1/etsy-prep/prompt-pack",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.imagePromptPack.variations).toHaveLength(7);
  });

  it("posts to generate-listing-pack and returns the parsed result", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          provider: "openai-oauth",
          rulebookVersion: "etsy-prompt-pack-v1",
          result: {
            title: "Handmade Oversize Hoodie",
            description: "Soft cotton hoodie for everyday wear.",
            tags: "oversize hoodie, streetwear gift",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { generateEtsyListingPack } = await import("./api");
    const result = await generateEtsyListingPack("berke", "prod_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/products/prod_1/etsy-prep/generate-listing-pack",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.result.tags).toBe("oversize hoodie, streetwear gift");
  });
});
