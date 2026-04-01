import type { CreateSourceProductRequest } from "@trendyol-etsy/shared";

import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";
import { normalizeSourceProductUrl } from "./normalizeSourceProductUrl";

export class DuplicateSourceProductError extends Error {
  constructor(public readonly sourceUrlNormalized: string) {
    super("Duplicate source product");
    this.name = "DuplicateSourceProductError";
  }
}

export async function createSourceProduct(
  db: D1Database,
  ownerKey: OwnerKey,
  input: CreateSourceProductRequest,
  now = new Date(),
) {
  const repo = createSourceProductsRepo(db);
  const sourceUrlNormalized = normalizeSourceProductUrl(input.sourceUrl);

  if (await repo.findByNormalizedSourceUrl(ownerKey, sourceUrlNormalized)) {
    throw new DuplicateSourceProductError(sourceUrlNormalized);
  }

  const id = crypto.randomUUID();
  return repo.createSourceProduct({
    id,
    ownerKey,
    sourceTitle: input.sourceTitle.trim(),
    sourceUrl: input.sourceUrl.trim(),
    sourceUrlNormalized,
    sourcePlatform: input.sourcePlatform,
    note: input.note ?? null,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  });
}
