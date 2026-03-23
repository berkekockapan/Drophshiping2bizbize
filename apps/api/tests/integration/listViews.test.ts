import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("list and detail views", () => {
  it("returns dashboard cards, filters, and product detail sections", async () => {
    const { env } = createTestEnv();

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
        source: "MANUAL",
        fetchImpl: async () => new Response(changedHtml, { status: 200 }),
        now: new Date("2026-03-20T06:00:00.000Z"),
      },
    );

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        source: "MANUAL",
        fetchImpl: async () => new Response(changedHtml, { status: 200 }),
        now: new Date("2026-03-20T07:00:00.000Z"),
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
        isFavorite: false,
        thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
      }),
    );

    expect(detailJson.variants[0]).toEqual(
      expect.objectContaining({
        option1: "L",
        trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-l-siyah-p-123",
      }),
    );
    expect(detailJson.priceHistory).toHaveLength(1);
    expect(detailJson.stockHistory).toHaveLength(1);
    expect(detailJson.currentState.currentPrice).toBe(44990);
    expect(detailJson.changeTimeline).toHaveLength(3);
    expect(detailJson.changeTimeline[0]).toEqual(
      expect.objectContaining({
        type: "REFRESH_NO_CHANGE",
        summary: "Yenileme yapildi, degisiklik bulunamadi",
      }),
    );
    expect(detailJson.changeTimeline).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "PRODUCT_PRICE_CHANGED",
          summary: expect.stringContaining("Urun fiyati degisti"),
        }),
        expect.objectContaining({
          type: "VARIANT_STOCK_CHANGED",
          summary: expect.stringContaining("stok"),
        }),
      ]),
    );

    expect(notificationsJson.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "PRICE_INCREASED" }),
        expect.objectContaining({ type: "BACK_IN_STOCK" }),
      ]),
    );
  });
});
