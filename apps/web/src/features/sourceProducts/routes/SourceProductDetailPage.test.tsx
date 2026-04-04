import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "../../../test/test-utils";
import { SourceProductDetailPage } from "./SourceProductDetailPage";

describe("SourceProductDetailPage", () => {
  it("updates the source-product category from the detail page", async () => {
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
  });
});
