import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "../../../test/test-utils";
import { SourceProductDetailPage } from "./SourceProductDetailPage";

describe("SourceProductDetailPage", () => {
  it("updates the source-product category and adds an Etsy link from the detail page", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/source-product-categories") && method === "GET") {
        return new Response(JSON.stringify({ items: [{ id: "cat_textile", name: "Tekstil" }] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products/sp_1/category") && method === "PATCH") {
        return new Response(
          JSON.stringify({ sourceProductId: "sp_1", sourceCategory: { id: "cat_textile", name: "Tekstil" } }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      if (url.includes("/owners/berke/source-products/sp_1/etsy-links") && method === "POST") {
        return new Response(
          JSON.stringify({
            product: {
              id: "sp_1",
              ownerKey: "berke",
              sourceTitle: "Detail urunu",
              sourceUrl: "https://example.com/detail",
              sourcePlatform: "SHOPIER",
              note: "not",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
            etsyLinks: [
              {
                id: "etsy_1",
                sourceProductId: "sp_1",
                ownerKey: "berke",
                etsyUrl: "https://www.etsy.com/listing/123456789/detail-item",
                etsyUrlNormalized: "https://www.etsy.com/listing/123456789",
                etsyListingId: "123456789",
                createdAt: Date.now(),
              },
            ],
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/source-products/sp_1") && method === "GET") {
        return new Response(
          JSON.stringify({
            sourceProduct: {
              id: "sp_1",
              ownerKey: "berke",
              title: "Detail urunu",
              sourceUrl: "https://example.com/detail",
              platform: "etsy",
              notes: "not",
              sourceCategory: null,
              sortOrder: 0,
              deletedAt: null,
              deletedReason: null,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              linkedEtsyCount: 0,
              linkedEtsyItems: [],
            },
            linkedEtsyItems: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<SourceProductDetailPage />, {
      route: "/owners/berke/source-products/sp_1",
      path: "/owners/:ownerKey/source-products/:sourceProductId",
    });

    await user.selectOptions(await screen.findByLabelText(/kaynak ürün kategorisi/i), "cat_textile");
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products/sp_1/category"),
        expect.objectContaining({ method: "PATCH" }),
      ),
    );

    await user.type(screen.getByLabelText(/etsy linki ekle/i), "https://www.etsy.com/listing/123456789/detail-item");
    await user.click(screen.getByRole("button", { name: /^kaydet$/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products/sp_1/etsy-links"),
        expect.objectContaining({ method: "POST" }),
      ),
    );
  }, 15000);
});
