import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source product assignments", () => {
  it("updates source-product shop and product-category assignments", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp();
    const now = Date.parse("2026-04-10T09:00:00.000Z");

    sqlite
      .prepare(
        `insert into source_products (
          id, owner_key, source_title, source_url, source_url_normalized, source_platform, note,
          source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "sp_1",
        "berke",
        "Kaynak urun",
        "https://shopier.com/ShowProductNew/products.php?id=123",
        "https://shopier.com/ShowProductNew/products.php?id=123",
        "SHOPIER",
        null,
        null,
        0,
        null,
        null,
        now,
        now,
      );

    sqlite
      .prepare(
        `insert into etsy_shops (id, owner_key, name, etsy_shop_url, description, created_at, updated_at)
         values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("shop_1", "berke", "Cozy Prints", "https://www.etsy.com/shop/cozyprints", null, now, now);

    sqlite
      .prepare(
        `insert into product_categories (id, owner_key, name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      )
      .run("cat_home", "berke", "Ev Dekor", now, now);

    const updateShopsResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_1/etsy-shops",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopIds: ["shop_1"] }),
      },
      env,
    );

    expect(updateShopsResponse.status).toBe(200);
    expect((await updateShopsResponse.json()) as { sourceProductId: string; shops: Array<{ id: string }> }).toEqual(
      expect.objectContaining({
        sourceProductId: "sp_1",
        shops: [expect.objectContaining({ id: "shop_1" })],
      }),
    );

    const updateCategoryResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_1/product-category",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: "cat_home" }),
      },
      env,
    );

    expect(updateCategoryResponse.status).toBe(200);
    expect((await updateCategoryResponse.json()) as { sourceProductId: string; userCategory: { id: string } }).toEqual(
      expect.objectContaining({
        sourceProductId: "sp_1",
        userCategory: expect.objectContaining({ id: "cat_home" }),
      }),
    );

    const listResponse = await app.request("http://localhost/owners/berke/source-products", undefined, env);
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()) as { items: Array<{ id: string; shops: Array<{ id: string }>; userCategory: { id: string } | null }> }).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: "sp_1",
            shops: [expect.objectContaining({ id: "shop_1" })],
            userCategory: expect.objectContaining({ id: "cat_home" }),
          }),
        ],
      }),
    );
  });
});
