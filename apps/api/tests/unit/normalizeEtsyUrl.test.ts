import { describe, expect, it } from "vitest";

import { normalizeEtsyUrl } from "../../src/modules/sourceProducts/normalizeEtsyUrl";

describe("normalizeEtsyUrl", () => {
  it("canonicalizes listing URLs to the listing id form", () => {
    expect(normalizeEtsyUrl(" https://www.etsy.com/listing/123456789/sample-mug?ref=share#reviews ")).toEqual({
      normalizedUrl: "https://www.etsy.com/listing/123456789",
      listingId: "123456789",
    });
  });

  it("keeps non-listing Etsy URLs on the canonical host", () => {
    expect(normalizeEtsyUrl("http://etsy.com/shop/demo/?ref=share#top")).toEqual({
      normalizedUrl: "https://www.etsy.com/shop/demo",
      listingId: null,
    });
  });
});
