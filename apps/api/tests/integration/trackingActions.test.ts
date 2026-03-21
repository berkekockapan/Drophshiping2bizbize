import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import type { D1Database, D1PreparedStatement, Env } from "../../src/config/bindings";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));
const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

class SQLitePreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly query: string,
    private readonly values: unknown[] = [],
  ) {}

  bind(...values: unknown[]) {
    return new SQLitePreparedStatement(this.database, this.query, values);
  }

  async first<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return (statement.get(...(this.values as any[])) as T | undefined) ?? null;
  }

  async all<T = Record<string, unknown>>() {
    const statement = this.database.prepare(this.query);
    return { results: statement.all(...(this.values as any[])) as T[] };
  }

  async run() {
    const statement = this.database.prepare(this.query);
    statement.run(...(this.values as any[]));
    return {};
  }
}

class SQLiteD1Database implements D1Database {
  constructor(private readonly database: DatabaseSync) {}

  prepare(query: string) {
    return new SQLitePreparedStatement(this.database, query);
  }
}

function createEnv() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(migrationPath, "utf8"));

  const env: Env = {
    DB: new SQLiteD1Database(sqlite),
    REFRESH_QUEUE: {
      async send() {
        return;
      },
    },
  };

  return { env, sqlite };
}

describe("tracking actions", () => {
  it("toggles favorite state and filters favorites-only tracking list", async () => {
    const { env } = createEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const favoriteProduct = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl,
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl,
        now: new Date("2026-03-20T00:05:00.000Z"),
      },
    );

    const favoriteResponse = await app.request(
      `http://localhost/tracking/products/${favoriteProduct.product.id}/favorite`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: true }),
      },
      env,
    );

    expect(favoriteResponse.status).toBe(200);
    expect(await favoriteResponse.json()).toEqual({
      productId: favoriteProduct.product.id,
      isFavorite: true,
    });

    const favoritesOnly = await app.request("http://localhost/tracking/products?favorite=true", undefined, env);
    expect(favoritesOnly.status).toBe(200);
    const favoritesJson = await favoritesOnly.json();
    expect(favoritesJson.items).toHaveLength(1);
    expect(favoritesJson.items[0]).toEqual(
      expect.objectContaining({
        id: favoriteProduct.product.id,
        isFavorite: true,
      }),
    );
  });

  it("permanently deletes a tracked product and cascades related rows", async () => {
    const { env, sqlite } = createEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl,
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const variant = sqlite
      .prepare("select id from product_variants where product_id = ? limit 1")
      .get(seeded.product.id) as { id: string };

    sqlite
      .prepare(
        `insert into notifications (id, product_id, type, severity, title, body, created_at) values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("notif_1", seeded.product.id, "MANUAL", "info", "Saved", "Saved", Date.now());

    sqlite
      .prepare(
        `insert into etsy_drafts (id, product_id, english_title, generated_version, edited_version, manual_edits_present) values (?, ?, ?, ?, ?, ?)`,
      )
      .run("draft_1", seeded.product.id, "Draft title", 1, 0, 0);

    sqlite
      .prepare(
        `insert into price_history (id, product_id, variant_id, previous_price, new_price, changed_at, change_reason) values (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run("price_1", seeded.product.id, variant.id, 1000, 1200, Date.now(), "manual");

    sqlite
      .prepare(
        `insert into stock_history (id, product_id, variant_id, previous_stock_state, new_stock_state, changed_at) values (?, ?, ?, ?, ?, ?)`,
      )
      .run("stock_1", seeded.product.id, variant.id, "OUT_OF_STOCK", "IN_STOCK", Date.now());

    const deleteResponse = await app.request(
      `http://localhost/tracking/products/${seeded.product.id}`,
      { method: "DELETE" },
      env,
    );

    expect(deleteResponse.status).toBe(204);
    expect(sqlite.prepare("select count(*) as count from products").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from product_variants").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from product_current_state").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from price_history").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from stock_history").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from notifications").get()).toEqual({ count: 0 });
    expect(sqlite.prepare("select count(*) as count from etsy_drafts").get()).toEqual({ count: 0 });
  });
});
