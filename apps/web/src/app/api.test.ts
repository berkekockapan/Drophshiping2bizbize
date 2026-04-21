import { afterEach, describe, expect, it, vi } from "vitest";

describe("app api", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prefixes owner requests with VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://dropshiping2bizbize-api.workers.dev");
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
      "https://dropshiping2bizbize-api.workers.dev/owners/berke/products",
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
          rulebookVersion: "etsy-prompt-pack-v6",
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
            prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
            outputContract: { type: "json", fields: ["title", "description", "tags"] },
          },
          systemListingPromptPack: {
            prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
            outputContract: { type: "json", fields: ["title", "description", "tags"] },
          },
          chatGptResearchPromptPack: {
            prompt:
              "Check Etsy Seller Handbook guidance on listing quality and keyword strategy before drafting.\nGenerate 30 candidate Etsy search phrases first, then keep only the strongest 13.\nEvery tag must read like a natural Etsy buyer query, not a literal attribute dump or awkward translated phrase.\nTreat size tags as optional. Use a size-based tag only when the exact phrase sounds like a natural Etsy buyer search and is stronger than available material, style, recipient, or use-case tags.\nDo not reject a tag only because it is broad.\nDo not let generic fallback nouns such as jewelry or accessory dominate the tag set; keep them only when they add distinct search intent that a more specific product noun cannot express cleanly.\nReject weak generic tags such as everyday jewelry, wrist jewelry, or long stone bracelet when stronger product-led queries are available.\nReturn only the final answer in exactly 3 sections:\n1. Title\n2. Description\n3. Tags",
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
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const { fetchEtsyPromptPack } = await import("./api");
    const result = await fetchEtsyPromptPack("berke", "prod_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/products/prod_1/etsy-prep/prompt-pack",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result.rulebookVersion).toBe("etsy-prompt-pack-v6");
    expect(result.imagePromptPack.variations).toHaveLength(10);
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

  it("prefixes source-products requests with VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://dropshiping2bizbize-api.workers.dev");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ items: [], total: 0 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { fetchSourceProducts } = await import("./api");
    await fetchSourceProducts("berke", "123456789");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://dropshiping2bizbize-api.workers.dev/owners/berke/source-products?search=123456789",
      expect.anything(),
    );
  });

  it("sends owner-scoped source-product detail and mutation requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/owners/berke/source-products/src_1") && method === "GET") {
        return new Response(
          JSON.stringify({
            product: {
              id: "src_1",
              ownerKey: "berke",
              sourceTitle: "Minimal seramik kupa",
              sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
              sourcePlatform: "SHOPIER",
              note: "Ilk Etsy denemesi icin saklandi",
              createdAt: 1,
              updatedAt: 2,
            },
            etsyLinks: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (method === "PATCH" || method === "POST") {
        return new Response(
          JSON.stringify({
            product: {
              id: "src_1",
              ownerKey: "berke",
              sourceTitle: "Minimal seramik kupa",
              sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
              sourcePlatform: "SHOPIER",
              note: "Guncel not",
              createdAt: 1,
              updatedAt: 2,
            },
            etsyLinks: [],
          }),
          { status: method === "POST" ? 201 : 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response("Not found", { status: 404 });
    });

    const {
      addSourceProductEtsyLink,
      deleteSourceProductEtsyLink,
      fetchSourceProductDetail,
      updateSourceProduct,
    } = await import("./api");

    await fetchSourceProductDetail("berke", "src_1");
    await updateSourceProduct("berke", "src_1", { note: "Guncel not" });
    await addSourceProductEtsyLink("berke", "src_1", { etsyUrl: "https://www.etsy.com/listing/123456789" });
    await deleteSourceProductEtsyLink("berke", "src_1", "etsy_1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/source-products/src_1",
      expect.anything(),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/source-products/src_1",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/source-products/src_1/etsy-links",
      expect.objectContaining({ method: "POST" }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "/owners/berke/source-products/src_1/etsy-links/etsy_1",
      expect.objectContaining({ method: "DELETE" }),
    );
  });
});

