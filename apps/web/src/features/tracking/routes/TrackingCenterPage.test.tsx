import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackingCenterPage } from "./TrackingCenterPage";
import { renderWithProviders } from "../../../test/test-utils";

const trackingPayload = {
  summary: {
    trackedCount: 186,
    activeCount: 183,
    reviewNeededCount: 3,
  },
  items: [
    {
      id: "prod_1",
      ownerKey: "berke",
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
      userCategory: null,
    },
    {
      id: "prod_2",
      ownerKey: "berke",
      title: "Favorite Hoodie",
      brand: "North Apparel",
      trendyolUrl: "https://www.trendyol.com/north-apparel/favorite-hoodie-p-456",
      status: "ACTIVE",
      parseStatus: "OK",
      thumbnailImage: "https://cdn.example.com/hoodie-2.jpg",
      currentPrice: 45990,
      minPrice: 35990,
      maxPrice: 46990,
      inStockVariantCount: 8,
      totalVariantCount: 9,
      isFavorite: true,
      userCategory: null,
    },
  ],
  filters: {},
};

const categoriesPayload = {
  items: [{ id: "cat_bileklik", name: "Bileklik" }],
};

describe("TrackingCenterPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders owner-scoped products and sends owner-aware requests", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(trackingPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    expect(await screen.findByText(/takipte/i)).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/products"), expect.anything());
  });

  it("switches favorites tab and uses owner-scoped favorite/delete endpoints", async () => {
    const user = userEvent.setup();
    const items = structuredClone(trackingPayload.items);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/categories")) {
        return new Response(JSON.stringify(categoriesPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/prod_1/favorite") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { isFavorite?: boolean };
        items[0].isFavorite = Boolean(body.isFavorite);
        return new Response(JSON.stringify({ productId: "prod_1", isFavorite: items[0].isFavorite }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/prod_1") && method === "DELETE") {
        items.splice(0, 1);
        return new Response(null, { status: 204 });
      }

      if (url.includes("favorite=true")) {
        return new Response(
          JSON.stringify({
            summary: trackingPayload.summary,
            items: items.filter((item) => item.isFavorite),
            filters: { favorite: true },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          summary: trackingPayload.summary,
          items,
          filters: {},
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /favoriye ekle|favoriden çıkar/i })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products/prod_1/favorite"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await user.click(screen.getAllByRole("button", { name: /^sil$/i })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products/prod_1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(confirmSpy).toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /favoriler/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/owners/berke/products?favorite=true"), expect.anything()),
    );
    expect(await screen.findByText(/favorite hoodie/i)).toBeInTheDocument();
  });

  it("loads owner-scoped categories, forwards categoryId to the list request, and opens the manager modal", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/categories") && method === "GET") {
        return new Response(JSON.stringify(categoriesPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("categoryId=cat_bileklik")) {
        return new Response(
          JSON.stringify({
            summary: trackingPayload.summary,
            items: [],
            filters: { categoryId: "cat_bileklik" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify(trackingPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<TrackingCenterPage />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    const categoryFilter = await screen.findByLabelText(/kategori filtresi/i);
    await waitFor(() => expect(within(categoryFilter).getByRole("option", { name: /bileklik/i })).toBeInTheDocument());
    await user.selectOptions(categoryFilter, "cat_bileklik");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/products?categoryId=cat_bileklik"),
        expect.anything(),
      ),
    );

    await user.click(await screen.findByRole("button", { name: /kategori yönet/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /kategorileri yönet/i })).toBeInTheDocument();
  });
});
