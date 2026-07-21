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
        categoryLabel: "Disari Giyim",
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
        etsyLinks: [{ id: "tracked_etsy", title: "998877665", url: "https://www.etsy.com/listing/998877665" }],
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
        etsyLinks: [{ id: "tracked_etsy", title: "998877665", url: "https://www.etsy.com/listing/998877665" }],
      }),
    );
    expect(items[0]?.trackedProduct?.id).toBe("prod_2");
  });

  it("merges source and tracked products by normalized URL when source product id cannot be extracted", () => {
    const items = buildUnifiedDashboardItems(
      [
        {
          id: "sp_link",
          ownerKey: "berke",
          title: "Linkten Gelen Urun",
          sourceUrl: "https://www.trendyol.com/sr?wb=12345&merchantId=67890",
          platform: "trendyol",
          notes: null,
          sourceCategory: null,
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      [
        {
          id: "prod_link",
          ownerKey: "berke",
          sourceProductId: null,
          title: "Takip Urunu",
          brand: "Brand X",
          trendyolUrl: "https://www.trendyol.com/sr",
          status: "ACTIVE",
          parseStatus: "OK",
          thumbnailImage: null,
          currentPrice: null,
          minPrice: null,
          maxPrice: null,
          inStockVariantCount: null,
          totalVariantCount: null,
          isFavorite: false,
          userCategory: null,
          shops: [{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }],
          lastCheckedAt: 123,
        },
      ],
    );

    expect(items).toHaveLength(1);
    expect(items[0]?.sourceProduct?.id).toBe("sp_link");
    expect(items[0]?.trackedProduct?.id).toBe("prod_link");
    expect(items[0]?.assignedShops).toEqual([{ id: "shop_1", name: "Cozy Prints" }]);
  });

  it("keeps source-level shop and category assignments when tracked record is missing", () => {
    const items = buildUnifiedDashboardItems(
      [
        {
          id: "sp_source_only",
          ownerKey: "berke",
          title: "Kaynak urun",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123",
          platform: "SHOPIER",
          notes: null,
          sourceCategory: { id: "cat_source", name: "Kaynak Kategori" },
          userCategory: { id: "cat_tracking", name: "Atama Kategorisi" },
          shops: [{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }],
          sortOrder: 0,
          deletedAt: null,
          linkedEtsyCount: 0,
          linkedEtsyItems: [],
        },
      ],
      [],
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(
      expect.objectContaining({
        categoryLabel: "Atama Kategorisi",
        trackingCategoryLabel: "Atama Kategorisi",
        assignedShops: [{ id: "shop_1", name: "Cozy Prints" }],
      }),
    );
  });
});
