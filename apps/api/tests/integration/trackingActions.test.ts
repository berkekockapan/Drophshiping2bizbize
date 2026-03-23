import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv, InMemoryRefreshQueue } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

function createExecutionContext(promises: Array<Promise<unknown>>): Parameters<ReturnType<typeof createApp>["fetch"]>[2] {
  return {
    waitUntil(promise) {
      promises.push(promise);
    },
    passThroughOnException() {
      return;
    },
    props: {},
  };
}

describe("tracking actions", () => {
  it("starts a manual refresh run instead of queueing jobs", async () => {
    const queue = new InMemoryRefreshQueue();
    const { env, sqlite } = createTestEnv({ queue });
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const first = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl,
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const second = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl,
        now: new Date("2026-03-20T00:05:00.000Z"),
      },
    );

    sqlite.prepare("update products set status = ? where id = ?").run("PAUSED", second.product.id);

    const waitUntilPromises: Array<Promise<unknown>> = [];
    const response = await app.fetch(
      new Request("http://localhost/tracking/products/refresh-runs", {
        method: "POST",
      }),
      env,
      createExecutionContext(waitUntilPromises),
    );

    expect(response.status).toBe(202);
    expect((await response.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        totalCount: 2,
        status: "RUNNING",
      }),
    });

    await Promise.all(waitUntilPromises);

    const runs = sqlite.prepare("select count(*) as count from manual_refresh_runs").get() as { count: number };
    expect(runs.count).toBe(1);
    expect(queue.sent).toEqual([]);
  });

  it("toggles favorite state and filters favorites-only tracking list", async () => {
    const { env } = createTestEnv();
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
    const { env, sqlite } = createTestEnv();
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
