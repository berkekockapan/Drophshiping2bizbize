import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "./router";

const trackingPayload = {
  summary: {
    trackedCount: 1,
    activeCount: 1,
    reviewNeededCount: 0,
  },
  items: [
    {
      id: "prod_1",
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

describe("AppRouter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.pushState({}, "", "/");
  });

  it("renders the tracking page for the owner products alias route", async () => {
    window.history.pushState({}, "", "/owners/berke/products");

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/tracking/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products")) {
        return new Response(JSON.stringify(trackingPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    render(<AppRouter />);

    expect(await screen.findByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
  });
});
