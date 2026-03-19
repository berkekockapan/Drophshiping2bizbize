import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import type { D1Database, D1PreparedStatement, Env } from "../../src/config/bindings";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));
const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

class SQLitePreparedStatement implements D1PreparedStatement {
  constructor(
    private readonly database: DatabaseSync,
    private readonly query: string,
    private readonly values: unknown[] = []
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

  const env: Env & { DB: D1Database } = {
    DB: new SQLiteD1Database(sqlite),
    REFRESH_QUEUE: {
      async send() {
        return;
      },
    },
  };

  return { env, sqlite };
}

describe("POST /tracking/products", () => {
  it("creates a tracked product and rejects a duplicate normalized URL", async () => {
    const { env, sqlite } = createEnv();
    const app = createApp({
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
    });

    const first = await app.request("/tracking/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" }),
    }, env);

    const second = await app.request("/tracking/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=999" }),
    }, env);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);

    const products = sqlite.prepare("select trendyol_url as trendyolUrl, source_product_id as sourceProductId, title from products").all() as Array<{ trendyolUrl: string; sourceProductId: string; title: string }>;
    const variants = sqlite.prepare("select count(*) as count from product_variants").get() as { count: number };
    const currentState = sqlite.prepare("select current_price as currentPrice, in_stock_variant_count as inStockVariantCount from product_current_state").get() as { currentPrice: number; inStockVariantCount: number };

    expect(products).toEqual([
      {
        trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
        sourceProductId: "123",
        title: "Oversize Hoodie",
      },
    ]);
    expect(variants.count).toBe(1);
    expect(currentState).toEqual({ currentPrice: 42990, inStockVariantCount: 1 });
  });
});

