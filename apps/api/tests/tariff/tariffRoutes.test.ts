import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import { createApp } from "../../src";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { createTestEnv } from "../support/sqlite";

const productHtml = readFileSync(new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url), "utf8");

it("exposes tariff endpoints for a tracked product", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);

  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(productHtml, { status: 200 }),
      now: new Date("2026-03-28T09:00:00.000Z"),
    },
  );

  const app = createApp();
  const response = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/tariff-analysis/run`,
    { method: "POST" },
    env,
  );

  expect(response.status).toBe(200);
});
