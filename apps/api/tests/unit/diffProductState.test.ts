import { describe, expect, it } from "vitest";

import { diffProductState, type PreviousProductSnapshot } from "../../src/modules/sync/diffProductState";

function createPreviousSnapshot(overrides: Partial<PreviousProductSnapshot> = {}): PreviousProductSnapshot {
  return {
    productId: "prod_1",
    title: "North Apparel Oversize Hoodie",
    descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
    imagesRaw: JSON.stringify([
      "https://cdn.example.com/hoodie-1.jpg",
      "https://cdn.example.com/hoodie-2.jpg",
    ]),
    currentState: {
      currentPrice: 42990,
      minPrice: 34900,
      maxPrice: 42900,
      lastChangeAt: 1_710_000_000_000,
      lastCheckedAt: 1_710_000_000_000,
    },
    variants: [
      {
        id: "variant_1",
        variantKey: "S-Siyah",
        option1: "S",
        option2: "Siyah",
        option3: null,
        currentStockState: "IN_STOCK",
        currentPrice: 42990,
      },
      {
        id: "variant_2",
        variantKey: "M-Siyah",
        option1: "M",
        option2: "Siyah",
        option3: null,
        currentStockState: "IN_STOCK",
        currentPrice: 42990,
      },
    ],
    ...overrides,
  };
}

describe("diffProductState", () => {
  it("updates min and max price without duplicating unchanged price history", () => {
    const result = diffProductState(
      createPreviousSnapshot(),
      {
        productId: "prod_1",
        title: "North Apparel Oversize Hoodie",
        descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
        imagesRaw: JSON.stringify([
          "https://cdn.example.com/hoodie-1.jpg",
          "https://cdn.example.com/hoodie-2.jpg",
        ]),
        price: 42990,
        checkedAt: 1_710_000_500_000,
        variants: [
          {
            variantKey: "S-Siyah",
            option1: "S",
            option2: "Siyah",
            option3: null,
            stockState: "IN_STOCK",
            price: 42990,
            rawPayload: {},
          },
          {
            variantKey: "M-Siyah",
            option1: "M",
            option2: "Siyah",
            option3: null,
            stockState: "IN_STOCK",
            price: 42990,
            rawPayload: {},
          },
        ],
      },
    );

    expect(result.priceHistory).toHaveLength(0);
    expect(result.contentHistory).toHaveLength(0);
    expect(result.changedFields).toEqual([]);
    expect(result.currentState.minPrice).toBe(34900);
    expect(result.currentState.maxPrice).toBe(42990);
    expect(result.currentState.lastChangeAt).toBe(1_710_000_000_000);
  });

  it("creates stock history only when a variant state changes", () => {
    const result = diffProductState(
      createPreviousSnapshot(),
      {
        productId: "prod_1",
        title: "North Apparel Oversize Hoodie",
        descriptionRaw: "Soft brushed cotton hoodie with relaxed fit.",
        imagesRaw: JSON.stringify([
          "https://cdn.example.com/hoodie-1.jpg",
          "https://cdn.example.com/hoodie-2.jpg",
        ]),
        price: 39990,
        checkedAt: 1_710_000_900_000,
        variants: [
          {
            variantKey: "S-Siyah",
            option1: "S",
            option2: "Siyah",
            option3: null,
            stockState: "IN_STOCK",
            price: 39990,
            rawPayload: {},
          },
          {
            variantKey: "M-Siyah",
            option1: "M",
            option2: "Siyah",
            option3: null,
            stockState: "OUT_OF_STOCK",
            price: 39990,
            rawPayload: {},
          },
        ],
      },
    );

    expect(result.priceHistory).toEqual([
      expect.objectContaining({
        previousPrice: 42990,
        newPrice: 39990,
        changeReason: "PRODUCT_PRICE_CHANGED",
      }),
    ]);
    expect(result.stockHistory).toEqual([
      expect.objectContaining({
        variantId: "variant_2",
        previousStockState: "IN_STOCK",
        newStockState: "OUT_OF_STOCK",
      }),
    ]);
    expect(result.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "PRICE_DECREASED" }),
        expect.objectContaining({ type: "OUT_OF_STOCK" }),
      ]),
    );
    expect(result.changedFields).toEqual(expect.arrayContaining(["PRODUCT_PRICE", "VARIANT_STOCK"]));
    expect(result.currentState.minPrice).toBe(34900);
    expect(result.currentState.maxPrice).toBe(42900);
    expect(result.currentState.lastChangeAt).toBe(1_710_000_900_000);
  });
});
