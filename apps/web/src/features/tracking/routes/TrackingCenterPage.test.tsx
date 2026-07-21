import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
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
    etsyLinks: [{ id: "tracked_etsy", title: "998877665", url: "https://www.etsy.com/listing/998877665/takipsel-kupa" }],
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
    const searchInput = screen.getByLabelText(/arama/i);
    await user.type(searchInput, "kupa");

    expect(await screen.findByText(/takipsel kupa/i)).toBeInTheDocument();
    expect(screen.queryByText(/kaynak canta/i)).not.toBeInTheDocument();

    await user.clear(searchInput);
    await user.type(searchInput, "998877665");
    expect(await screen.findByText(/takipsel kupa/i)).toBeInTheDocument();
    expect(screen.queryByText(/oversize hoodie/i)).not.toBeInTheDocument();
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

  it.skip("assigns source-only card via source-products shop endpoint", async () => {
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
          userCategory: null as { id: string; name: string } | null,
          shops: [] as Array<{ id: string; name: string; etsyShopUrl: string; description: string | null }>,
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      filters: {},
    };

    let trackingState: TrackingItem[] = [];
    const assignByUrlSpy = vi.fn();

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

      if (url.endsWith("/owners/berke/source-products/sp_dup/etsy-shops") && method === "PUT") {
        assignByUrlSpy();
        sourceOnlyProducts.items[0].shops = [
          { id: "shop_nordic", name: "Nordic Lane", etsyShopUrl: "https://www.etsy.com/shop/nordiclane", description: null },
        ];
        return new Response(
          JSON.stringify({
            sourceProductId: "sp_dup",
            shops: [{ id: "shop_nordic", name: "Nordic Lane", etsyShopUrl: "https://www.etsy.com/shop/nordiclane", description: null }],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
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

    await user.selectOptions(within(bagCard).getByRole("combobox", { name: /etsy/i }), "shop_nordic");

    expect(assignByUrlSpy).toHaveBeenCalledTimes(1);
    expect(
      await within(bagCard).findByText((content, node) => node?.tagName === "P" && /nordic lane/i.test(content)),
    ).toBeInTheDocument();
  });

  it("assigns category for source-only card via source-products category endpoint", async () => {
    const user = userEvent.setup();
    const sourceOnlyProducts = {
      items: [
        {
          id: "sp_dup",
          ownerKey: "berke",
          title: "Canta Kaynak",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=456",
          platform: "SHOPIER",
          notes: null,
          sourceCategory: { id: "cat_bag", name: "Canta" },
          userCategory: null as { id: string; name: string } | null,
          shops: [],
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      filters: {},
    };

    const patchSpy = vi.fn();

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

      if (url.endsWith("/owners/berke/source-products/sp_dup/product-category") && method === "PATCH") {
        patchSpy();
        sourceOnlyProducts.items[0].userCategory = { id: "cat_home", name: "Ev Dekor" };
        return new Response(
          JSON.stringify({
            sourceProductId: "sp_dup",
            userCategory: { id: "cat_home", name: "Ev Dekor" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify(sourceOnlyProducts), {
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

      if (url.includes("/owners/berke/products")) {
        return new Response(JSON.stringify(buildTrackingPayloadFrom([], null)), {
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

    await user.selectOptions(within(bagCard).getByLabelText(/kategori/i), "cat_home");

    expect(patchSpy).toHaveBeenCalledTimes(1);
    expect(
      await within(bagCard).findByText((content, node) => node?.tagName === "DD" && /ev dekor/i.test(content)),
    ).toBeInTheDocument();
  });

  it("retries category update with refreshed tracked product id when initial id is stale", async () => {
    const user = userEvent.setup();
    const staleId = "prod_stale";
    const freshId = "prod_fresh";

    let trackingState: TrackingItem[] = [
      {
        ...trackingItems[0],
        id: staleId,
        sourceProductId: "123",
        userCategory: { id: "cat_tracking", name: "Dis Giyim" },
      },
    ];

    const stalePatchSpy = vi.fn();
    const freshPatchSpy = vi.fn();

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
        return new Response(JSON.stringify(sourceProductsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes(`/owners/berke/products/${staleId}/category`) && method === "PATCH") {
        stalePatchSpy();
        trackingState = [
          {
            ...trackingState[0],
            id: freshId,
            userCategory: { id: "cat_home", name: "Ev Dekor" },
          },
        ];

        return new Response(JSON.stringify({ error: "Kayit bulunamadi" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes(`/owners/berke/products/${freshId}/category`) && method === "PATCH") {
        freshPatchSpy();
        trackingState = [
          {
            ...trackingState[0],
            id: freshId,
            userCategory: { id: "cat_home", name: "Ev Dekor" },
          },
        ];

        return new Response(
          JSON.stringify({
            productId: freshId,
            userCategory: { id: "cat_home", name: "Ev Dekor" },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
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

    const hoodieHeading = await screen.findByRole("heading", { name: /oversize hoodie/i });
    const hoodieCard = hoodieHeading.closest("article");
    expect(hoodieCard).not.toBeNull();
    if (!hoodieCard) {
      throw new Error("Expected hoodie card to exist");
    }

    await user.selectOptions(within(hoodieCard).getByLabelText(/takip kategorisi/i), "cat_home");

    expect(stalePatchSpy).toHaveBeenCalledTimes(1);
    expect(freshPatchSpy).toHaveBeenCalledTimes(1);
    expect(
      await within(hoodieCard).findByText((content, node) => node?.tagName === "DD" && /ev dekor/i.test(content)),
    ).toBeInTheDocument();
  });

  it("creates dashboard categories and exposes them in tracked and source-only cards", async () => {
    const user = userEvent.setup();
    const categoriesState: Array<{ id: string; name: string }> = [];
    const createdCategory = { id: "cat_seramik", name: "Seramik" };
    const trackingState: TrackingItem[] = [
      {
        ...trackingItems[1],
        userCategory: null,
        shops: [],
      },
    ];
    const sourceOnlyProducts = {
      items: [
        {
          id: "sp_seramik",
          ownerKey: "berke",
          title: "Kaynak Seramik",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=987",
          platform: "SHOPIER",
          notes: null,
          sourceCategory: null,
          userCategory: null as { id: string; name: string } | null,
          shops: [],
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      filters: {},
    };

    const createCategorySpy = vi.fn();
    const deleteCategorySpy = vi.fn();
    const trackedPatchSpy = vi.fn();
    const sourcePatchSpy = vi.fn();

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
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/categories") && method === "POST") {
        createCategorySpy(JSON.parse(String(init?.body ?? "{}")));
        categoriesState.push(createdCategory);
        return new Response(JSON.stringify({ category: createdCategory }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/categories/cat_seramik") && method === "DELETE") {
        deleteCategorySpy();
        categoriesState.splice(0, categoriesState.length);
        trackingState[0].userCategory = null;
        sourceOnlyProducts.items[0].userCategory = null;
        return new Response(null, { status: 204 });
      }

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify({ items: categoriesState }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/source-products/sp_seramik/product-category") && method === "PATCH") {
        sourcePatchSpy(JSON.parse(String(init?.body ?? "{}")));
        sourceOnlyProducts.items[0].userCategory = createdCategory;
        return new Response(
          JSON.stringify({
            sourceProductId: "sp_seramik",
            userCategory: createdCategory,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(JSON.stringify(sourceOnlyProducts), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/products/prod_2/category") && method === "PATCH") {
        trackedPatchSpy(JSON.parse(String(init?.body ?? "{}")));
        trackingState[0].userCategory = createdCategory;
        return new Response(
          JSON.stringify({
            productId: "prod_2",
            userCategory: createdCategory,
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
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

    const sourceHeading = await screen.findByRole("heading", { name: /kaynak seramik/i });
    const trackedHeading = await screen.findByRole("heading", { name: /takipsel kupa/i });
    const sourceCard = sourceHeading.closest("article");
    const trackedCard = trackedHeading.closest("article");
    expect(sourceCard).not.toBeNull();
    expect(trackedCard).not.toBeNull();
    if (!sourceCard || !trackedCard) {
      throw new Error("Expected dashboard cards to exist");
    }

    expect(screen.queryByText(/kategori listesi/i)).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/yeni kategori/i), "Seramik");
    await user.click(screen.getByRole("button", { name: /kategori ekle/i }));

    await waitFor(() => expect(createCategorySpy).toHaveBeenCalledWith({ name: "Seramik" }));
    expect(await within(sourceCard).findByRole("option", { name: "Seramik" })).toBeInTheDocument();
    expect(await within(trackedCard).findByRole("option", { name: "Seramik" })).toBeInTheDocument();

    await user.selectOptions(within(sourceCard).getByRole("combobox", { name: "Kategori" }), "cat_seramik");
    await user.selectOptions(within(trackedCard).getByLabelText(/takip kategorisi/i), "cat_seramik");

    expect(sourcePatchSpy).toHaveBeenCalledWith({ categoryId: "cat_seramik" });
    expect(trackedPatchSpy).toHaveBeenCalledWith({ categoryId: "cat_seramik" });

    const deleteCategoryButton = await screen.findByRole("button", { name: /seramik kategorisini sil/i });
    await user.click(deleteCategoryButton);
    expect(deleteCategorySpy).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /^kategoriyi sil$/i }));
    await waitFor(() => expect(deleteCategorySpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("button", { name: /seramik kategorisini sil/i })).not.toBeInTheDocument();
  });

  it("deletes a tracked Etsy link and moves a confirmed card to trash", async () => {
    const user = userEvent.setup();
    let trackingState: TrackingItem[] = [
      {
        ...trackingItems[1],
        etsyLinks: [{ id: "tracked_etsy", title: "998877665", url: "https://www.etsy.com/listing/998877665/takipsel-kupa" }],
      },
    ];
    const deleteLinkSpy = vi.fn();
    const deleteCardSpy = vi.fn();

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
        return new Response(JSON.stringify({ items: [], filters: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/owners/berke/products/prod_2/etsy-links/tracked_etsy") && method === "DELETE") {
        deleteLinkSpy();
        trackingState = trackingState.map((item) => ({ ...item, etsyLinks: [] }));
        return new Response(null, { status: 204 });
      }
      if (url.endsWith("/owners/berke/products/prod_2") && method === "DELETE") {
        deleteCardSpy();
        trackingState = [];
        return new Response(null, { status: 204 });
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

    expect(await screen.findByRole("heading", { name: /takipsel kupa/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /998877665 etsy linkini sil/i }));
    await user.click(screen.getByRole("button", { name: /^linki sil$/i }));
    await waitFor(() => expect(deleteLinkSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("link", { name: "998877665" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^kartı sil$/i }));
    await user.click(screen.getByRole("button", { name: /kartı çöp kutusuna taşı/i }));
    await waitFor(() => expect(deleteCardSpy).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole("heading", { name: /takipsel kupa/i })).not.toBeInTheDocument();
  });

});
