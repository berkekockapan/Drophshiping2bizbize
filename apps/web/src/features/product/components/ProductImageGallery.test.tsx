import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProductImageGallery } from "./ProductImageGallery";

describe("ProductImageGallery", () => {
  it("uses the first image as the main preview and switches when a thumbnail is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ProductImageGallery
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

  it("shows an empty-state placeholder when there are no usable images", () => {
    render(<ProductImageGallery title={null} images={[" ", null, undefined]} />);

    expect(screen.getByText(/görsel bulunamadı/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
