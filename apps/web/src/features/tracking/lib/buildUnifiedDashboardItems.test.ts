import { describe, expect, it } from "vitest";

import { buildUnifiedDashboardItems } from "./buildUnifiedDashboardItems";

describe("buildUnifiedDashboardItems", () => {
  it("merges source and tracked products by Trendyol source product id", () => {
    const items = buildUnifiedDashboardItems(
      [
        {
          id: "sp_1",
          ownerKey: "berke",
          title: "Kaynak Hoodie",
          sourceUrl: "https://www.trendyol.com/brand/hoodie-p-123",
          platform: "trendyol",
          notes: null,
          sourceCategory: { id: "cat_source", name: "Hoodie" },
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 1,
          linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
        },
      ],
      [
        {
          id: "prod_1",
          ownerKey: "berke",
          sourceProductId: "123",
          title: "Takip Hoodie",
          brand: "North Apparel",
          trendyolUrl: "https://www.trendyol.com/brand/hoodie-p-123",
          status: "ACTIVE",
          parseStatus: "OK",
          thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
          currentPrice: 1000,
          minPrice: 900,
          maxPrice: 1100,
          inStockVariantCount: 2,
          totalVariantCount: 3,
          isFavorite: false,
          userCategory: { id: "cat_tracking", name: "Disari Giyim" },
          shops: [{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }],
          lastCheckedAt: 123,
        },
      ],
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        title: "Kaynak Hoodie",
        brand: "North Apparel",
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
        categoryLabel: "Hoodie",
        etsyLinks: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
        assignedShops: [{ id: "shop_1", name: "Cozy Prints" }],
      }),
    );
    expect(items[0]?.sourceProduct?.id).toBe("sp_1");
    expect(items[0]?.trackedProduct?.id).toBe("prod_1");
  });

  it("keeps tracked-only products as uncategorized when no source record exists", () => {
    const items = buildUnifiedDashboardItems([], [
      {
        id: "prod_2",
        ownerKey: "berke",
        sourceProductId: null,
        title: "Tek basina takip",
        brand: null,
        trendyolUrl: "https://www.trendyol.com/brand/product-p-999",
        status: "ACTIVE",
        parseStatus: "OK",
        thumbnailImage: "https://cdn.example.com/product-1.jpg",
        currentPrice: null,
        minPrice: null,
        maxPrice: null,
        inStockVariantCount: null,
        totalVariantCount: null,
        isFavorite: false,
        userCategory: null,
        shops: [],
        lastCheckedAt: null,
      },
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        title: "Tek basina takip",
        thumbnailImage: "https://cdn.example.com/product-1.jpg",
        categoryLabel: null,
        sourceProduct: null,
        assignedShops: [],
      }),
    );
    expect(items[0]?.trackedProduct?.id).toBe("prod_2");
  });
});
