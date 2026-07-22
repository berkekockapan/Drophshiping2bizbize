import { readFileSync } from "node:fs";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/index";
import { createProductLinkedVariantsRepo } from "../../src/db/repositories/productLinkedVariantsRepo";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("product image download", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("downloads a product image as JPG and rejects URLs outside the product image set", async () => {
    const { env } = createTestEnv();
    const app = createApp();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
      new Response(new Uint8Array([255, 216, 255, 217]), {
        status: 200,
        headers: { "content-type": "image/jpeg" },
      }),
    );

    const okResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/images/download?url=https://cdn.example.com/hoodie-1.jpg`,
      undefined,
      env,
    );

    expect(okResponse.status).toBe(200);
    expect(okResponse.headers.get("content-type")).toContain("image/jpeg");
    expect(okResponse.headers.get("content-disposition")).toContain(".jpg");
    expect(okResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(new Uint8Array(await okResponse.arrayBuffer())).toEqual(new Uint8Array([255, 216, 255, 217]));

    const invalidResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/images/download?url=https://cdn.example.com/not-owned.jpg`,
      undefined,
      env,
    );

    expect(invalidResponse.status).toBe(400);
    expect(invalidResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await createProductLinkedVariantsRepo(env.DB).create({
      id: "linked_blue",
      parentProductId: seeded.product.id,
      ownerKey: "berke",
      trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-blue-p-456",
      trendyolUrlNormalized: "https://www.trendyol.com/north-apparel/oversize-hoodie-blue-p-456",
      sourceProductId: "456",
      title: "Oversize Hoodie Mavi",
      brand: "North Apparel",
      descriptionRaw: null,
      attributesRaw: "[]",
      imagesRaw: JSON.stringify(["https://cdn.example.com/hoodie-blue-1.jpg"]),
      currentPrice: 45990,
      currentStockState: "IN_STOCK",
      lastCheckedAt: Date.parse("2026-03-20T01:00:00.000Z"),
      createdAt: Date.parse("2026-03-20T01:00:00.000Z"),
      updatedAt: Date.parse("2026-03-20T01:00:00.000Z"),
    });

    const linkedVariantResponse = await app.request(
      `http://localhost/owners/berke/products/${seeded.product.id}/images/download?url=https://cdn.example.com/hoodie-blue-1.jpg`,
      undefined,
      env,
    );

    expect(linkedVariantResponse.status).toBe(200);
    expect(linkedVariantResponse.headers.get("content-disposition")).toContain("oversize-hoodie-mavi.jpg");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("returns CORS headers for preflight requests", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const response = await app.request(
      "http://localhost/owners/berke/products/some-id/images/download?url=https://cdn.example.com/x.jpg",
      {
        method: "OPTIONS",
      },
      env,
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain("OPTIONS");
  });
});
