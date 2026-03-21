import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

function createEnv() {
  return createTestEnv();
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

    const products = sqlite
      .prepare(
        "select trendyol_url as trendyolUrl, source_product_id as sourceProductId, title, is_favorite as isFavorite from products",
      )
      .all() as Array<{
        trendyolUrl: string;
        sourceProductId: string;
        title: string;
        isFavorite: number;
      }>;
    const variants = sqlite.prepare("select count(*) as count from product_variants").get() as { count: number };
    const currentState = sqlite.prepare("select current_price as currentPrice, in_stock_variant_count as inStockVariantCount from product_current_state").get() as { currentPrice: number; inStockVariantCount: number };

    expect(products).toEqual([
      {
        trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
        sourceProductId: "123",
        title: "Oversize Hoodie",
        isFavorite: 0,
      },
    ]);
    expect(variants.count).toBe(1);
    expect(currentState).toEqual({ currentPrice: 42990, inStockVariantCount: 1 });
  });
});
