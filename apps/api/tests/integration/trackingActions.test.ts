import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

function createEnv() {
  const { sqlite, env } = createTestEnv();

  return { env, sqlite };
}

describe("tracking actions", () => {
  it("toggles favorite state and returns 404 for missing products", async () => {
    const { env, sqlite } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const app = createApp();
    const favoriteResponse = await app.request(`/tracking/products/${seeded.product.id}/favorite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: true }),
    }, env);
    const invalidPayloadResponse = await app.request(`/tracking/products/${seeded.product.id}/favorite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: "yes" }),
    }, env);
    const unfavoriteResponse = await app.request(`/tracking/products/${seeded.product.id}/favorite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: false }),
    }, env);
    const missingResponse = await app.request("/tracking/products/missing-product-id/favorite", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: true }),
    }, env);

    expect(favoriteResponse.status).toBe(200);
    expect(invalidPayloadResponse.status).toBe(400);
    expect(unfavoriteResponse.status).toBe(200);
    expect(missingResponse.status).toBe(404);

    expect(await favoriteResponse.json()).toEqual({ productId: seeded.product.id, isFavorite: true });
    expect(await unfavoriteResponse.json()).toEqual({ productId: seeded.product.id, isFavorite: false });

    const product = sqlite
      .prepare("select is_favorite as isFavorite from products where id = ?")
      .get(seeded.product.id) as { isFavorite: number };

    expect(product.isFavorite).toBe(0);
  });

  it("deletes a tracked product and clears all related rows", async () => {
    const { env, sqlite } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () =>
          new Response(
            productWithVariantsHtml
              .replace('data-price="429.90">429.90', 'data-price="449.90">449.90')
              .replace(
                'data-key="M-Siyah" data-option-1="M" data-option-2="Siyah" data-stock-state="OUT_OF_STOCK"',
                'data-key="M-Siyah" data-option-1="M" data-option-2="Siyah" data-stock-state="IN_STOCK"',
              ),
            { status: 200 },
          ),
      now: new Date("2026-03-20T06:00:00.000Z"),
      },
    );

    const beforeDelete = {
      variants: sqlite.prepare("select count(*) as count from product_variants where product_id = ?").get(seeded.product.id) as { count: number },
      currentState: sqlite.prepare("select count(*) as count from product_current_state where product_id = ?").get(seeded.product.id) as { count: number },
      priceHistory: sqlite.prepare("select count(*) as count from price_history where product_id = ?").get(seeded.product.id) as { count: number },
      stockHistory: sqlite.prepare("select count(*) as count from stock_history where product_id = ?").get(seeded.product.id) as { count: number },
      notifications: sqlite.prepare("select count(*) as count from notifications where product_id = ?").get(seeded.product.id) as { count: number },
    };

    sqlite
      .prepare(
        `insert into etsy_drafts (
          id, product_id, english_title, short_description, long_description, tags_json, materials_json, attributes_json,
          seo_notes, policy_notes, generated_version, edited_version, last_generated_at, manual_edits_present
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        crypto.randomUUID(),
        seeded.product.id,
        "Oversize Hoodie",
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        1,
        0,
        Date.parse("2026-03-20T06:00:00.000Z"),
        0,
      );

    const app = createApp();
    const deleteResponse = await app.request(`/tracking/products/${seeded.product.id}`, {
      method: "DELETE",
    }, env);
    const missingResponse = await app.request(`/tracking/products/${seeded.product.id}`, {
      method: "DELETE",
    }, env);

    expect(deleteResponse.status).toBe(204);
    expect(missingResponse.status).toBe(404);

    expect(beforeDelete).toEqual({
      variants: { count: 3 },
      currentState: { count: 1 },
      priceHistory: { count: 1 },
      stockHistory: { count: 1 },
      notifications: { count: 2 },
    });

    const counts = {
      products: sqlite.prepare("select count(*) as count from products where id = ?").get(seeded.product.id) as { count: number },
      variants: sqlite.prepare("select count(*) as count from product_variants where product_id = ?").get(seeded.product.id) as { count: number },
      currentState: sqlite.prepare("select count(*) as count from product_current_state where product_id = ?").get(seeded.product.id) as { count: number },
      priceHistory: sqlite.prepare("select count(*) as count from price_history where product_id = ?").get(seeded.product.id) as { count: number },
      stockHistory: sqlite.prepare("select count(*) as count from stock_history where product_id = ?").get(seeded.product.id) as { count: number },
      notifications: sqlite.prepare("select count(*) as count from notifications where product_id = ?").get(seeded.product.id) as { count: number },
      drafts: sqlite.prepare("select count(*) as count from etsy_drafts where product_id = ?").get(seeded.product.id) as { count: number },
    };

    expect(counts).toEqual({
      products: { count: 0 },
      variants: { count: 0 },
      currentState: { count: 0 },
      priceHistory: { count: 0 },
      stockHistory: { count: 0 },
      notifications: { count: 0 },
      drafts: { count: 0 },
    });
  });
});
