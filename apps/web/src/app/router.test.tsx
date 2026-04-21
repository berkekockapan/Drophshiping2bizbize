import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "./router";
import { installMockLocalStorage } from "../test/mockLocalStorage";

const trackingPayload = {
  summary: {
    trackedCount: 1,
    activeCount: 1,
    reviewNeededCount: 0,
  },
  items: [
    {
      id: "prod_1",
      ownerKey: "berke",
      sourceProductId: "123",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
      status: "ACTIVE",
      parseStatus: "OK",
      thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
      currentPrice: 42990,
      minPrice: 34990,
      maxPrice: 44990,
      inStockVariantCount: 12,
      totalVariantCount: 18,
      isFavorite: false,
    },
  ],
  filters: {},
};

const sourceProductsPayload = {
  items: [
    {
      id: "sp_1",
      ownerKey: "berke",
      title: "Oversize Hoodie",
      sourceUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
      platform: "trendyol",
      notes: null,
      sourceCategory: { id: "cat_1", name: "Hoodie" },
      sortOrder: 0,
      deletedAt: null,
      linkedEtsyCount: 1,
      linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
    },
  ],
  filters: {},
};

describe("AppRouter", () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the unified dashboard for the owner products route", async () => {
    window.history.pushState({}, "", "/owners/berke/products");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify(sourceProductsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products")) {
        return new Response(JSON.stringify(trackingPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    render(<AppRouter />);

    expect(await screen.findByRole("heading", { name: /birleşik ürün görünümü/i })).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
  });

  it("renders the etsy cost calculator route and sidebar entry", async () => {
    window.history.pushState({}, "", "/etsy-cost-calculator?ownerKey=berke&productId=prod_1");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
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

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify({ items: [], filters: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products")) {
        return new Response(
          JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    render(<AppRouter />);

    expect(await screen.findByRole("heading", { name: /etsy maliyet hesaplayici/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /etsy maliyet hesaplayici/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /abd hedef profili/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /abd ithalat vergisi/i })).not.toBeInTheDocument();
  });

  it("renders the source-products route and sidebar entry", async () => {
    window.history.pushState({}, "", "/owners/berke/source-products");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/source-product-categories")) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify({ items: [], filters: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    render(<AppRouter />);

    expect(await screen.findByRole("heading", { name: /kaynak ürünler/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /kaynak ürünler/i })).toBeInTheDocument();
  });

  it("redirects kaan owner routes to the default owner and hides kaan sidebar entry", async () => {
    window.history.pushState({}, "", "/owners/kaan/products");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify(sourceProductsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products")) {
        return new Response(JSON.stringify(trackingPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    render(<AppRouter />);

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
    expect(window.location.pathname).toBe("/owners/berke/products");
    expect(screen.queryByRole("link", { name: /kaan/i })).not.toBeInTheDocument();
  });
});
