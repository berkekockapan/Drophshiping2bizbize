import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source product categories", () => {
  it("keeps source categories owner-scoped, assigns products, and uncategorizes on delete", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp();
    const now = Date.parse("2026-04-03T09:00:00.000Z");

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
        "Bardak referansi",
        "https://example.com/bardak",
        "https://example.com/bardak",
        "OTHER",
        "ilk not",
        null,
        0,
        null,
        null,
        now,
        now,
      );

    const createBerke = await app.request(
      "http://localhost/owners/berke/source-product-categories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Mutfak" }),
      },
      env,
    );
    const createKaan = await app.request(
      "http://localhost/owners/kaan/source-product-categories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Mutfak" }),
      },
      env,
    );

    const berkeCategory = ((await createBerke.json()) as { category: { id: string; name: string } }).category;

    const assignResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_1/category",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: berkeCategory.id }),
      },
      env,
    );
    const categoryListResponse = await app.request("http://localhost/owners/berke/source-product-categories", undefined, env);
    const deleteResponse = await app.request(
      `http://localhost/owners/berke/source-product-categories/${berkeCategory.id}`,
      { method: "DELETE" },
      env,
    );

    const sourceRowAfterDelete = sqlite
      .prepare(
        `select source_category_id as sourceCategoryId
         from source_products
         where id = ?`,
      )
      .get("sp_1") as { sourceCategoryId: string | null };

    expect(createBerke.status).toBe(201);
    expect(createKaan.status).toBe(201);
    expect(assignResponse.status).toBe(200);
    expect((await categoryListResponse.json()) as { items: Array<{ id: string; name: string }> }).toEqual({
      items: [expect.objectContaining({ id: berkeCategory.id, name: "Mutfak" })],
    });
    expect(deleteResponse.status).toBe(204);
    expect(sourceRowAfterDelete).toEqual({ sourceCategoryId: null });
  });
});
