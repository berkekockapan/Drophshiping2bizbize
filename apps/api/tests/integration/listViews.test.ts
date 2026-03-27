import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createNotificationsRepo } from "../../src/db/repositories/notificationsRepo";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { deleteTrackedProduct } from "../../src/modules/tracking/deleteTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("list and detail views", () => {
  it("returns owner-scoped list/detail/notifications/trash views", async () => {
    const { env } = createTestEnv();
    const fetchImpl = async () => new Response(productWithVariantsHtml, { status: 200 });
    const app = createApp({ fetchImpl });

    const berke = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:00:00.000Z") },
    );
    const kaan = await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: new Date("2026-03-20T00:01:00.000Z") },
    );

    await createNotificationsRepo(env.DB).insertNotifications(
      "berke",
      berke.product.id,
      [
        {
          type: "PRICE_INCREASED",
          severity: "info",
          title: "Fiyat artti",
          body: "Urun fiyati yukseldi",
        },
      ],
      new Date("2026-03-20T01:00:00.000Z"),
    );

    await deleteTrackedProduct(env.DB, "berke", berke.product.id, new Date("2026-03-20T02:00:00.000Z"));

    const berkeList = await app.request("http://localhost/owners/berke/products", undefined, env);
    const kaanList = await app.request("http://localhost/owners/kaan/products", undefined, env);
    const berkeTrash = await app.request("http://localhost/owners/berke/trash", undefined, env);
    const berkeNotifications = await app.request("http://localhost/owners/berke/notifications", undefined, env);
    const kaanNotifications = await app.request("http://localhost/owners/kaan/notifications", undefined, env);
    const kaanDetail404 = await app.request(`http://localhost/owners/kaan/products/${berke.product.id}`, undefined, env);
    const kaanDetail = await app.request(`http://localhost/owners/kaan/products/${kaan.product.id}`, undefined, env);

    expect(berkeList.status).toBe(200);
    expect(kaanList.status).toBe(200);
    expect(berkeTrash.status).toBe(200);
    expect(berkeNotifications.status).toBe(200);
    expect(kaanNotifications.status).toBe(200);
    expect(kaanDetail404.status).toBe(404);
    expect(kaanDetail.status).toBe(200);

    const berkeListJson = await berkeList.json();
    const kaanListJson = await kaanList.json();
    const berkeTrashJson = await berkeTrash.json();
    const berkeNotificationsJson = await berkeNotifications.json();
    const kaanNotificationsJson = await kaanNotifications.json();

    expect(berkeListJson.items).toHaveLength(0);
    expect(berkeListJson.summary.trackedCount).toBe(0);
    expect(kaanListJson.items).toEqual([expect.objectContaining({ id: kaan.product.id, ownerKey: "kaan" })]);
    expect(berkeTrashJson.items).toEqual([expect.objectContaining({ id: berke.product.id, ownerKey: "berke" })]);
    expect(berkeNotificationsJson.items).toEqual(
      expect.arrayContaining([expect.objectContaining({ productId: berke.product.id, type: "PRICE_INCREASED" })]),
    );
    expect(kaanNotificationsJson.items).toEqual([]);
  });
});
