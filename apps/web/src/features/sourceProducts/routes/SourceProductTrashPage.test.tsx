import "@testing-library/jest-dom/vitest";
import { describe, expect, it, vi } from "vitest";
import userEvent from "@testing-library/user-event";

import { renderWithProviders, screen, waitFor } from "../../../test/test-utils";
import { SourceProductTrashPage } from "./SourceProductTrashPage";

describe("SourceProductTrashPage", () => {
  it("loads source-product trash and calls restore/permanent delete endpoints", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/owners/berke/source-products/trash") && method === "GET") {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "sp_trash",
                ownerKey: "berke",
                title: "Trash urunu",
                sourceUrl: "https://example.com/trash",
                platform: "etsy",
                notes: null,
                sourceCategory: null,
                sortOrder: null,
                deletedAt: Date.now(),
                deletedReason: "user",
                linkedEtsyCount: 0,
              },
            ],
            total: 1,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/owners/berke/source-products/sp_trash/restore") && method === "POST") {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/source-products/sp_trash/permanent") && method === "DELETE") {
        return new Response(null, { status: 204 });
      }

      return new Response("Not found", { status: 404 });
    });

    renderWithProviders(<SourceProductTrashPage />, {
      route: "/owners/berke/source-products/trash",
      path: "/owners/:ownerKey/source-products/trash",
    });

    expect(await screen.findByText(/trash urunu/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /geri yükle/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products/sp_trash/restore"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /kalıcı sil/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/owners/berke/source-products/sp_trash/permanent"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
