import { describe, expect, it } from "vitest";

import { createTariffCatalogRepo } from "../../src/db/repositories/tariffCatalogRepo";
import { loadUsTariffSeed } from "../../src/modules/tariff/catalog/loadUsTariffSeed";
import { createTestEnv } from "../support/sqlite";

describe("tariff repositories", () => {
  it("loads seed rows and can search by keyword", async () => {
    const { env } = createTestEnv();
    const repo = createTariffCatalogRepo(env.DB);

    await loadUsTariffSeed(env.DB);

    const matches = await repo.searchCatalog("deri taki");
    expect(matches[0]?.canonicalHs6).toBe("711790");

    const profile = await repo.getUsProfileByCatalogId(matches[0]!.id);
    expect(profile?.combinedDutyRate).toBeGreaterThan(0);
  });
});
