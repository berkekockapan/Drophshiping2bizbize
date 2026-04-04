import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";
import { normalizeEtsyUrl } from "./normalizeEtsyUrl";

export class DuplicateSourceProductEtsyLinkError extends Error {
  constructor(public readonly etsyUrlNormalized: string) {
    super("Duplicate Etsy link");
    this.name = "DuplicateSourceProductEtsyLinkError";
  }
}

export async function addSourceProductEtsyLink(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  etsyUrl: string,
  now = new Date(),
) {
  const repo = createSourceProductsRepo(db);
  const normalized = normalizeEtsyUrl(etsyUrl);

  if (await repo.findByNormalizedEtsyUrl(ownerKey, normalized.normalizedUrl)) {
    throw new DuplicateSourceProductEtsyLinkError(normalized.normalizedUrl);
  }

  const id = crypto.randomUUID();
  return repo.createSourceProductEtsyLink({
    id,
    ownerKey,
    sourceProductId,
    etsyUrl: etsyUrl.trim(),
    etsyUrlNormalized: normalized.normalizedUrl,
    etsyListingId: normalized.listingId,
    createdAt: now.getTime(),
  });
}
