import { describe, expect, it } from "vitest";

import type { SourceProductItem } from "../../../app/api";
import { groupSourceProductsByCategory } from "./groupSourceProductsByCategory";

describe("groupSourceProductsByCategory", () => {
  it("orders sections by category name and keeps uncategorized last", () => {
    const items: SourceProductItem[] = [
      {
        id: "sp_1",
        ownerKey: "berke",
        title: "Kumas canta",
        sourceUrl: "https://example.com/1",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_textile", name: "Tekstil" },
        sortOrder: 1,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
      {
        id: "sp_2",
        ownerKey: "berke",
        title: "Seramik kupa",
        sourceUrl: "https://example.com/2",
        platform: "trendyol",
        notes: null,
        sourceCategory: null,
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
      {
        id: "sp_3",
        ownerKey: "berke",
        title: "Bez torba",
        sourceUrl: "https://example.com/3",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_home", name: "Ev" },
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
    ];

    expect(groupSourceProductsByCategory(items, null).map((section) => section.title)).toEqual(["Ev", "Tekstil", "Kategorisiz"]);
  });

  it("filters to the selected category bucket", () => {
    const items: SourceProductItem[] = [
      {
        id: "sp_1",
        ownerKey: "berke",
        title: "Bir",
        sourceUrl: "https://example.com/1",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_textile", name: "Tekstil" },
        sortOrder: 1,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
      {
        id: "sp_2",
        ownerKey: "berke",
        title: "Iki",
        sourceUrl: "https://example.com/2",
        platform: "etsy",
        notes: null,
        sourceCategory: { id: "cat_textile", name: "Tekstil" },
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
      {
        id: "sp_3",
        ownerKey: "berke",
        title: "Uc",
        sourceUrl: "https://example.com/3",
        platform: "etsy",
        notes: null,
        sourceCategory: null,
        sortOrder: 0,
        deletedAt: null,
        linkedEtsyCount: 0,
        linkedEtsyItems: [],
      },
    ];

    expect(groupSourceProductsByCategory(items, "cat_textile")).toHaveLength(1);
    expect(groupSourceProductsByCategory(items, "cat_textile")[0]?.items.map((item) => item.id)).toEqual(["sp_2", "sp_1"]);
    expect(groupSourceProductsByCategory(items, "uncategorized")[0]?.items.map((item) => item.id)).toEqual(["sp_3"]);
  });
});
