import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "../../../test/test-utils";
import { SourceProductsPage } from "./SourceProductsPage";

describe("SourceProductsPage", () => {
  it("renders source products in category sections, filters by category, and opens the category manager", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/source-product-categories") && method === "GET") {
        return new Response(JSON.stringify({ items: [{ id: "cat_textile", name: "Tekstil" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("categoryId=cat_textile")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "sp_1",
                ownerKey: "berke",
                title: "Bez canta",
                sourceUrl: "https://example.com/canta",
                platform: "etsy",
                notes: null,
                sourceCategory: { id: "cat_textile", name: "Tekstil" },
                sortOrder: 0,
                deletedAt: null,
                linkedEtsyCount: 1,
                linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://etsy.com/listing/123456789" }],
              },
            ],
            filters: { categoryId: "cat_textile" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/source-products")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "sp_1",
                ownerKey: "berke",
                title: "Bez canta",
                sourceUrl: "https://example.com/canta",
                platform: "etsy",
                notes: null,
                sourceCategory: { id: "cat_textile", name: "Tekstil" },
                sortOrder: 0,
                deletedAt: null,
                linkedEtsyCount: 1,
                linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://etsy.com/listing/123456789" }],
              },
              {
                id: "sp_2",
                ownerKey: "berke",
                title: "Seramik kupa",
                sourceUrl: "https://example.com/kupa",
                platform: "trendyol",
                notes: "not",
                sourceCategory: null,
                sortOrder: 0,
                deletedAt: null,
                linkedEtsyCount: 0,
                linkedEtsyItems: [],
              },
            ],
            filters: {},
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<SourceProductsPage />, {
      route: "/owners/berke/source-products",
      path: "/owners/:ownerKey/source-products",
    });

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products"),
        expect.anything(),
      ),
    );

    expect(await screen.findByRole("heading", { name: /kaynak ürünler/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /tekstil/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /kategorisiz/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/kategori filtresi/i), "cat_textile");
    expect(await screen.findByText(/bez canta/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /kategori yönet/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("submits the source-product form", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/source-product-categories") && method === "GET") {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.endsWith("/owners/berke/source-products") && method === "POST") {
        return new Response(
          JSON.stringify({
            product: {
              id: "sp_new",
              ownerKey: "berke",
              sourceTitle: "Yeni urun",
              sourceUrl: "https://example.com/yeni",
              sourcePlatform: "SHOPIER",
              note: "not",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            etsyLinks: [],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/source-products") && method === "GET") {
        return new Response(JSON.stringify({ items: [], filters: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<SourceProductsPage />, {
      route: "/owners/berke/source-products",
      path: "/owners/:ownerKey/source-products",
    });

    await user.type(screen.getByLabelText(/kaynak baslik/i), "Yeni urun");
    await user.type(screen.getByLabelText(/kaynak link/i), "https://example.com/yeni");
    await user.selectOptions(screen.getByLabelText(/kaynak platformu/i), "SHOPIER");
    await user.type(screen.getByLabelText(/kisisel not/i), "not");
    await user.click(screen.getByRole("button", { name: /kaynak urunu kaydet/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sourceTitle: "Yeni urun",
            sourceUrl: "https://example.com/yeni",
            sourcePlatform: "SHOPIER",
            note: "not",
          }),
        }),
      ),
    );
  });
});
