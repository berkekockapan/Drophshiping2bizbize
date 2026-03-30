import { expect, it } from "vitest";

import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { buildTariffRecommendations } from "../../src/modules/tariff/analysis/buildTariffRecommendations";
import { createTestEnv } from "../support/sqlite";

it("returns confidence state, selected profile, and lock reason", async () => {
  const { env } = createTestEnv();

  await loadUsTariffSeed(env.DB);

  const result = await buildTariffRecommendations(env.DB, {
    ownerKey: "berke",
    productId: "prod_1",
    title: "Belirsiz aksesuar",
    descriptionRaw: "karisik malzemeli el isi",
    category: "Aksesuar",
    attributes: [],
    images: [],
    aiContext: null,
  });

  expect(["high_confidence", "low_confidence"]).toContain(result.confidenceState);
  expect(result.selectedProfile).not.toBeNull();
  expect(result.selectedProfile?.profileName).toBeTruthy();
  if (result.confidenceState === "high_confidence") {
    expect(result.lockedReason).toBeNull();
  } else {
    expect(result.lockedReason).toMatch(/emin degil|bulunamadi/i);
  }
});
