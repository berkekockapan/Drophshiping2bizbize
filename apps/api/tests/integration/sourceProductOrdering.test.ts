import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source product ordering", () => {
  it("only reorders active source products within the same category", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp();
    const now = Date.parse("2026-04-03T11:00:00.000Z");

    sqlite
      .prepare(
        `insert into source_product_categories (id, owner_key, name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      )
      .run("cat_mutfak", "berke", "Mutfak", now, now);

    for (const [id, sortOrder] of [
      ["sp_1", 0],
      ["sp_2", 1],
      ["sp_3", 2],
    ] as const) {
      sqlite
        .prepare(
          `insert into source_products (
            id, owner_key, title, source_url, platform, notes,
            source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(id, "berke", id, `https://example.com/${id}`, "trendyol", null, "cat_mutfak", sortOrder, null, null, now, now);
    }

    const reorderResponse = await app.request(
      "http://localhost/owners/berke/source-products/reorder",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: "cat_mutfak", orderedIds: ["sp_3", "sp_1", "sp_2"] }),
      },
      env,
    );

    const rows = sqlite
      .prepare(
        `select id, sort_order as sortOrder
         from source_products
         where owner_key = ?
         order by sort_order asc`,
      )
      .all("berke") as Array<{ id: string; sortOrder: number }>;

    expect(reorderResponse.status).toBe(200);
    expect(rows).toEqual([
      { id: "sp_3", sortOrder: 0 },
      { id: "sp_1", sortOrder: 1 },
      { id: "sp_2", sortOrder: 2 },
    ]);
  });
});
