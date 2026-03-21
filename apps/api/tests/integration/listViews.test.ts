import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
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
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
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

  it("filters favorites without changing the global summary", async () => {
    const { env } = createEnv();

    const first = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );
    const second = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const app = createApp();
    const favoriteResponse = await app.request(
      "http://localhost/tracking/products?favorite=true",
      undefined,
      env,
    );
    const notFavoriteResponse = await app.request(
      "http://localhost/tracking/products?favorite=false",
      undefined,
      env,
    );
    const toggleResponse = await app.request(`/tracking/products/${first.product.id}/favorite`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isFavorite: true }),
    }, env);
    const refilteredResponse = await app.request(
      "http://localhost/tracking/products?favorite=true",
      undefined,
      env,
    );

    expect(favoriteResponse.status).toBe(200);
    expect(notFavoriteResponse.status).toBe(200);
    expect(toggleResponse.status).toBe(200);
    expect(refilteredResponse.status).toBe(200);

    const favoriteJson = await favoriteResponse.json();
    const notFavoriteJson = await notFavoriteResponse.json();
    const refilteredJson = await refilteredResponse.json();

    expect(favoriteJson.summary.trackedCount).toBe(2);
    expect(notFavoriteJson.summary.trackedCount).toBe(2);
    expect(refilteredJson.summary.trackedCount).toBe(2);

    expect(favoriteJson.items).toEqual([]);
    expect(notFavoriteJson.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.product.id, isFavorite: false }),
        expect.objectContaining({ id: second.product.id, isFavorite: false }),
      ]),
    );
    expect(refilteredJson.items).toEqual([
      expect.objectContaining({
        id: first.product.id,
        isFavorite: true,
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
      }),
    ]);
    expect(refilteredJson.filters).toEqual({ favorite: true });

    const toggleJson = await toggleResponse.json();
    expect(toggleJson).toEqual({ productId: first.product.id, isFavorite: true });
  });
});
