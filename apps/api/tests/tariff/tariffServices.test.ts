import { expect, it } from "vitest";

import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { buildTariffRecommendations } from "../../src/modules/tariff/analysis/buildTariffRecommendations";
import { createTestEnv } from "../support/sqlite";

it("returns best 2 recommendations without AI", async () => {
  const { env } = createTestEnv();

  await loadUsTariffSeed(env.DB);

  const result = await buildTariffRecommendations(env.DB, {
    ownerKey: "berke",
    productId: "prod_1",
    title: "Deri bileklik taki",
    descriptionRaw: "El yapimi deri aksesuar",
    category: "Aksesuar",
    attributes: [{ key: "Materyal", value: "Deri" }],
    images: [],
    aiContext: null,
  });

  expect(result.usedAi).toBe(false);
  expect(result.recommendations).toHaveLength(2);
  expect(result.recommendations[0]?.canonicalHs6).toBe("711790");
});
