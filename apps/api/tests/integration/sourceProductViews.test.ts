import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source product views", () => {
  it("returns owner-scoped source-product list, detail, and trash views with category metadata", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp();
    const now = Date.parse("2026-04-03T13:00:00.000Z");

    sqlite
      .prepare(
        `insert into source_product_categories (id, owner_key, name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      )
      .run("cat_textile", "berke", "Tekstil", now, now);

    sqlite
      .prepare(
        `insert into source_products (
          id, owner_key, title, source_url, platform, notes,
          source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("sp_1", "berke", "Kumas canta", "https://example.com/canta", "etsy", "detay notu", "cat_textile", 0, null, null, now, now);

    sqlite
      .prepare(
        `insert into source_products (
          id, owner_key, title, source_url, platform, notes,
          source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("sp_2", "kaan", "Kaan urunu", "https://example.com/kaan", "trendyol", null, null, 0, null, null, now, now);

    sqlite
      .prepare(
        `insert into source_products (
          id, owner_key, title, source_url, platform, notes,
          source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("sp_trash", "berke", "Cop urunu", "https://example.com/cop", "etsy", null, null, null, now, "user", now, now);

    const listResponse = await app.request("http://localhost/owners/berke/source-products", undefined, env);
    const detailResponse = await app.request("http://localhost/owners/berke/source-products/sp_1", undefined, env);
    const trashResponse = await app.request("http://localhost/owners/berke/source-products/trash", undefined, env);
    const kaanListResponse = await app.request("http://localhost/owners/kaan/source-products", undefined, env);

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(trashResponse.status).toBe(200);
    expect(kaanListResponse.status).toBe(200);

    expect((await listResponse.json()) as { items: unknown[]; filters: Record<string, unknown> }).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: "sp_1", sourceCategory: { id: "cat_textile", name: "Tekstil" }, sortOrder: 0 })],
      }),
    );
    expect((await detailResponse.json()) as { sourceProduct: { deletedAt: null; sourceCategory: unknown } }).toEqual(
      expect.objectContaining({
        sourceProduct: expect.objectContaining({
          id: "sp_1",
          sourceCategory: { id: "cat_textile", name: "Tekstil" },
          sortOrder: 0,
          deletedAt: null,
        }),
      }),
    );
    expect((await trashResponse.json()) as { items: Array<{ id: string }>; total: number }).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: "sp_trash" })],
        total: 1,
      }),
    );
    expect((await kaanListResponse.json()) as { items: Array<{ id: string }>; filters: Record<string, unknown> }).toEqual(
      expect.objectContaining({
        items: [expect.objectContaining({ id: "sp_2" })],
      }),
    );
  });
});
