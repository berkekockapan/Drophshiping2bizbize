import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createProductEtsyLinksRepo } from "../../src/db/repositories/productEtsyLinksRepo";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("tracked product Etsy links", () => {
  it("repairs a missing Etsy-link schema before returning tracked products", async () => {
    const { env, sqlite } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const created = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/brand/runtime-schema-p-100" },
      { fetchImpl },
    );

    sqlite.exec("drop table product_etsy_links");

    const response = await app.request("http://localhost/owners/berke/products", undefined, env);
    const payload = (await response.json()) as { items: Array<{ id: string; etsyLinks: unknown[] }> };
    const recreatedTable = sqlite
      .prepare("select name from sqlite_master where type = 'table' and name = 'product_etsy_links'")
      .get() as { name: string } | undefined;

    expect(response.status).toBe(200);
    expect(recreatedTable?.name).toBe("product_etsy_links");
    expect(payload.items.find((item) => item.id === created.product.id)?.etsyLinks).toEqual([]);
  });

  it("chunks Etsy-link lookups below Cloudflare D1's bound-parameter limit", async () => {
    const { env } = createTestEnv();
    const bindCounts: number[] = [];
    const limitedDb = {
      prepare(query: string) {
        const statement = env.DB.prepare(query);
        return {
          bind(...values: unknown[]) {
            bindCounts.push(values.length);
            if (values.length > 100) {
              throw new Error("D1 bound parameter limit exceeded");
            }
            return statement.bind(...values);
          },
          first<T = Record<string, unknown>>() {
            return statement.first<T>();
          },
          all<T = Record<string, unknown>>() {
            return statement.all<T>();
          },
          run() {
            return statement.run();
          },
        };
      },
    };

    const productIds = Array.from({ length: 194 }, (_, index) => `product_${index}`);
    const result = await createProductEtsyLinksRepo(limitedDb).listForProducts("berke", productIds);

    expect(result.size).toBe(0);
    expect(bindCounts.filter((count) => count > 1)).toEqual([81, 81, 35]);
    expect(Math.max(...bindCounts)).toBeLessThanOrEqual(100);
  });

  it("saves an Etsy link on a tracked-only product and returns it in the tracking list", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const created = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/brand/product-p-123" },
      { fetchImpl },
    );

    const response = await app.request(
      `http://localhost/owners/berke/products/${created.product.id}/etsy-links`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ etsyUrl: "https://www.etsy.com/listing/987654321/product?ref=share" }),
      },
      env,
    );

    expect(response.status).toBe(201);
    const createdLinkResponse = (await response.json()) as { etsyLink: { id: string } };
    expect(createdLinkResponse).toEqual({
      etsyLink: expect.objectContaining({
        productId: created.product.id,
        etsyListingId: "987654321",
        etsyUrlNormalized: "https://www.etsy.com/listing/987654321",
      }),
    });

    const listResponse = await app.request("http://localhost/owners/berke/products", undefined, env);
    const list = (await listResponse.json()) as { items: Array<{ id: string; etsyLinks: unknown[] }> };
    expect(list.items.find((item) => item.id === created.product.id)?.etsyLinks).toEqual([
      {
        id: expect.any(String),
        title: "987654321",
        url: "https://www.etsy.com/listing/987654321/product?ref=share",
      },
    ]);

    const deleteResponse = await app.request(
      `http://localhost/owners/berke/products/${created.product.id}/etsy-links/${createdLinkResponse.etsyLink.id}`,
      { method: "DELETE" },
      env,
    );
    expect(deleteResponse.status).toBe(204);

    const listAfterDeleteResponse = await app.request("http://localhost/owners/berke/products", undefined, env);
    const listAfterDelete = (await listAfterDeleteResponse.json()) as {
      items: Array<{ id: string; etsyLinks: unknown[] }>;
    };
    expect(listAfterDelete.items.find((item) => item.id === created.product.id)?.etsyLinks).toEqual([]);
  });

  it("rejects a duplicate normalized Etsy listing for the same owner", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const created = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/brand/product-p-456" },
      { fetchImpl },
    );

    const add = (etsyUrl: string) =>
      app.request(
        `http://localhost/owners/berke/products/${created.product.id}/etsy-links`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ etsyUrl }),
        },
        env,
      );

    expect((await add("https://www.etsy.com/listing/123456789/first")).status).toBe(201);
    const duplicate = await add("https://etsy.com/listing/123456789/second?ref=share");
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual(expect.objectContaining({ code: "ETSY_LINK_DUPLICATE" }));
  });
});
