import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "../../../app/api";
import { renderWithProviders } from "../../../test/test-utils";
import { ProductImageGallery } from "./ProductImageGallery";

describe("ProductImageGallery", () => {
  beforeEach(() => {
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: vi.fn(() => "blob:mock-download"),
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: vi.fn(),
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the first image as the main preview and switches when a thumbnail is clicked", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ProductImageGallery
        productId="prod_1"
        title="Oversize Hoodie"
        images={["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"]}
      />,
    );

    expect(screen.getByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );

    await user.click(screen.getByRole("button", { name: /görsel 2/i }));

    expect(screen.getByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-2.jpg",
    );
  });

  it("downloads the selected image as JPG", async () => {
    const user = userEvent.setup();
    const downloadProductImage = vi.spyOn(api, "downloadProductImage").mockResolvedValue({
      blob: new Blob(["jpg"], { type: "image/jpeg" }),
      filename: "oversize-hoodie.jpg",
    });

    renderWithProviders(
      <ProductImageGallery
        productId="prod_1"
        title="Oversize Hoodie"
        images={["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /görsel 2/i }));
    await user.click(screen.getByRole("button", { name: /jpg indir/i }));

    expect(downloadProductImage).toHaveBeenCalledWith("prod_1", "https://cdn.example.com/hoodie-2.jpg");
  });

  it("shows an empty-state placeholder when there are no usable images", () => {
    renderWithProviders(<ProductImageGallery productId="prod_1" title={null} images={[" ", null, undefined]} />);

    expect(screen.getByText(/görsel bulunamadı/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /jpg indir/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
