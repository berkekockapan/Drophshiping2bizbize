import { describe, expect, it } from "vitest";

import { normalizeSourceProductUrl } from "../../src/modules/sourceProducts/normalizeSourceProductUrl";

describe("normalizeSourceProductUrl", () => {
  it("trims whitespace, drops hash, lowercases host, and sorts query params", () => {
    expect(
      normalizeSourceProductUrl(" https://Shopier.com/ShowProductNew/products.php?id=123&campaign=b#hero "),
    ).toBe("https://shopier.com/ShowProductNew/products.php?campaign=b&id=123");
  });

  it("removes trailing slashes from non-root paths", () => {
    expect(normalizeSourceProductUrl("https://example.com/path/")).toBe("https://example.com/path");
  });
});
