import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

describe("etsy shops integration", () => {
  it("creates shops, assigns products, and returns shop scoped views", async () => {
    const { env } = createTestEnv();
    const app = createApp({
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
    });

    const shopOneResponse = await app.request(
      "http://localhost/owners/berke/etsy-shops",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Cozy Prints",
          etsyShopUrl: "https://www.etsy.com/shop/cozyprints",
          description: "Ana print magazasi",
        }),
      },
      env,
    );
    const shopTwoResponse = await app.request(
      "http://localhost/owners/berke/etsy-shops",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Poster Lab",
          etsyShopUrl: "https://www.etsy.com/shop/posterlab",
          description: "Poster odakli ikinci magaza",
        }),
      },
      env,
    );

    expect(shopOneResponse.status).toBe(201);
    expect(shopTwoResponse.status).toBe(201);

    const shopOne = (await shopOneResponse.json()) as { shop: { id: string } };
    const shopTwo = (await shopTwoResponse.json()) as { shop: { id: string } };

    const createProductResponse = await app.request(
      "http://localhost/owners/berke/products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1",
          shopIds: [shopOne.shop.id],
        }),
      },
      env,
    );

    expect(createProductResponse.status).toBe(201);
    const created = (await createProductResponse.json()) as { product: { id: string } };

    const addToSecondShopResponse = await app.request(
      `http://localhost/owners/berke/products/${created.product.id}/etsy-shops`,
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ shopIds: [shopOne.shop.id, shopTwo.shop.id] }),
      },
      env,
    );

    expect(addToSecondShopResponse.status).toBe(200);
    expect(await addToSecondShopResponse.json()).toEqual(
      expect.objectContaining({
        productId: created.product.id,
        shops: expect.arrayContaining([
          expect.objectContaining({ id: shopOne.shop.id }),
          expect.objectContaining({ id: shopTwo.shop.id }),
        ]),
      }),
    );

    const productDetailResponse = await app.request(
      `http://localhost/owners/berke/products/${created.product.id}`,
      undefined,
      env,
    );
    const shopDetailResponse = await app.request(
      `http://localhost/owners/berke/etsy-shops/${shopTwo.shop.id}`,
      undefined,
      env,
    );
    const shopsListResponse = await app.request("http://localhost/owners/berke/etsy-shops", undefined, env);

    expect(productDetailResponse.status).toBe(200);
    expect(shopDetailResponse.status).toBe(200);
    expect(shopsListResponse.status).toBe(200);

    const productDetailJson = await productDetailResponse.json();
    const shopDetailJson = await shopDetailResponse.json();
    const shopsListJson = await shopsListResponse.json();

    expect(productDetailJson.product.shops).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: shopOne.shop.id, name: "Cozy Prints" }),
        expect.objectContaining({ id: shopTwo.shop.id, name: "Poster Lab" }),
      ]),
    );
    expect(shopDetailJson.products.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.product.id })]),
    );
    expect(shopsListJson.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: shopOne.shop.id, productCount: 1 }),
        expect.objectContaining({ id: shopTwo.shop.id, productCount: 1 }),
      ]),
    );
  });
});
