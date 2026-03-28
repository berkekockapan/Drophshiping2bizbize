import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createProductsRepo } from "../../src/db/repositories/productsRepo";
import { deleteTrackedProduct } from "../../src/modules/tracking/deleteTrackedProduct";
import {
  DuplicateProductError,
  createTrackedProduct,
} from "../../src/modules/tracking/createTrackedProduct";
import { permanentlyDeleteTrackedProduct } from "../../src/modules/tracking/permanentlyDeleteTrackedProduct";
import { restoreTrackedProduct } from "../../src/modules/tracking/restoreTrackedProduct";
import { createFlakyD1 } from "../support/flakyD1";
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
  it("starts a manual refresh run per owner instead of queueing jobs", async () => {
    const queue = new InMemoryRefreshQueue();
    const { env, sqlite } = createTestEnv({ queue });
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:00:00.000Z") },
    );
    await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:05:00.000Z") },
    );
    await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-789?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:06:00.000Z") },
    );

    const waitUntilPromises: Array<Promise<unknown>> = [];
    const response = await app.fetch(
      new Request("http://localhost/owners/berke/products/refresh-runs", { method: "POST" }),
      env,
      createExecutionContext(waitUntilPromises),
    );

    expect(response.status).toBe(202);
    expect((await response.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        ownerKey: "berke",
        totalCount: 2,
        status: "RUNNING",
      }),
    });

    await Promise.all(waitUntilPromises);

    const runs = sqlite.prepare("select count(*) as count from manual_refresh_runs where owner_key = ?").get("berke") as {
      count: number;
    };
    expect(runs.count).toBe(1);
    expect(queue.sent).toEqual([]);
  });

  it("toggles favorite state and filters favorites-only list in selected owner", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const favoriteProduct = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:00:00.000Z") },
    );
    await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:02:00.000Z") },
    );

    const favoriteResponse = await app.request(
      `http://localhost/owners/berke/products/${favoriteProduct.product.id}/favorite`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: true }),
      },
      env,
    );
    const invalidPayloadResponse = await app.request(
      `http://localhost/owners/berke/products/${favoriteProduct.product.id}/favorite`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isFavorite: "yes" }),
      },
      env,
    );

    expect(favoriteResponse.status).toBe(200);
    expect(invalidPayloadResponse.status).toBe(400);
    expect(await favoriteResponse.json()).toEqual({
      productId: favoriteProduct.product.id,
      isFavorite: true,
    });

    const favoritesOnly = await app.request("http://localhost/owners/berke/products?favorite=true", undefined, env);
    expect(favoritesOnly.status).toBe(200);
    const favoritesJson = await favoritesOnly.json();
    expect(favoritesJson.items).toHaveLength(1);
    expect(favoritesJson.items[0]).toEqual(
      expect.objectContaining({
        id: favoriteProduct.product.id,
        ownerKey: "berke",
        isFavorite: true,
      }),
    );
  });

  it("isolates duplicates per owner and supports trash restore + hard delete", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const productsRepo = createProductsRepo(env.DB);

    const seedUrl = "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1";
    const berke = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: seedUrl },
      { fetchImpl, now: new Date("2026-03-27T08:00:00.000Z") },
    );
    const kaan = await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: seedUrl },
      { fetchImpl, now: new Date("2026-03-27T08:01:00.000Z") },
    );

    await deleteTrackedProduct(env.DB, "berke", berke.product.id, new Date("2026-03-27T09:00:00.000Z"));

    await expect(
      createTrackedProduct(
        env,
        { ownerKey: "berke", trendyolUrl: seedUrl },
        { fetchImpl, now: new Date("2026-03-27T09:01:00.000Z") },
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<DuplicateProductError>>({
        reason: "TRASH_DUPLICATE",
        trashedProductId: berke.product.id,
      }),
    );

    expect(await productsRepo.listTrackingCards("berke")).toHaveLength(0);
    expect(await productsRepo.listTrashCards("berke")).toEqual([
      expect.objectContaining({ id: berke.product.id, ownerKey: "berke" }),
    ]);
    expect(await productsRepo.listTrackingCards("kaan")).toEqual([
      expect.objectContaining({ id: kaan.product.id, ownerKey: "kaan" }),
    ]);

    await restoreTrackedProduct(env.DB, "berke", berke.product.id, new Date("2026-03-27T09:05:00.000Z"));
    expect(await productsRepo.listTrackingCards("berke")).toHaveLength(1);

    const flakyDeleteDb = createFlakyD1(env.DB, ["update products set deleted_at = ?"]);
    await deleteTrackedProduct(flakyDeleteDb, "berke", berke.product.id, new Date("2026-03-27T09:06:00.000Z"));

    const flakyRestoreDb = createFlakyD1(env.DB, ["update products set deleted_at = null"]);
    await restoreTrackedProduct(flakyRestoreDb, "berke", berke.product.id, new Date("2026-03-27T09:07:00.000Z"));

    const flakySecondDeleteDb = createFlakyD1(env.DB, ["update products set deleted_at = ?"]);
    await deleteTrackedProduct(flakySecondDeleteDb, "berke", berke.product.id, new Date("2026-03-27T09:08:00.000Z"));

    const flakyHardDeleteDb = createFlakyD1(env.DB, ["delete from product_variants"]);
    await permanentlyDeleteTrackedProduct(flakyHardDeleteDb, "berke", berke.product.id);

    expect(await productsRepo.getProductDetail("berke", berke.product.id)).toBeNull();
    expect(await productsRepo.getProductDetail("kaan", kaan.product.id)).not.toBeNull();
  });

  it("retries transient product creation writes before returning the new product", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const flakyEnv = { ...env, DB: createFlakyD1(env.DB, ["insert into products"]) };

    const response = await app.request(
      "http://localhost/owners/berke/products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" }),
      },
      flakyEnv,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      product: expect.objectContaining({
        ownerKey: "berke",
        title: "Oversize Hoodie",
      }),
    });
    expect(await createProductsRepo(env.DB).listTrackingCards("berke")).toHaveLength(1);
  });
});
