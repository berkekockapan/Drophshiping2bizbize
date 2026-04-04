import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source product trash", () => {
  it("soft-deletes, restores, and permanently deletes source products", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp();
    const now = Date.parse("2026-04-03T12:00:00.000Z");

    sqlite
      .prepare(
        `insert into source_product_categories (id, owner_key, name, created_at, updated_at)
         values (?, ?, ?, ?, ?)`,
      )
      .run("cat_mutfak", "berke", "Mutfak", now, now);

    sqlite
      .prepare(
        `insert into source_products (
          id, owner_key, source_title, source_url, source_url_normalized, source_platform, note,
          source_category_id, sort_order, deleted_at, deleted_reason, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "sp_restore",
        "berke",
        "Restore urunu",
        "https://example.com/restore",
        "https://example.com/restore",
        "OTHER",
        null,
        "cat_mutfak",
        0,
        null,
        null,
        now,
        now,
      );

    sqlite
      .prepare(
        `insert into source_product_etsy_links (
          id, owner_key, source_product_id, etsy_url, etsy_url_normalized, etsy_listing_id, created_at
        ) values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        "link_1",
        "berke",
        "sp_restore",
        "https://www.etsy.com/listing/123456789/restore",
        "https://www.etsy.com/listing/123456789",
        "123456789",
        now,
      );

    const softDeleteResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_restore",
      { method: "DELETE" },
      env,
    );
    const trashResponse = await app.request("http://localhost/owners/berke/source-products/trash", undefined, env);
    const restoreResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_restore/restore",
      { method: "POST" },
      env,
    );
    const softDeleteAgainResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_restore",
      { method: "DELETE" },
      env,
    );
    const hardDeleteResponse = await app.request(
      "http://localhost/owners/berke/source-products/sp_restore/permanent",
      { method: "DELETE" },
      env,
    );

    const sourceRowAfterDelete = sqlite
      .prepare(
        `select count(*) as count from source_products where id = ?`,
      )
      .get("sp_restore") as { count: number };
    const linkRowAfterDelete = sqlite
      .prepare(
        `select count(*) as count from source_product_etsy_links where source_product_id = ?`,
      )
      .get("sp_restore") as { count: number };

    expect(softDeleteResponse.status).toBe(204);
    expect((await trashResponse.json()) as { items: Array<{ id: string }>; total: number }).toEqual({
      items: [expect.objectContaining({ id: "sp_restore" })],
      total: 1,
    });
    expect(restoreResponse.status).toBe(200);
    expect(softDeleteAgainResponse.status).toBe(204);
    expect(hardDeleteResponse.status).toBe(204);
    expect(sourceRowAfterDelete).toEqual({ count: 0 });
    expect(linkRowAfterDelete).toEqual({ count: 0 });
  });
});
