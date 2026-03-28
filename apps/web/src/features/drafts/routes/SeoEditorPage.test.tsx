import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";

import { renderWithProviders } from "../../../test/test-utils";
import { SeoEditorPage } from "./SeoEditorPage";

const productDetailPayload = {
  product: {
    id: "prod_1",
    ownerKey: "berke",
    trendyolUrl: "https://www.trendyol.com/example",
    sourceProductId: "123",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    userCategory: null,
    descriptionRaw: "Yumusak dokulu oversize hoodie.",
    attributes: [{ key: "Renk", value: "Siyah" }],
    images: ["https://cdn.example.com/hoodie-1.jpg"],
    status: "ACTIVE",
    parseStatus: "OK",
    lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
  },
  currentState: {
    currentPrice: 44990,
    minPrice: 34990,
    maxPrice: 44990,
    inStockVariantCount: 2,
    totalVariantCount: 3,
    lastChangeAt: Date.parse("2026-03-20T09:30:00.000Z"),
    lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
  },
  variants: [
    {
      id: "var_1",
      variantKey: "L-Siyah",
      option1: "L",
      option2: "Siyah",
      option3: null,
      trendyolUrl: "https://www.trendyol.com/example/l-siyah",
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: Date.parse("2026-03-20T10:00:00.000Z"),
      rawPayload: { stockState: "IN_STOCK" },
    },
  ],
  priceHistory: [],
  stockHistory: [],
  changeTimeline: [],
  notifications: [],
};

const draftPayload = {
  draft: {
    id: "draft_1",
    productId: "prod_1",
    englishTitle: "Draft title",
    shortDescription: "Short draft",
    longDescription: "Long draft",
    tags: [],
    materials: [],
    attributes: [],
    seoNotes: null,
    policyNotes: null,
    generatedVersion: 0,
    editedVersion: 0,
    lastGeneratedAt: null,
    manualEditsPresent: false,
  },
  prompt: null,
};

describe("SeoEditorPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("polls owner-scoped draft data and keeps the current draft visible", async () => {
    vi.useFakeTimers();
    let draftCalls = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/owners/berke/products/prod_1/draft")) {
        draftCalls += 1;
        return new Response(JSON.stringify(draftPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/prod_1") && !url.includes("/draft")) {
        return new Response(JSON.stringify(productDetailPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SeoEditorPage />, {
      route: "/owners/berke/products/prod_1/seo",
      path: "/owners/:ownerKey/products/:productId/seo",
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(draftCalls).toBe(1);
    expect(screen.getByDisplayValue(/draft title/i)).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(draftCalls).toBeGreaterThanOrEqual(2);
  });
});
