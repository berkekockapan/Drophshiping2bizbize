import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { deleteTrackedProduct } from "../../src/modules/tracking/deleteTrackedProduct";
import { createTestEnv } from "../support/sqlite";
const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const unavailableProductHtml = readFileSync(new URL("../fixtures/trendyol/product-unavailable.html", import.meta.url), "utf8");

function createEnv() {
  const { sqlite, env } = createTestEnv();

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

  it("does not recreate child rows when the product is deleted during refresh", async () => {
    const { env, sqlite } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await expect(
      processRefreshJob(
        env,
        { productId: seeded.product.id },
        {
          fetchImpl: async () => {
            await deleteTrackedProduct(env.DB, seeded.product.id);
            return new Response(basicProductHtml, { status: 200 });
          },
          now: new Date("2026-03-20T01:00:00.000Z"),
        },
      ),
    ).rejects.toThrow(`Product ${seeded.product.id} not found`);

    const counts = {
      products: sqlite.prepare("select count(*) as count from products where id = ?").get(seeded.product.id) as { count: number },
      variants: sqlite.prepare("select count(*) as count from product_variants where product_id = ?").get(seeded.product.id) as { count: number },
      currentState: sqlite.prepare("select count(*) as count from product_current_state where product_id = ?").get(seeded.product.id) as { count: number },
      priceHistory: sqlite.prepare("select count(*) as count from price_history where product_id = ?").get(seeded.product.id) as { count: number },
      stockHistory: sqlite.prepare("select count(*) as count from stock_history where product_id = ?").get(seeded.product.id) as { count: number },
      notifications: sqlite.prepare("select count(*) as count from notifications where product_id = ?").get(seeded.product.id) as { count: number },
    };

    expect(counts).toEqual({
      products: { count: 0 },
      variants: { count: 0 },
      currentState: { count: 0 },
      priceHistory: { count: 0 },
      stockHistory: { count: 0 },
      notifications: { count: 0 },
    });
  });
});
