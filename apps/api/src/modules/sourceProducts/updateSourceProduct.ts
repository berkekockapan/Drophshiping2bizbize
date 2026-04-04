import type { PatchSourceProductRequest } from "@trendyol-etsy/shared";

import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";
import { DuplicateSourceProductError } from "./createSourceProduct";
import { normalizeSourceProductUrl } from "./normalizeSourceProductUrl";

export async function updateSourceProduct(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  patch: PatchSourceProductRequest,
  now = new Date(),
) {
  const repo = createSourceProductsRepo(db);
  const sourceUrlNormalized = patch.sourceUrl ? normalizeSourceProductUrl(patch.sourceUrl) : undefined;

  if (sourceUrlNormalized && (await repo.findByNormalizedSourceUrl(ownerKey, sourceUrlNormalized, sourceProductId))) {
    throw new DuplicateSourceProductError(sourceUrlNormalized);
  }

  return repo.updateSourceProduct(ownerKey, sourceProductId, {
    sourceTitle: patch.sourceTitle?.trim(),
    sourceUrl: patch.sourceUrl?.trim(),
    sourceUrlNormalized,
    sourcePlatform: patch.sourcePlatform,
    note: patch.note,
    updatedAt: now.getTime(),
  });
}
