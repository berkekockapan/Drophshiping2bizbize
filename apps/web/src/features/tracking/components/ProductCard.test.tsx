import "@testing-library/jest-dom/vitest";
import { within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductCard } from "./ProductCard";
import { renderWithProviders } from "../../../test/test-utils";

const baseItem = {
  id: "prod_1",
  title: "Oversize Hoodie",
  brand: "North Apparel",
  status: "ACTIVE",
  parseStatus: "OK",
  currentPrice: 42990,
  minPrice: 34990,
  maxPrice: 44990,
  inStockVariantCount: 12,
  totalVariantCount: 18,
};

describe("ProductCard", () => {
  it("renders thumbnail and title as the only click targets when an image exists", () => {
    const { container } = renderWithProviders(
      <ProductCard
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
    expect(links).toHaveLength(2);
    expect(within(card).getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "/products/prod_1",
    );
    expect(within(card).getByRole("link", { name: /^Oversize Hoodie$/i })).toHaveAttribute("href", "/products/prod_1");
    expect(within(card).getByRole("img", { name: /oversize hoodie/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );
  });

  it("keeps a stable placeholder when no thumbnail image is available", () => {
    const { container } = renderWithProviders(
      <ProductCard
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

    expect(within(card).getAllByRole("link")).toHaveLength(2);
    expect(within(card).getByRole("link", { name: /^Ürün görseli: Oversize Hoodie$/i })).toHaveAttribute(
      "href",
      "/products/prod_1",
    );
    expect(within(card).getByRole("link", { name: /^Oversize Hoodie$/i })).toHaveAttribute("href", "/products/prod_1");
    expect(within(card).getByText("Görsel yok")).toBeInTheDocument();
    expect(within(card).queryByRole("img", { name: /oversize hoodie/i })).not.toBeInTheDocument();
  });
});
