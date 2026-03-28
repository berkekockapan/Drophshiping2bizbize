import type { D1Database } from '../../../config/bindings';
import type { OwnerKey } from '../../../contracts/owners';
import { createProductsRepo } from '../../../db/repositories/productsRepo';
import { createTariffCatalogRepo } from '../../../db/repositories/tariffCatalogRepo';
import { createTariffKnowledgeRepo } from '../../../db/repositories/tariffKnowledgeRepo';

export interface CreateTariffKnowledgeCandidateInput {
  ownerKey: string;
  productId: string;
  catalogId: string;
  usProfileId: string | null;
  candidateSource: string;
  notes?: string | null;
  submittedBy?: string;
  submittedAt?: number;
}

export async function createTariffKnowledgeCandidate(db: D1Database, input: CreateTariffKnowledgeCandidateInput) {
  const productsRepo = createProductsRepo(db);
  const catalogRepo = createTariffCatalogRepo(db);
  const repo = createTariffKnowledgeRepo(db);

  const product = await productsRepo.getTrackedProduct(input.productId, input.ownerKey as OwnerKey);
  if (!product) {
    return null;
  }

  const catalog = await catalogRepo.getByCatalogId(input.catalogId);
  if (!catalog) {
    throw new Error('Tarife katalog kaydi bulunamadi.');
  }

  if (input.usProfileId) {
    const profile = await catalogRepo.getUsProfileById(input.usProfileId);
    if (!profile || profile.catalogId != input.catalogId) {
      throw new Error('Tarife profili katalog kaydi ile uyusmuyor.');
    }
  }

  const submittedAt = input.submittedAt ?? Date.now();
  return repo.createCandidate({
    productId: input.productId,
    ownerKey: input.ownerKey,
    catalogId: input.catalogId,
    usProfileId: input.usProfileId,
    candidateSource: input.candidateSource,
    payloadJson: JSON.stringify({ selectedAt: submittedAt, notes: input.notes ?? null }),
    status: 'pending',
    submittedBy: input.submittedBy ?? input.ownerKey,
    submittedAt,
  });
}
