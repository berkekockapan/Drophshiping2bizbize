import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("product linked variants", () => {
  it("repairs a missing linked-variant schema before returning product detail", async () => {
    const { env, sqlite } = createTestEnv();
    const fetchImpl = async () => new Response(productHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const parent = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/brand/runtime-schema-p-99" },
      { fetchImpl },
    );

    sqlite.exec("drop table product_linked_variants");

    const response = await app.request(
      `http://localhost/owners/berke/products/${parent.product.id}`,
      undefined,
      env,
    );
    const detail = (await response.json()) as { linkedVariants: unknown[] };
    const recreatedTable = sqlite
      .prepare("select name from sqlite_master where type = 'table' and name = 'product_linked_variants'")
      .get() as { name: string } | undefined;

    expect(response.status).toBe(200);
    expect(recreatedTable?.name).toBe("product_linked_variants");
    expect(detail.linkedVariants).toEqual([]);
  });

  it("persists multiple manually linked Trendyol products and deletes only the explicitly selected record", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const parent = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/brand/main-product-p-100" },
      { fetchImpl },
    );

    const add = async (trendyolUrl: string) =>
      app.request(
        `http://localhost/owners/berke/products/${parent.product.id}/linked-variants`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ trendyolUrl }),
        },
        env,
      );

    const firstResponse = await add("https://www.trendyol.com/brand/blue-product-p-101?boutiqueId=1");
    const secondResponse = await add("https://www.trendyol.com/brand/red-product-p-102");
    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);

    const first = (await firstResponse.json()) as { linkedVariant: { id: string } };
    const detailResponse = await app.request(
      `http://localhost/owners/berke/products/${parent.product.id}`,
      undefined,
      env,
    );
    const detail = (await detailResponse.json()) as {
      linkedVariants: Array<{ id: string; trendyolUrl: string; title: string; images: string[]; currentPrice: number }>;
    };

    expect(detail.linkedVariants).toHaveLength(2);
    expect(detail.linkedVariants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: first.linkedVariant.id,
          trendyolUrl: "https://www.trendyol.com/brand/blue-product-p-101",
          title: "Oversize Hoodie",
          currentPrice: 42990,
          images: expect.any(Array),
        }),
      ]),
    );

    const deleteResponse = await app.request(
      `http://localhost/owners/berke/products/${parent.product.id}/linked-variants/${first.linkedVariant.id}`,
      { method: "DELETE" },
      env,
    );
    expect(deleteResponse.status).toBe(204);

    const afterDeleteResponse = await app.request(
      `http://localhost/owners/berke/products/${parent.product.id}`,
      undefined,
      env,
    );
    const afterDelete = (await afterDeleteResponse.json()) as { linkedVariants: Array<{ id: string }> };
    expect(afterDelete.linkedVariants).toHaveLength(1);
    expect(afterDelete.linkedVariants.some((variant) => variant.id === first.linkedVariant.id)).toBe(false);
  });

  it("rejects the parent URL and duplicate linked URLs without removing the existing record", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const parentUrl = "https://www.trendyol.com/brand/main-product-p-200";
    const parent = await createTrackedProduct(env, { ownerKey: "berke", trendyolUrl: parentUrl }, { fetchImpl });
    const endpoint = `http://localhost/owners/berke/products/${parent.product.id}/linked-variants`;
    const add = (trendyolUrl: string) =>
      app.request(
        endpoint,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ trendyolUrl }),
        },
        env,
      );

    expect((await add(parentUrl)).status).toBe(409);
    const invalid = await add("https://example.com/not-trendyol");
    expect(invalid.status).toBe(400);
    expect(await invalid.json()).toEqual(expect.objectContaining({ code: "LINKED_VARIANT_URL_INVALID" }));
    expect((await add("https://www.trendyol.com/brand/green-product-p-201")).status).toBe(201);
    const duplicate = await add("https://www.trendyol.com/brand/green-product-p-201?merchantId=2");
    expect(duplicate.status).toBe(409);
    expect(await duplicate.json()).toEqual(expect.objectContaining({ code: "LINKED_VARIANT_DUPLICATE" }));

    const detailResponse = await app.request(
      `http://localhost/owners/berke/products/${parent.product.id}`,
      undefined,
      env,
    );
    const detail = (await detailResponse.json()) as { linkedVariants: unknown[] };
    expect(detail.linkedVariants).toHaveLength(1);
  });
});
