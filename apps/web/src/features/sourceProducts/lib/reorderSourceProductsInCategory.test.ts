import { describe, expect, it } from "vitest";

import type { SourceProductItem } from "../../../app/api";
import { reorderSourceProductsInCategory } from "./reorderSourceProductsInCategory";

describe("reorderSourceProductsInCategory", () => {
  it("reorders only the targeted category bucket and leaves other sections untouched", () => {
    const items: SourceProductItem[] = [
      {
        id: "sp_1",
        ownerKey: "berke",
        title: "Birinci urun",
        sourceUrl: "https://example.com/1",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_textile", name: "Tekstil" },
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
      },
      {
        id: "sp_2",
        ownerKey: "berke",
        title: "Ikinci urun",
        sourceUrl: "https://example.com/2",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_textile", name: "Tekstil" },
        sortOrder: 1,
        deletedAt: null,
        linkedEtsyCount: 0,
      },
      {
        id: "sp_3",
        ownerKey: "berke",
        title: "Kategorisiz urun",
        sourceUrl: "https://example.com/3",
        platform: "trendyol",
        notes: null,
        sourceCategory: null,
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
      },
    ];

    expect(reorderSourceProductsInCategory(items, "cat_textile", ["sp_2", "sp_1"])).toEqual([
      expect.objectContaining({ id: "sp_2", sortOrder: 0 }),
      expect.objectContaining({ id: "sp_1", sortOrder: 1 }),
      expect.objectContaining({ id: "sp_3", sortOrder: 0 }),
    ]);
  });
});
