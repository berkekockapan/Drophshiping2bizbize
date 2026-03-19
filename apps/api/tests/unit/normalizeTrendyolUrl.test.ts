import { describe, expect, it } from "vitest";

import { normalizeTrendyolUrl } from "../../src/modules/tracking/normalizeTrendyolUrl";

describe("normalizeTrendyolUrl", () => {
  it("normalizes Trendyol URLs for duplicate detection", () => {
    expect(
      normalizeTrendyolUrl("https://www.trendyol.com/brand/item-p-123?boutiqueId=1&merchantId=2")
    ).toBe("https://www.trendyol.com/brand/item-p-123");
  });

  it("drops trailing slashes and hash fragments", () => {
    expect(normalizeTrendyolUrl("https://www.trendyol.com/brand/item-p-123/#reviews")).toBe(
      "https://www.trendyol.com/brand/item-p-123"
    );
  });
});
