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
};

const categoriesPayload = {
  items: [{ id: "cat_bardak", name: "Bardak" }],
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

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/owners/berke/products/prod_1",
      path: "/owners/:ownerKey/products/:productId",
    });

    expect(await screen.findByText(/varyasyon matrisi/i)).toBeInTheDocument();
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

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetLabel: "Windows",
          aiTargetApiKey: "api_live_123",
        });
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
});
