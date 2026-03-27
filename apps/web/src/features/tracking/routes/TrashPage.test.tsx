import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrashPage } from "./TrashPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("TrashPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads owner trash and calls restore/hard-delete endpoints", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/owners/berke/trash") && method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "prod_1",
                ownerKey: "berke",
                title: "Oversize Hoodie",
                brand: "North Apparel",
                trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
                status: "ACTIVE",
                parseStatus: "OK",
                thumbnailImage: null,
                currentPrice: null,
                minPrice: null,
                maxPrice: null,
                inStockVariantCount: null,
                totalVariantCount: null,
                isFavorite: false,
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/trash/products/prod_1/restore") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/trash/products/prod_1") && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response(null, { status: 404 });
    });

    renderWithProviders(<TrashPage />, {
      route: "/owners/berke/trash",
      path: "/owners/:ownerKey/trash",
    });

    expect(await screen.findByText(/çöp kutusu/i)).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /geri yükle/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/trash/products/prod_1/restore"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /kalıcı sil/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/trash/products/prod_1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
