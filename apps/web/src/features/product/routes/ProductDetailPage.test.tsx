import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { renderWithProviders } from "../../../test/test-utils";
import { ProductDetailPage } from "./ProductDetailPage";

const productDetailPayload = {
  product: {
    id: "prod_1",
    ownerKey: "berke",
    trendyolUrl: "https://www.trendyol.com/example",
    sourceProductId: "123",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    userCategory: null,
    descriptionRaw: "Yumuşak dokulu oversize hoodie.",
    attributes: [{ key: "Renk", value: "Siyah" }],
    images: ["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"],
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
      lastSeenAt: Date.parse("2026-03-20T10:00:00.000Z"),
      rawPayload: { stockState: "IN_STOCK", url: "https://www.trendyol.com/example/l-siyah" },
    },
  ],
  priceHistory: [],
  stockHistory: [],
  changeTimeline: [
    {
      id: "audit_2",
      type: "REFRESH_NO_CHANGE",
      changedAt: Date.parse("2026-03-20T10:00:00.000Z"),
      summary: "Yenileme yapildi, degisiklik bulunamadi",
      details: null,
      before: null,
      after: null,
      variantKey: null,
      refreshSource: "MANUAL",
    },
  ],
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
        autoShippingEstimate: { amount: 7.1, currency: "USD", sourceType: "profile_default" },
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
            catalogId: "catalog_711790",
            canonicalHs6: "711790",
            profileName: "Deri aksesuar",
            title: "Imitation jewelry",
            rationale: "Deri aksesuar sinyali ile eslesti.",
            score: 97,
            usProfileId: "us_711790_2026r4",
            htsCode10: "7117.90.7500",
            generalDutyRate: 0.11,
            additionalDutyRate: 0,
            combinedDutyRate: 0.11,
            dutySummary: "%11 temel vergi + %0 ek tarife = toplam %11",
            defaultShipentegraUsd: 7.5,
            sourceBadges: ["Kural eslesmesi"],
          },
          {
            catalogId: "catalog_611120",
            canonicalHs6: "611120",
            profileName: "Pamuklu ust giysi",
            title: "Textile apparel",
            rationale: "Pamuklu giyim sinyali ile eslesti.",
            score: 74,
            usProfileId: "us_611120_2026r4",
            htsCode10: "6111.20.0000",
            generalDutyRate: 0.16,
            additionalDutyRate: 0,
            combinedDutyRate: 0.16,
            dutySummary: "%16 temel vergi + %0 ek tarife = toplam %16",
            defaultShipentegraUsd: 6.2,
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
        catalogId: "catalog_711790",
        canonicalHs6: "711790",
        profileName: "Deri aksesuar",
        title: "Imitation jewelry",
        rationale: "Deri aksesuar sinyali ile eslesti.",
        score: 97,
        usProfileId: "us_711790_2026r4",
        htsCode10: "7117.90.7500",
        generalDutyRate: 0.11,
        additionalDutyRate: 0,
        combinedDutyRate: 0.11,
        dutySummary: "%11 temel vergi + %0 ek tarife = toplam %11",
        defaultShipentegraUsd: 7.5,
        sourceBadges: ["Kural eslesmesi"],
      },
      {
        catalogId: "catalog_611120",
        canonicalHs6: "611120",
        profileName: "Pamuklu ust giysi",
        title: "Textile apparel",
        rationale: "Pamuklu giyim sinyali ile eslesti.",
        score: 74,
        usProfileId: "us_611120_2026r4",
        htsCode10: "6111.20.0000",
        generalDutyRate: 0.16,
        additionalDutyRate: 0,
        combinedDutyRate: 0.16,
        dutySummary: "%16 temel vergi + %0 ek tarife = toplam %16",
        defaultShipentegraUsd: 6.2,
        sourceBadges: ["Kural eslesmesi"],
      },
    ],
    manualSearchEnabled: true,
    disclaimer: "Planlama amacli GTIP tahminidir.",
  },
};

const categoriesPayload = {
  items: [{ id: "cat_bardak", name: "Bardak" }],
};

const settingsPayload = {
  id: "default",
  refreshIntervalHours: 5,
  promptPreferences: null,
  connectorHealthcheckEnabled: true,
  aiTargetBaseUrl: "https://clip.example.com",
  aiTargetManagementKey: "mgmt_live_123",
  aiTargetLabel: "Windows",
  aiTargetApiKey: "api_live_123",
  etsyCostCalculator: null,
};

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function ndjsonResponse(events: unknown[]) {
  return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

describe("ProductDetailPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("uses owner-scoped detail endpoint and back links", async () => {
    installMockLocalStorage();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return jsonResponse(categoriesPayload);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse(settingsPayload);
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    expect(await screen.findByRole("heading", { name: /urun maliyet gorunumu/i })).toBeInTheDocument();
    expect(screen.getByText(/diger toplam maliyet/i)).toBeInTheDocument();
    expect(screen.getByText(/gtip \/ abd vergi analizi/i)).toBeInTheDocument();
    expect(screen.getByText(/varyasyon matrisi/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ürün listesine dön/i })).toHaveAttribute("href", "/owners/berke/products");
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/products/prod_1"), expect.anything());
  });

  it("keeps the last successful detail on screen and shows a sync warning after a failed refresh", async () => {
    vi.useFakeTimers();
    let shouldFail = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return jsonResponse(categoriesPayload);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse(settingsPayload);
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        if (shouldFail) {
          return new Response(JSON.stringify({ error: "network lost" }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
          });
        }

        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByRole("heading", { name: /oversize hoodie/i })).toBeInTheDocument();

    shouldFail = true;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText(/son yenileme basarisiz/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /oversize hoodie/i })).toBeInTheDocument();
  });

  it("switches to prep mode and requests owner-scoped prep endpoints", async () => {
    installMockLocalStorage();
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return jsonResponse(categoriesPayload);
      }

      if (url.includes("/owners/berke/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          product: productDetailPayload.product,
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
        });
      }

      if (url.includes("/owners/berke/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      if (url.includes("/owners/berke/products/prod_1/etsy-prep/prompt-pack") && init?.method === "POST") {
        return jsonResponse({
          rulebookVersion: "etsy-prompt-pack-v4",
          generatedAt: Date.parse("2026-03-31T09:00:00.000Z"),
          productSnapshot: {
            productId: "prod_1",
            title: "Oversize Hoodie",
            brand: "North Apparel",
            category: "Sweatshirt",
            attributeCount: 1,
            variantCount: 0,
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
              "Check Etsy Seller Handbook guidance on listing quality and keyword strategy before drafting.\nGenerate 30 candidate Etsy search phrases first, then keep only the strongest 13.\nEvery tag must read like a natural Etsy buyer query, not a literal attribute dump or awkward translated phrase.\nUse truthful claims such as handmade when they are explicitly supported by product facts and improve buyer clarity.\nDo not call an item vintage unless the product facts explicitly confirm Etsy-vintage eligibility.\nReject any tag set with awkward raw-size phrases such as 20 cm bracelet when a more natural buyer phrase is available.",
            outputFormat: "sectioned-text",
            researchMode: "required",
            expectedSections: ["title", "description", "tags"],
          },
          imagePromptPack: {
            mainPrompt: "Reference Truth\n- The manual reference image is the single source of truth for the exact product.",
            variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7", "v8", "v9", "v10"],
            guardrailSummary: ["Do not redesign, reinterpret, embellish, or reconstruct the product."],
          },
        });
      }

      if (url.endsWith("/ai-profiles/health")) {
        return jsonResponse({
          status: "online",
          provider: "openai-oauth",
          activeProfile: null,
          connectionAttempt: null,
        });
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse(settingsPayload);
      }

      if (url === "https://clip.example.com/health") {
        return jsonResponse({
          status: "online",
          provider: "chatgpt-web",
          activeProfile: null,
          connectionAttempt: null,
        });
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    expect(await screen.findByRole("button", { name: /etsy'e yükle/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /etsy'e yükle/i }));

    expect(await screen.findByRole("heading", { name: /etsy hazırlık çalışma alanı/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products/prod_1/etsy-prep"),
        expect.anything(),
      ),
    );
  });

  it("updates the owner-scoped product category from the detail page", async () => {
    installMockLocalStorage();
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return jsonResponse(categoriesPayload);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse(settingsPayload);
      }

      if (url.includes("/owners/berke/products/prod_1/category") && init?.method === "PATCH") {
        return jsonResponse({ productId: "prod_1", userCategory: { id: "cat_bardak", name: "Bardak" } });
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    await user.selectOptions(await screen.findByLabelText(/takip kategorisi/i), "cat_bardak");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products/prod_1/category"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );
  });

  it("mounts the product cost panel with the tariff panel and saves a selected recommendation", async () => {
    installMockLocalStorage();
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return jsonResponse(categoriesPayload);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse(settingsPayload);
      }

      if (url.includes("/owners/berke/products/prod_1/tariff-selection") && init?.method === "PUT") {
        const body = init.body ? JSON.parse(String(init.body)) : {};
        const selectedCatalogId = body.catalogId ?? "catalog_711790";

        if (selectedCatalogId === "catalog_611120") {
          return jsonResponse({
            selection: {
              productId: "prod_1",
              ownerKey: "berke",
              catalogId: "catalog_611120",
              canonicalHs6: "611120",
              title: "Textile apparel",
              usProfileId: "us_611120_2026r4",
              selectionSource: "recommended",
              selectedBy: "berke",
              selectedAt: Date.now(),
              analysisRunId: "run_1",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              generalDutyRate: 0.16,
              additionalDutyRate: 0,
              combinedDutyRate: 0.16,
              dutySummary: "%16 temel vergi + %0 ek tarife = toplam %16",
              revisionLabel: "USITC HTS 2026 Revision 4",
            },
          });
        }

        return jsonResponse({
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
            dutySummary: "%11 temel vergi + %0 ek tarife = toplam %11",
            revisionLabel: "USITC HTS 2026 Revision 4",
          },
        });
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    expect(await screen.findByRole("heading", { name: /urun maliyet gorunumu/i })).toBeInTheDocument();
    expect(screen.getByText(/diger toplam maliyet/i)).toBeInTheDocument();
    expect(screen.getByText(/en uygun abd profili otomatik secildi/i)).toBeInTheDocument();
    expect(screen.getByText(/bu urun icin secilen gtip: 711790/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /bu kodu sec/i })[1]);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products/prod_1/tariff-selection"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(await screen.findByText(/bu urun icin secilen gtip: 611120/i)).toBeInTheDocument();
  });
});
