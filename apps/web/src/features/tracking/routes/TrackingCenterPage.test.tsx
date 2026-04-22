import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackingCenterPage } from "./TrackingCenterPage";
import type { TrackingItem } from "../../../app/api";
import { renderWithProviders } from "../../../test/test-utils";

const trackingItems: TrackingItem[] = [
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

const categoriesPayload = {
  items: [
    { id: "cat_tracking", name: "Dis Giyim" },
    { id: "cat_home", name: "Ev Dekor" },
  ],
};

function buildTrackingPayloadFrom(items: TrackingItem[], shopId: string | null) {
  const filteredItems = shopId ? items.filter((item) => (item.shops ?? []).some((shop) => shop.id === shopId)) : items;

  return {
    summary: {
      trackedCount: 2,
      activeCount: 2,
      reviewNeededCount: 0,
    },
    items: filteredItems,
    filters: shopId ? { shopId } : {},
  };
}

function buildTrackingPayload(shopId: string | null) {
  return buildTrackingPayloadFrom(trackingItems, shopId);
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

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
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

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
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

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
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

  it("assigns selected etsy shop on the card", async () => {
    const user = userEvent.setup();
    const mutableTrackingItems = trackingItems.map((item) => ({
      ...item,
      shops: (item.shops ?? []).map((shop) => ({ ...shop })),
    }));

    const updateRequestSpy = vi.fn();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const parsedUrl = new URL(url, "https://example.com");
      const method = (init?.method ?? "GET").toUpperCase();

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

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
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

      if (url.includes("/owners/berke/products/prod_1/etsy-shops") && method === "PUT") {
        updateRequestSpy();
        const selectedShop = etsyShopsPayload.items.find((shop) => shop.id === "shop_nordic");
        if (selectedShop) {
          mutableTrackingItems[0].shops = [
            {
              id: selectedShop.id,
              name: selectedShop.name,
              etsyShopUrl: selectedShop.etsyShopUrl,
              description: null,
            },
          ];
        }

        return new Response(
          JSON.stringify({
            productId: "prod_1",
            shops: mutableTrackingItems[0].shops,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/owners/berke/products")) {
        return new Response(JSON.stringify(buildTrackingPayloadFrom(mutableTrackingItems, parsedUrl.searchParams.get("shopId"))), {
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

    const hoodieHeading = await screen.findByRole("heading", { name: /oversize hoodie/i });
    const hoodieCard = hoodieHeading.closest("article");
    expect(hoodieCard).not.toBeNull();
    if (!hoodieCard) {
      throw new Error("Expected hoodie card to exist");
    }

    await user.selectOptions(within(hoodieCard).getByLabelText(/etsy mağazası/i), "shop_nordic");

    expect(updateRequestSpy).toHaveBeenCalledTimes(1);
    expect(await within(hoodieCard).findByText(/etsy mağazası: nordic lane/i)).toBeInTheDocument();
  });

  it("falls back to existing tracked product assignment when create returns duplicate", async () => {
    const user = userEvent.setup();
    const sourceOnlyProducts = {
      items: [
        {
          id: "sp_dup",
          ownerKey: "berke",
          title: "Canta Kaynak",
          sourceUrl: "https://www.trendyol.com/brand/canta-p-456?boutiqueId=99",
          platform: "trendyol",
          notes: null,
          sourceCategory: { id: "cat_bag", name: "Canta" },
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      filters: {},
    };

    let trackingState: TrackingItem[] = [];
    const updateRequestSpy = vi.fn();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init?.method ?? "GET").toUpperCase();

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

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify(sourceOnlyProducts), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/prod_dup/etsy-shops") && method === "PUT") {
        updateRequestSpy();
        trackingState = trackingState.map((item) =>
          item.id === "prod_dup"
            ? {
                ...item,
                shops: [{ id: "shop_nordic", name: "Nordic Lane", etsyShopUrl: "https://www.etsy.com/shop/nordiclane", description: null }],
              }
            : item,
        );

        return new Response(
          JSON.stringify({
            productId: "prod_dup",
            shops: trackingState.find((item) => item.id === "prod_dup")?.shops ?? [],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.endsWith("/owners/berke/products") && method === "POST") {
        trackingState = [
          {
            id: "prod_dup",
            ownerKey: "berke",
            sourceProductId: "456",
            title: "Canta Takip",
            brand: "Bag Brand",
            trendyolUrl: "https://www.trendyol.com/brand/canta-p-456",
            status: "ACTIVE",
            parseStatus: "OK",
            thumbnailImage: "https://cdn.example.com/bag.jpg",
            currentPrice: 31990,
            minPrice: 29990,
            maxPrice: 32990,
            inStockVariantCount: 6,
            totalVariantCount: 8,
            isFavorite: false,
            userCategory: null,
            shops: [],
            lastCheckedAt: 1710000000000,
          },
        ];

        return new Response(JSON.stringify({ error: "Tracked product already exists for https://www.trendyol.com/brand/canta-p-456" }), {
          status: 409,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products")) {
        return new Response(JSON.stringify(buildTrackingPayloadFrom(trackingState, null)), {
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

    const bagHeading = await screen.findByRole("heading", { name: /canta kaynak/i });
    const bagCard = bagHeading.closest("article");
    expect(bagCard).not.toBeNull();
    if (!bagCard) {
      throw new Error("Expected source-only card to exist");
    }

    await user.selectOptions(within(bagCard).getByLabelText(/etsy mağazası/i), "shop_nordic");

    expect(updateRequestSpy).toHaveBeenCalledTimes(1);
    expect(await within(bagCard).findByText(/etsy mağazası: nordic lane/i)).toBeInTheDocument();
  });
});
