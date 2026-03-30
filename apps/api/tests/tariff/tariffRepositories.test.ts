import { describe, expect, it } from "vitest";

import { createProductVariantCostOverridesRepo } from "../../src/db/repositories/productVariantCostOverridesRepo";
import { createTariffCatalogRepo } from "../../src/db/repositories/tariffCatalogRepo";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { createTestEnv } from "../support/sqlite";

describe("tariff repositories", () => {
  it("stores product-type profile metadata, master tariff rows, and variant overrides", async () => {
    const { env } = createTestEnv();
    const catalogRepo = createTariffCatalogRepo(env.DB);
    const overridesRepo = createProductVariantCostOverridesRepo(env.DB);

    await loadUsTariffSeed(env.DB);

    const matches = await catalogRepo.searchCatalog("gumus kolye");
    expect(matches[0]?.canonicalHs6).toBe("711790");

    const profile = await catalogRepo.getUsProfileByCatalogId("catalog_711790");
    expect(profile?.profileName).toBe("925 gumus kolye");
    expect(profile?.confidenceMode).toBe("high_confidence");
    expect(profile?.masterEntry.htsCode10).toBe("7117.90.7500");
    expect(profile?.defaultShipentegraUsd).toBeGreaterThan(0);

    await overridesRepo.upsert({
      productId: "prod_1",
      ownerKey: "berke",
      variantId: "var_1",
      manualProductCostAmount: 550,
      manualProductCostCurrency: "TRY",
      manualShippingCostAmount: 7.5,
      manualShippingCostCurrency: "USD",
      updatedAt: Date.parse("2026-03-30T09:00:00.000Z"),
    });

    expect(await overridesRepo.getByVariantId("var_1")).toEqual(
      expect.objectContaining({
        manualProductCostAmount: 550,
        manualShippingCostAmount: 7.5,
      }),
    );
  });
});
