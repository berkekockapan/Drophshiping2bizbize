import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductShopAssignmentPanel } from "./ProductShopAssignmentPanel";

describe("ProductShopAssignmentPanel", () => {
  it("shows a required confirmation dialog when adding a product to a second shop", async () => {
    const onSave = vi.fn();

    render(
      <ProductShopAssignmentPanel
        shops={[
          { id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://etsy.com/shop/cozyprints", description: null },
          { id: "shop_2", name: "Poster Lab", etsyShopUrl: "https://etsy.com/shop/posterlab", description: null },
        ]}
        assignedShops={[
          { id: "shop_1", name: "Cozy Prints", etsyShopUrl: "https://etsy.com/shop/cozyprints", description: null },
        ]}
        onSave={onSave}
      />,
    );

    fireEvent.click(screen.getByLabelText(/poster lab/i));
    fireEvent.click(screen.getByRole("button", { name: /mağazaları kaydet/i }));

    expect(screen.getByRole("dialog", { name: /ürün birden fazla mağazaya eklenecek/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /devam et/i }));

    expect(onSave).toHaveBeenCalledWith(["shop_1", "shop_2"]);
  });
});
