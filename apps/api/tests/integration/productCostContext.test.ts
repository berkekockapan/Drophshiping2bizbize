import { readFileSync } from "node:fs";

import { expect, it } from "vitest";

import { createApp } from "../../src";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { createTestEnv } from "../support/sqlite";

const productHtml = readFileSync(new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url), "utf8");

it("returns variant-aware cost context and persists manual overrides", async () => {
  const { env } = createTestEnv();
  await loadUsTariffSeed(env.DB);
  const seeded = await createTrackedProduct(
    env,
    { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
    {
      fetchImpl: async () => new Response(productHtml, { status: 200 }),
      now: new Date("2026-03-30T09:00:00.000Z"),
    },
  );

  const app = createApp();
  const detail = (await (
    await app.request(`http://localhost/owners/berke/products/${seeded.product.id}`, undefined, env)
  ).json()) as {
    costContext: {
      selectedVariantId: string | null;
      variants: Array<{
        variantId: string;
        autoProductCost: { amount: number; currency: string };
        autoShippingEstimate: { amount: number; currency: string };
      }>;
      usState: {
        status: string;
      };
    };
  };
  expect(detail.costContext.selectedVariantId).toBeTruthy();
  expect(detail.costContext.variants[0]?.autoProductCost.currency).toBe("TRY");
  expect(detail.costContext.variants[0]?.autoShippingEstimate.amount).toBeGreaterThan(0);
  expect(["automatic_confirmed", "review_required", "locked"]).toContain(detail.costContext.usState.status);

  const variantId = detail.costContext.variants[0]!.variantId;
  const overrideResponse = await app.request(
    `http://localhost/owners/berke/products/${seeded.product.id}/variants/${variantId}/cost-overrides`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manualProductCost: { amount: 399, currency: "TRY" },
        manualShippingCost: { amount: 8.25, currency: "USD" },
      }),
    },
    env,
  );
  expect(overrideResponse.status).toBe(200);
});
