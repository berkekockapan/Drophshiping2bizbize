import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackingCenterPage } from "./TrackingCenterPage";
import { renderWithProviders } from "../../../test/test-utils";

const trackingItems = [
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
    userCategory: { id: "cat_tracking", name: "Dis Giyim" },
    shops: [{ id: "shop_cozy", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozyprints", description: null }],
    lastCheckedAt: 1710000000000,
  },
  {
    id: "prod_2",
    ownerKey: "berke",
    sourceProductId: null,
    title: "Takipsel Kupa",
    brand: "Ceramic House",
    trendyolUrl: "https://www.trendyol.com/ceramic-house/kupa-p-999",
    status: "ACTIVE",
    parseStatus: "OK",
    thumbnailImage: "https://cdn.example.com/mug.jpg",
    currentPrice: 25990,
    minPrice: 20990,
    maxPrice: 26990,
    inStockVariantCount: 3,
    totalVariantCount: 4,
    isFavorite: false,
    userCategory: null,
    shops: [{ id: "shop_nordic", name: "Nordic Lane", etsyShopUrl: "https://www.etsy.com/shop/nordiclane", description: null }],
    lastCheckedAt: 1710000000000,
  },
];

const sourceProductsPayload = {
  items: [
    {
      id: "sp_1",
      ownerKey: "berke",
      title: "Oversize Hoodie",
      sourceUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
      platform: "trendyol",
      notes: null,
      sourceCategory: { id: "cat_source", name: "Hoodie" },
      sortOrder: 0,
      deletedAt: null,
      linkedEtsyCount: 1,
      linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
    },
    {
      id: "sp_2",
      ownerKey: "berke",
      title: "Kaynak Canta",
      sourceUrl: "https://www.trendyol.com/bag-brand/canta-p-456",
      platform: "trendyol-milla",
      notes: "canvas",
      sourceCategory: { id: "cat_bag", name: "Canta" },
      sortOrder: 1,
      deletedAt: null,
      linkedEtsyCount: 0,
      linkedEtsyItems: [],
    },
  ],
  filters: {},
};

const etsyShopsPayload = {
  items: [
    {
      id: "shop_cozy",
      name: "Cozy Prints",
      etsyShopUrl: "https://www.etsy.com/shop/cozyprints",
      description: "Ana Etsy magazasi",
      productCount: 1,
    },
    {
      id: "shop_nordic",
      name: "Nordic Lane",
      etsyShopUrl: "https://www.etsy.com/shop/nordiclane",
      description: "Ikinci magaza",
      productCount: 1,
    },
  ],
};

function buildTrackingPayload(shopId: string | null) {
  const items = shopId ? trackingItems.filter((item) => item.shops.some((shop) => shop.id === shopId)) : trackingItems;

  return {
    summary: {
      trackedCount: 2,
      activeCount: 2,
      reviewNeededCount: 0,
    },
    items,
    filters: shopId ? { shopId } : {},
  };
}

describe("TrackingCenterPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders the unified dashboard and sends owner-aware requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const parsedUrl = new URL(url, "https://example.com");

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/etsy-shops")) {
        return new Response(JSON.stringify(etsyShopsPayload), {
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
        return new Response(JSON.stringify(buildTrackingPayload(parsedUrl.searchParams.get("shopId"))), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    expect(await screen.findByRole("heading", { name: /birleşik ürün görünümü/i })).toBeInTheDocument();
    expect(await screen.findByText(/kaynak canta/i)).toBeInTheDocument();
    expect(screen.getByText(/etsy bağlı/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/products"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/source-products"), expect.anything());
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/etsy-shops"), expect.anything());
  });

  it("filters by category tabs and search text", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const parsedUrl = new URL(url, "https://example.com");

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/etsy-shops")) {
        return new Response(JSON.stringify(etsyShopsPayload), {
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
        return new Response(JSON.stringify(buildTrackingPayload(parsedUrl.searchParams.get("shopId"))), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /canta \(1\)/i }));
    expect(await screen.findByText(/kaynak canta/i)).toBeInTheDocument();
    expect(screen.queryByText(/takipsel kupa/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tümü \(3\)/i }));
    await user.type(screen.getByLabelText(/arama/i), "kupa");

    expect(await screen.findByText(/takipsel kupa/i)).toBeInTheDocument();
    expect(screen.queryByText(/kaynak canta/i)).not.toBeInTheDocument();
  });

  it("filters products by selected etsy shop", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      const parsedUrl = new URL(url, "https://example.com");

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/etsy-shops")) {
        return new Response(JSON.stringify(etsyShopsPayload), {
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
        return new Response(JSON.stringify(buildTrackingPayload(parsedUrl.searchParams.get("shopId"))), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    expect(await screen.findByText(/takipsel kupa/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /cozy prints \(1\)/i }));

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
    expect(screen.queryByText(/takipsel kupa/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/kaynak canta/i)).not.toBeInTheDocument();
  });
});
