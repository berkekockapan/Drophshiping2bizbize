import type { D1Database } from '../../../config/bindings';
import { createTariffCatalogRepo } from '../../../db/repositories/tariffCatalogRepo';

import { US_TARIFF_SEED } from './usTariffSeed';

export async function loadUsTariffSeed(db: D1Database) {
  const repo = createTariffCatalogRepo(db);

  for (const item of US_TARIFF_SEED) {
    await repo.upsertCatalogWithUsProfile(item);
  }

  return US_TARIFF_SEED.length;
}
