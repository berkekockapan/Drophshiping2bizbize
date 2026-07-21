import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

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
  assignedShops: [{ id: "shop_1", name: "Cozy Prints" }],
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
    shops: [{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }],
    lastCheckedAt: 1710000000000,
  },
};

const categories = [
  { id: "cat_tracking", name: "Dis Giyim" },
  { id: "cat_home", name: "Ev Dekor" },
];

describe("UnifiedDashboardCard", () => {
  it("renders the tracked thumbnail in the unified product card", () => {
    const { container } = renderWithProviders(
      <UnifiedDashboardCard
        ownerKey="berke"
        item={baseItem}
        shops={[{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }]}
        categories={categories}
        showAssignedShopLabel
        onAssignShop={() => {}}
        onCategoryChange={() => {}}
        onAddEtsyLink={async () => {}}
        onDeleteEtsyLink={async () => {}}
        onDeleteCard={async () => {}}
      />,
      {
        route: "/owners/berke/products",
        path: "/owners/:ownerKey/products",
      },
    );

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
    expect(within(card).getByText(/etsy mağazası: cozy prints/i)).toBeInTheDocument();
  });

  it("shows a stable placeholder when no thumbnail is available", () => {
    const item: UnifiedDashboardItem = {
      ...baseItem,
      key: "item_2",
      title: "Kaynak Canta",
      thumbnailImage: null,
      platform: "trendyol-milla",
      etsyLinks: [],
      assignedShops: [],
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

    const { container } = renderWithProviders(
      <UnifiedDashboardCard
        ownerKey="berke"
        item={item}
        shops={[{ id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null }]}
        categories={categories}
        showAssignedShopLabel
        onAssignShop={() => {}}
        onCategoryChange={() => {}}
        onAddEtsyLink={async () => {}}
        onDeleteEtsyLink={async () => {}}
        onDeleteCard={async () => {}}
      />,
      {
        route: "/owners/berke/products",
        path: "/owners/:ownerKey/products",
      },
    );

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

  it("triggers shop assignment when a different shop is selected", async () => {
    const user = userEvent.setup();
    const onAssignShop = vi.fn();

    renderWithProviders(
      <UnifiedDashboardCard
        ownerKey="berke"
        item={baseItem}
        shops={[
          { id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://www.etsy.com/shop/cozy-prints", description: null },
          { id: "shop_2", name: "Nordic Lane", etsyShopUrl: "https://www.etsy.com/shop/nordic-lane", description: null },
        ]}
        categories={categories}
        showAssignedShopLabel={false}
        onAssignShop={onAssignShop}
        onCategoryChange={() => {}}
        onAddEtsyLink={async () => {}}
        onDeleteEtsyLink={async () => {}}
        onDeleteCard={async () => {}}
      />,
      {
        route: "/owners/berke/products",
        path: "/owners/:ownerKey/products",
      },
    );

    await user.selectOptions(within(document.body).getByLabelText(/etsy mağazası/i), "shop_2");

    expect(onAssignShop).toHaveBeenCalledWith(expect.objectContaining({ key: "item_1" }), "shop_2");
  });

  it("adds an Etsy link from inside the product card", async () => {
    const user = userEvent.setup();
    const onAddEtsyLink = vi.fn(async () => {});

    renderWithProviders(
      <UnifiedDashboardCard
        ownerKey="berke"
        item={{ ...baseItem, etsyLinks: [], sourceProduct: null }}
        shops={[]}
        categories={categories}
        showAssignedShopLabel
        onAssignShop={() => {}}
        onCategoryChange={() => {}}
        onAddEtsyLink={onAddEtsyLink}
        onDeleteEtsyLink={async () => {}}
        onDeleteCard={async () => {}}
      />,
      {
        route: "/owners/berke/products",
        path: "/owners/:ownerKey/products",
      },
    );

    await user.click(within(document.body).getByRole("button", { name: /^etsy linki ekle$/i }));
    await user.type(within(document.body).getByLabelText(/etsy ürün linki/i), "https://www.etsy.com/listing/998877665/item");
    await user.click(within(document.body).getByRole("button", { name: /etsy linkini kaydet/i }));

    expect(onAddEtsyLink).toHaveBeenCalledWith(
      expect.objectContaining({ trackedProduct: expect.objectContaining({ id: "prod_1" }) }),
      "https://www.etsy.com/listing/998877665/item",
    );
  });

  it("requires confirmation before deleting an Etsy link or the card", async () => {
    const user = userEvent.setup();
    const onDeleteEtsyLink = vi.fn(async () => {});
    const onDeleteCard = vi.fn(async () => {});

    renderWithProviders(
      <UnifiedDashboardCard
        ownerKey="berke"
        item={baseItem}
        shops={[]}
        categories={categories}
        showAssignedShopLabel
        onAssignShop={() => {}}
        onCategoryChange={() => {}}
        onAddEtsyLink={async () => {}}
        onDeleteEtsyLink={onDeleteEtsyLink}
        onDeleteCard={onDeleteCard}
      />,
      {
        route: "/owners/berke/products",
        path: "/owners/:ownerKey/products",
      },
    );

    await user.click(within(document.body).getByRole("button", { name: /123456789 etsy linkini sil/i }));
    expect(onDeleteEtsyLink).not.toHaveBeenCalled();
    await user.click(within(document.body).getByRole("button", { name: /^linki sil$/i }));
    expect(onDeleteEtsyLink).toHaveBeenCalledWith(
      expect.objectContaining({ key: "item_1" }),
      expect.objectContaining({ id: "etsy_1" }),
    );

    await user.click(within(document.body).getByRole("button", { name: /^kartı sil$/i }));
    expect(onDeleteCard).not.toHaveBeenCalled();
    await user.click(within(document.body).getByRole("button", { name: /kartı çöp kutusuna taşı/i }));
    expect(onDeleteCard).toHaveBeenCalledWith(expect.objectContaining({ key: "item_1" }));
  });
});
