import type { D1Database } from '../../../config/bindings';
import type { OwnerKey } from '../../../contracts/owners';
import { createProductsRepo } from '../../../db/repositories/productsRepo';
import { createTariffCatalogRepo } from '../../../db/repositories/tariffCatalogRepo';
import { createTariffSelectionRepo } from '../../../db/repositories/tariffSelectionRepo';

export interface SaveProductTariffSelectionInput {
  ownerKey: string;
  productId: string;
  catalogId: string;
  usProfileId: string | null;
  selectionSource: string;
  selectedBy?: string;
  analysisRunId?: string | null;
  now?: number;
}

export async function saveProductTariffSelection(db: D1Database, input: SaveProductTariffSelectionInput) {
  const productsRepo = createProductsRepo(db);
  const catalogRepo = createTariffCatalogRepo(db);
  const selectionRepo = createTariffSelectionRepo(db);

  const product = await productsRepo.getTrackedProduct(input.productId, input.ownerKey as OwnerKey);
  if (!product) {
    return null;
  }

  const catalog = await catalogRepo.getByCatalogId(input.catalogId);
  if (!catalog) {
    throw new Error('Tarife katalog kaydi bulunamadi.');
  }

  let usProfileId = input.usProfileId;
  if (usProfileId) {
    const profile = await catalogRepo.getUsProfileById(usProfileId);
    if (!profile || profile.catalogId !== input.catalogId) {
      throw new Error('Tarife profili katalog kaydi ile uyusmuyor.');
    }
  } else {
    usProfileId = (await catalogRepo.getUsProfileByCatalogId(input.catalogId))?.id ?? null;
  }

  return selectionRepo.upsertSelection({
    productId: input.productId,
    ownerKey: input.ownerKey,
    catalogId: input.catalogId,
    usProfileId,
    selectionSource: input.selectionSource,
    selectedBy: input.selectedBy ?? input.ownerKey,
    selectedAt: input.now ?? Date.now(),
    analysisRunId: input.analysisRunId ?? null,
  });
}
