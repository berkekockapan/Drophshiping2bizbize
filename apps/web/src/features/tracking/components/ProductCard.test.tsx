import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductCard } from "./ProductCard";
import { renderWithProviders } from "../../../test/test-utils";

const baseItem = {
  id: "prod_1",
  ownerKey: "berke",
  trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
  title: "Oversize Hoodie",
  brand: "North Apparel",
  status: "ACTIVE",
  parseStatus: "OK",
  currentPrice: 42990,
  minPrice: 34990,
  maxPrice: 44990,
  inStockVariantCount: 12,
  totalVariantCount: 18,
  isFavorite: false,
  userCategory: null,
} as const;

describe("ProductCard", () => {
  it("renders internal links plus a Trendyol shortcut when an image exists", () => {
    const { container } = renderWithProviders(
      <ProductCard
        ownerKey="berke"
        item={{
          ...baseItem,
          thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
        }}
      />,
    );

    const card = container.querySelector("article");

    expect(card).not.toBeNull();

    if (!card) {
      throw new Error("Expected a product card article to render.");
    }

    const links = within(card).getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(within(card).getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "/owners/berke/products/prod_1",
    );
    expect(within(card).getByRole("link", { name: /^Oversize Hoodie$/i })).toHaveAttribute("href", "/owners/berke/products/prod_1");
    expect(within(card).getByRole("link", { name: /^Trendyol ürün sayfasını yeni sekmede aç: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
    );
    expect(within(card).getByRole("link", { name: /^Trendyol ürün sayfasını yeni sekmede aç: Oversize Hoodie$/i })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(within(card).getByRole("img", { name: /oversize hoodie/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );
  });

  it("keeps a stable placeholder when no thumbnail image is available", () => {
    const { container } = renderWithProviders(
      <ProductCard
        ownerKey="berke"
        item={{
          ...baseItem,
          thumbnailImage: null,
        }}
      />,
    );

    const card = container.querySelector("article");

    expect(card).not.toBeNull();

    if (!card) {
      throw new Error("Expected a product card article to render.");
    }

    expect(within(card).getAllByRole("link")).toHaveLength(3);
    expect(within(card).getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "/owners/berke/products/prod_1",
    );
    expect(within(card).getByRole("link", { name: /^Oversize Hoodie$/i })).toHaveAttribute("href", "/owners/berke/products/prod_1");
    expect(within(card).getByRole("link", { name: /^Trendyol ürün sayfasını yeni sekmede aç: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
    );
    expect(within(card).getByText("Görsel yok")).toBeInTheDocument();
    expect(within(card).queryByRole("img", { name: /oversize hoodie/i })).not.toBeInTheDocument();
  });

  it("renders favorite and delete actions on the product card", async () => {
    const user = userEvent.setup();
    const onToggleFavorite = vi.fn();
    const onDelete = vi.fn();

    renderWithProviders(
      <ProductCard
        ownerKey="berke"
        item={{
          ...baseItem,
          thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
        }}
        onToggleFavorite={onToggleFavorite}
        onDelete={onDelete}
      />,
    );

    await user.click(within(document.body).getByRole("button", { name: /favoriye ekle/i }));
    await user.click(within(document.body).getByRole("button", { name: /^sil$/i }));

    expect(onToggleFavorite).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }));
  });

  it("emits the selected category change from the product card", async () => {
    const user = userEvent.setup();
    const onCategoryChange = vi.fn();

    renderWithProviders(
      <ProductCard
        ownerKey="berke"
        item={{
          ...baseItem,
          thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
          userCategory: { id: "cat_1", name: "Bileklik" },
        }}
        categories={[
          { id: "cat_1", name: "Bileklik" },
          { id: "cat_2", name: "Bardak" },
        ]}
        onCategoryChange={onCategoryChange}
      />,
    );

    await user.selectOptions(within(document.body).getByLabelText(/takip kategorisi/i), "cat_2");
    expect(onCategoryChange).toHaveBeenCalledWith(expect.objectContaining({ id: "prod_1" }), "cat_2");
  });
});
