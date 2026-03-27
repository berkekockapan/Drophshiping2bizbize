import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("product categories", () => {
  it("keeps categories owner-scoped, filters tracking lists, and unassigns products on delete", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const berkeProduct = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/example/berke-p-1" },
      { fetchImpl, now: new Date("2026-03-27T10:00:00.000Z") },
    );
    const kaanProduct = await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/example/kaan-p-1" },
      { fetchImpl, now: new Date("2026-03-27T10:01:00.000Z") },
    );

    const createBerke = await app.request(
      "http://localhost/owners/berke/categories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bileklik" }),
      },
      env,
    );
    const createKaan = await app.request(
      "http://localhost/owners/kaan/categories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bileklik" }),
      },
      env,
    );
    const duplicate = await app.request(
      "http://localhost/owners/berke/categories",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: " bileklik " }),
      },
      env,
    );

    const berkeCategory = ((await createBerke.json()) as { category: { id: string; name: string } }).category;
    const renamedResponse = await app.request(
      `http://localhost/owners/berke/categories/${berkeCategory.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Bileklik Premium" }),
      },
      env,
    );
    const renamedCategory = ((await renamedResponse.json()) as { category: { id: string; name: string } }).category;
    const categoryList = await app.request("http://localhost/owners/berke/categories", undefined, env);

    const assign = await app.request(
      `http://localhost/owners/berke/products/${berkeProduct.product.id}/category`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: renamedCategory.id }),
      },
      env,
    );
    const filtered = await app.request(
      `http://localhost/owners/berke/products?categoryId=${renamedCategory.id}`,
      undefined,
      env,
    );
    const uncategorized = await app.request("http://localhost/owners/berke/products?categoryId=uncategorized", undefined, env);
    const crossOwnerAssign = await app.request(
      `http://localhost/owners/kaan/products/${kaanProduct.product.id}/category`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ categoryId: renamedCategory.id }),
      },
      env,
    );
    const deleted = await app.request(
      `http://localhost/owners/berke/categories/${renamedCategory.id}`,
      { method: "DELETE" },
      env,
    );
    const detailAfterDelete = await app.request(
      `http://localhost/owners/berke/products/${berkeProduct.product.id}`,
      undefined,
      env,
    );

    expect(createBerke.status).toBe(201);
    expect(createKaan.status).toBe(201);
    expect(duplicate.status).toBe(409);
    expect(renamedResponse.status).toBe(200);
    expect((await categoryList.json()) as { items: Array<{ id: string; name: string }> }).toEqual({
      items: [expect.objectContaining({ id: renamedCategory.id, name: "Bileklik Premium" })],
    });
    expect(assign.status).toBe(200);
    expect((await filtered.json()) as { summary: unknown; items: unknown[]; filters: unknown }).toEqual({
      items: [
        expect.objectContaining({
          id: berkeProduct.product.id,
          userCategory: { id: renamedCategory.id, name: "Bileklik Premium" },
        }),
      ],
      summary: expect.any(Object),
      filters: expect.objectContaining({ categoryId: renamedCategory.id }),
    });
    expect((await uncategorized.json()) as { summary: unknown; items: unknown[]; filters: unknown }).toEqual({
      items: [],
      summary: expect.any(Object),
      filters: expect.objectContaining({ categoryId: "uncategorized" }),
    });
    expect(crossOwnerAssign.status).toBe(404);
    expect(deleted.status).toBe(204);
    expect((await detailAfterDelete.json()) as { product: { userCategory: null } }).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({ userCategory: null }),
      }),
    );
  });
});
