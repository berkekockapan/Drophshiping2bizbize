import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import type { SourceProductDetailResponse } from "@trendyol-etsy/shared";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { SourceProductDetailPage } from "./SourceProductDetailPage";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const detailPayload: SourceProductDetailResponse = {
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
  etsyLinks: [
    {
      id: "etsy_1",
      sourceProductId: "src_1",
      ownerKey: "berke",
      etsyUrl: "https://www.etsy.com/listing/123456789/minimal-ceramic-mug",
      etsyUrlNormalized: "https://www.etsy.com/listing/123456789",
      etsyListingId: "123456789",
      createdAt: Date.parse("2026-04-01T12:10:00.000Z"),
    },
  ],
};

describe("SourceProductDetailPage", () => {
  it("loads the owner-scoped detail, saves edits, adds Etsy links, and removes them", async () => {
    const user = userEvent.setup();
    let currentPayload: typeof detailPayload = JSON.parse(JSON.stringify(detailPayload));

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.endsWith("/owners/berke/source-products/src_1") && method === "GET") {
        return jsonResponse(currentPayload);
      }

      if (url.endsWith("/owners/berke/source-products/src_1") && method === "PATCH") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { note?: string | null };
        currentPayload = {
          ...currentPayload,
          product: {
            ...currentPayload.product,
            note: body.note ?? null,
            updatedAt: Date.parse("2026-04-01T12:20:00.000Z"),
          },
        };
        return jsonResponse(currentPayload);
      }

      if (url.endsWith("/owners/berke/source-products/src_1/etsy-links") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { etsyUrl?: string };
        currentPayload = {
          ...currentPayload,
          etsyLinks: [
            {
              id: "etsy_2",
              sourceProductId: "src_1",
              ownerKey: "berke",
              etsyUrl: body.etsyUrl ?? "https://www.etsy.com/listing/987654321/new-listing",
              etsyUrlNormalized: "https://www.etsy.com/listing/987654321",
              etsyListingId: "987654321",
              createdAt: Date.parse("2026-04-01T12:30:00.000Z"),
            },
            ...currentPayload.etsyLinks,
          ],
        };
        return jsonResponse(currentPayload, 201);
      }

      if (url.endsWith("/owners/berke/source-products/src_1/etsy-links/etsy_1") && method === "DELETE") {
        currentPayload = {
          ...currentPayload,
          etsyLinks: currentPayload.etsyLinks.filter(
            (etsyLink) => etsyLink.id !== "etsy_1",
          ),
        };
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SourceProductDetailPage />, {
      route: "/owners/berke/source-products/src_1",
      path: "/owners/:ownerKey/source-products/:sourceProductId",
    });

    expect(await screen.findByRole("heading", { name: /minimal seramik kupa/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/kisisel not/i));
    await user.type(screen.getByLabelText(/kisisel not/i), "Guncel not");
    await user.click(screen.getByRole("button", { name: /degisiklikleri kaydet/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/owners/berke/source-products/src_1",
        expect.objectContaining({ method: "PATCH" }),
      ),
    );

    await user.type(screen.getByLabelText(/yeni etsy linki/i), "https://www.etsy.com/listing/987654321/new-listing?ref=share");
    await user.click(screen.getByRole("button", { name: /etsy linkini ekle/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/owners/berke/source-products/src_1/etsy-links",
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await user.click(screen.getByRole("button", { name: /etsy linkini sil: 123456789/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        "/owners/berke/source-products/src_1/etsy-links/etsy_1",
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
  });
});
