import "@testing-library/jest-dom/vitest";
import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { UnifiedDashboardCard } from "./UnifiedDashboardCard";
import type { UnifiedDashboardItem } from "../lib/buildUnifiedDashboardItems";
import { renderWithProviders } from "../../../test/test-utils";

const baseItem: UnifiedDashboardItem = {
  key: "item_1",
  title: "Oversize Hoodie",
  brand: "North Apparel",
  thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
  sourceUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
  platform: "trendyol",
  categoryLabel: "Dis Giyim",
  categoryKey: "dis-giyim",
  sourceCategoryLabel: "Hoodie",
  trackingCategoryLabel: "Dis Giyim",
  etsyLinks: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
  sourceProduct: {
    id: "sp_1",
    ownerKey: "berke",
    title: "Oversize Hoodie",
    sourceUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
    platform: "trendyol",
    notes: null,
    sourceCategory: { id: "cat_source", name: "Hoodie" },
    sortOrder: 0,
    deletedAt: null,
    linkedEtsyCount: 1,
    linkedEtsyItems: [{ id: "etsy_1", title: "123456789", url: "https://www.etsy.com/listing/123456789" }],
  },
  trackedProduct: {
    id: "prod_1",
    ownerKey: "berke",
    sourceProductId: "123",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
    status: "ACTIVE",
    parseStatus: "OK",
    thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
    currentPrice: 42990,
    minPrice: 34990,
    maxPrice: 44990,
    inStockVariantCount: 12,
    totalVariantCount: 18,
    isFavorite: false,
    userCategory: { id: "cat_tracking", name: "Dis Giyim" },
    lastCheckedAt: 1710000000000,
  },
};

describe("UnifiedDashboardCard", () => {
  it("renders the tracked thumbnail in the unified product card", () => {
    const { container } = renderWithProviders(<UnifiedDashboardCard ownerKey="berke" item={baseItem} />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    const card = container.querySelector("article");

    expect(card).not.toBeNull();

    if (!card) {
      throw new Error("Expected a unified dashboard card article to render.");
    }

    expect(within(card).getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "/owners/berke/products/prod_1",
    );
    expect(within(card).getByRole("img", { name: /oversize hoodie/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );
  });

  it("shows a stable placeholder when no thumbnail is available", () => {
    const item: UnifiedDashboardItem = {
      ...baseItem,
      key: "item_2",
      title: "Kaynak Canta",
      thumbnailImage: null,
      platform: "trendyol-milla",
      etsyLinks: [],
      sourceProduct: {
        id: "sp_2",
        ownerKey: "berke",
        title: "Kaynak Canta",
        sourceUrl: "https://www.trendyol.com/milla/bag-p-456",
        platform: "trendyol-milla",
        notes: null,
        sourceCategory: { id: "cat_source", name: "Hoodie" },
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
      trackedProduct: null,
      sourceUrl: "https://www.trendyol.com/milla/bag-p-456",
      brand: null,
      trackingCategoryLabel: null,
    };

    const { container } = renderWithProviders(<UnifiedDashboardCard ownerKey="berke" item={item} />, {
      route: "/owners/berke/products",
      path: "/owners/:ownerKey/products",
    });

    const card = container.querySelector("article");

    expect(card).not.toBeNull();

    if (!card) {
      throw new Error("Expected a unified dashboard card article to render.");
    }

    expect(within(card).getByRole("link", { name: /^Ürün görseli: Kaynak Canta$/i })).toHaveAttribute(
      "href",
      "/owners/berke/source-products/sp_2",
    );
    expect(within(card).getByText("Görsel yok")).toBeInTheDocument();
    expect(within(card).queryByRole("img", { name: /kaynak canta/i })).not.toBeInTheDocument();
  });
});
