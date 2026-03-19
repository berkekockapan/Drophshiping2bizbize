import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { D1Database, D1PreparedStatement, Env } from "../../src/config/bindings";
import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";

const migrationPath = fileURLToPath(new URL("../../drizzle/0000_initial.sql", import.meta.url));
const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const unavailableProductHtml = readFileSync(new URL("../fixtures/trendyol/product-unavailable.html", import.meta.url), "utf8");

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

describe("processRefreshJob", () => {
  it("marks parse failures without deleting the product", async () => {
    const { env, sqlite } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const response = await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () => new Response(unavailableProductHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const product = sqlite
      .prepare("select id, parse_status as parseStatus from products where id = ?")
      .get(seeded.product.id) as { id: string; parseStatus: string };
    const notifications = sqlite
      .prepare("select type, severity from notifications where product_id = ? order by created_at asc")
      .all(seeded.product.id) as Array<{ type: string; severity: string }>;

    expect(product).toEqual({ id: seeded.product.id, parseStatus: "REVIEW_NEEDED" });
    expect(response.product.parseStatus).toBe("REVIEW_NEEDED");
    expect(response.notifications[0].type).toBe("PARSE_ERROR");
    expect(notifications).toEqual([{ type: "PARSE_ERROR", severity: "warning" }]);

    const stillExists = sqlite.prepare("select count(*) as count from products where id = ?").get(seeded.product.id) as { count: number };
    expect(stillExists.count).toBe(1);
  });
});
