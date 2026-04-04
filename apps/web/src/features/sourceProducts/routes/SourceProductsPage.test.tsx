import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { SourceProductsPage } from "./SourceProductsPage";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("SourceProductsPage", () => {
  it("lists source products, submits the create form, and sends owner-scoped search queries", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/owners/berke/source-products") && (!init?.method || init.method === "GET")) {
        return jsonResponse({ items: [], total: 0 });
      }

      if (url.endsWith("/owners/berke/source-products") && init?.method === "POST") {
        return jsonResponse(
          {
            product: {
              id: "src_1",
              ownerKey: "berke",
              sourceTitle: "Minimal seramik kupa",
              sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
              sourcePlatform: "SHOPIER",
              note: "Ilk Etsy denemesi icin saklandi",
              createdAt: Date.parse("2026-04-01T12:00:00.000Z"),
              updatedAt: Date.parse("2026-04-01T12:00:00.000Z"),
            },
            etsyLinks: [],
          },
          201,
        );
      }

      if (url.includes("/owners/berke/source-products?search=123456789")) {
        return jsonResponse({
          items: [
            {
              id: "src_1",
              ownerKey: "berke",
              sourceTitle: "Minimal seramik kupa",
              sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
              sourcePlatform: "SHOPIER",
              notePreview: "Ilk Etsy denemesi icin saklandi",
              etsyLinkCount: 1,
              updatedAt: Date.parse("2026-04-01T12:00:00.000Z"),
            },
          ],
          total: 1,
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SourceProductsPage />, {
      route: "/owners/berke/source-products",
      path: "/owners/:ownerKey/source-products",
    });

    expect(await screen.findByRole("heading", { name: /kaynak urunler/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/kaynak baslik/i), "Minimal seramik kupa");
    await user.type(screen.getByLabelText(/kaynak link/i), "https://shopier.com/ShowProductNew/products.php?id=123");
    await user.selectOptions(screen.getByLabelText(/kaynak platformu/i), "SHOPIER");
    await user.type(screen.getByLabelText(/kisisel not/i), "Ilk Etsy denemesi icin saklandi");
    await user.click(screen.getByRole("button", { name: /kaynak urunu kaydet/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/owners/berke/source-products",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            sourceTitle: "Minimal seramik kupa",
            sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
            sourcePlatform: "SHOPIER",
            note: "Ilk Etsy denemesi icin saklandi",
          }),
        }),
      ),
    );

    await user.type(screen.getByLabelText(/arama/i), "123456789");
    await user.click(screen.getByRole("button", { name: /ara/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/owners/berke/source-products?search=123456789",
        expect.anything(),
      ),
    );

    expect(await screen.findByText(/minimal seramik kupa/i)).toBeInTheDocument();
  });
});
