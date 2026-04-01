import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

describe("source products", () => {
  it("creates, updates, links Etsy listings, searches by Etsy URL, and deletes links", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const createResponse = await app.request(
      "http://localhost/owners/berke/source-products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceTitle: "Minimal seramik kupa",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123&campaign=b",
          sourcePlatform: "SHOPIER",
          note: "Ilk Etsy denemesi icin saklandi",
        }),
      },
      env,
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      product: { id: string; ownerKey: string; sourceTitle: string; sourcePlatform: string; note: string | null };
      etsyLinks: Array<{ id: string }>;
    };
    expect(created.product).toEqual(
      expect.objectContaining({
        ownerKey: "berke",
        sourceTitle: "Minimal seramik kupa",
        sourcePlatform: "SHOPIER",
        note: "Ilk Etsy denemesi icin saklandi",
      }),
    );
    expect(created.etsyLinks).toEqual([]);

    const patchResponse = await app.request(
      `http://localhost/owners/berke/source-products/${created.product.id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ note: "Guncel not" }),
      },
      env,
    );
    expect(patchResponse.status).toBe(200);
    expect((await patchResponse.json()).product.note).toBe("Guncel not");

    const addLinkResponse = await app.request(
      `http://localhost/owners/berke/source-products/${created.product.id}/etsy-links`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          etsyUrl: "https://www.etsy.com/listing/123456789/minimal-ceramic-mug?ref=share",
        }),
      },
      env,
    );

    expect(addLinkResponse.status).toBe(201);
    const linked = (await addLinkResponse.json()) as {
      etsyLinks: Array<{ id: string; etsyListingId: string | null; etsyUrlNormalized: string }>;
    };
    expect(linked.etsyLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          etsyListingId: "123456789",
          etsyUrlNormalized: "https://www.etsy.com/listing/123456789",
        }),
      ]),
    );

    const searchResponse = await app.request(
      "http://localhost/owners/berke/source-products?search=https://www.etsy.com/listing/123456789/another-name?ref=share",
      undefined,
      env,
    );
    expect(searchResponse.status).toBe(200);
    expect((await searchResponse.json()).items).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.product.id })]),
    );

    const detailResponse = await app.request(
      `http://localhost/owners/berke/source-products/${created.product.id}`,
      undefined,
      env,
    );
    expect(detailResponse.status).toBe(200);
    const detail = await detailResponse.json();
    const firstLink = detail.etsyLinks[0] as { id: string };

    const deleteResponse = await app.request(
      `http://localhost/owners/berke/source-products/${created.product.id}/etsy-links/${firstLink.id}`,
      { method: "DELETE" },
      env,
    );
    expect(deleteResponse.status).toBe(204);

    const detailAfterDelete = await app.request(
      `http://localhost/owners/berke/source-products/${created.product.id}`,
      undefined,
      env,
    );
    expect((await detailAfterDelete.json()).etsyLinks).toEqual([]);
  });

  it("rejects duplicate source links and duplicate Etsy links inside the same owner scope", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const firstCreate = await app.request(
      "http://localhost/owners/berke/source-products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceTitle: "Kupa A",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?id=123&campaign=b",
          sourcePlatform: "SHOPIER",
        }),
      },
      env,
    );
    expect(firstCreate.status).toBe(201);
    const firstCreated = (await firstCreate.json()) as { product: { id: string } };

    const duplicateCreate = await app.request(
      "http://localhost/owners/berke/source-products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceTitle: "Kupa A kopya",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?campaign=b&id=123",
          sourcePlatform: "SHOPIER",
        }),
      },
      env,
    );
    expect(duplicateCreate.status).toBe(409);
    expect(await duplicateCreate.json()).toEqual(
      expect.objectContaining({ code: "SOURCE_PRODUCT_DUPLICATE" }),
    );

    const differentOwnerCreate = await app.request(
      "http://localhost/owners/kaan/source-products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sourceTitle: "Kupa B",
          sourceUrl: "https://shopier.com/ShowProductNew/products.php?campaign=b&id=123",
          sourcePlatform: "SHOPIER",
        }),
      },
      env,
    );
    expect(differentOwnerCreate.status).toBe(201);

    const addLinkResponse = await app.request(
      `http://localhost/owners/berke/source-products/${firstCreated.product.id}/etsy-links`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ etsyUrl: "https://www.etsy.com/listing/123456789/minimal-ceramic-mug" }),
      },
      env,
    );
    expect(addLinkResponse.status).toBe(201);

    const duplicateLinkResponse = await app.request(
      `http://localhost/owners/berke/source-products/${firstCreated.product.id}/etsy-links`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ etsyUrl: "https://www.etsy.com/listing/123456789/minimal-ceramic-mug?ref=share" }),
      },
      env,
    );
    expect(duplicateLinkResponse.status).toBe(409);
    expect(await duplicateLinkResponse.json()).toEqual(
      expect.objectContaining({ code: "ETSY_LINK_DUPLICATE" }),
    );
  });
});
