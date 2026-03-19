import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import type { D1Database, D1PreparedStatement, Env } from "../../src/config/bindings";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";

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

describe("list and detail views", () => {
  it("returns dashboard cards, filters, and product detail sections", async () => {
    const { env } = createEnv();

    const settingsResponse = await createApp().request("http://localhost/settings", undefined, env);
    expect(settingsResponse.status).toBe(200);
    expect(await settingsResponse.json()).toMatchObject({
      refreshIntervalHours: 5,
      connectorHealthcheckEnabled: true,
    });

    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const changedHtml = productWithVariantsHtml
      .replace('data-price="429.90">429.90', 'data-price="449.90">449.90')
      .replace('data-key="M-Siyah" data-option-1="M" data-option-2="Siyah" data-stock-state="OUT_OF_STOCK"', 'data-key="M-Siyah" data-option-1="M" data-option-2="Siyah" data-stock-state="IN_STOCK"');

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () => new Response(changedHtml, { status: 200 }),
        now: new Date("2026-03-20T06:00:00.000Z"),
      },
    );

    const app = createApp();
    const listResponse = await app.request("http://localhost/tracking/products", undefined, env);
    const detailResponse = await app.request(`http://localhost/products/${seeded.product.id}`, undefined, env);
    const notificationsResponse = await app.request("http://localhost/notifications", undefined, env);

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(notificationsResponse.status).toBe(200);

    const listJson = await listResponse.json();
    const detailJson = await detailResponse.json();
    const notificationsJson = await notificationsResponse.json();

    expect(listJson.summary.trackedCount).toBeGreaterThan(0);
    expect(listJson.items[0]).toEqual(
      expect.objectContaining({
        id: seeded.product.id,
        title: "Oversize Hoodie",
        totalVariantCount: 3,
      }),
    );

    expect(detailJson.variants[0]).toEqual(expect.objectContaining({ option1: "L" }));
    expect(detailJson.priceHistory).toHaveLength(1);
    expect(detailJson.stockHistory).toHaveLength(1);
    expect(detailJson.currentState.currentPrice).toBe(44990);

    expect(notificationsJson.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "PRICE_INCREASED" }),
        expect.objectContaining({ type: "BACK_IN_STOCK" }),
      ]),
    );
  });
});
