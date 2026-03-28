import { describe, expect, it } from "vitest";

import { parseListingPackResult } from "../../src/modules/etsyPrep/prompts/parseListingPackResult";

describe("parseListingPackResult", () => {
  it("normalizes comma-separated tags and rejects non-string tags", () => {
    expect(
      parseListingPackResult(
        JSON.stringify({
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: "oversize hoodie, streetwear gift, oversize hoodie",
        }),
      ),
    ).toEqual({
      title: "Handmade Oversize Hoodie",
      description: "Soft cotton hoodie for everyday wear.",
      tags: "oversize hoodie, streetwear gift",
    });

    expect(() =>
      parseListingPackResult(
        JSON.stringify({
          title: "Handmade Oversize Hoodie",
          description: "Soft cotton hoodie for everyday wear.",
          tags: ["oversize hoodie"],
        }),
      ),
    ).toThrow(/tags/i);
  });
});
