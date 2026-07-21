import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { createProductEtsyLinksRepo } from "../../db/repositories/productEtsyLinksRepo";
import { normalizeEtsyUrl } from "../sourceProducts/normalizeEtsyUrl";

export class DuplicateTrackedProductEtsyLinkError extends Error {
  constructor(public readonly etsyUrlNormalized: string) {
    super("Duplicate Etsy link");
    this.name = "DuplicateTrackedProductEtsyLinkError";
  }
}

export async function addTrackedProductEtsyLink(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  etsyUrl: string,
  now = new Date(),
) {
  const repo = createProductEtsyLinksRepo(db);
  const normalized = normalizeEtsyUrl(etsyUrl);

  if (await repo.findByNormalizedUrl(ownerKey, normalized.normalizedUrl)) {
    throw new DuplicateTrackedProductEtsyLinkError(normalized.normalizedUrl);
  }

  return repo.create({
    id: crypto.randomUUID(),
    productId,
    ownerKey,
    etsyUrl: etsyUrl.trim(),
    etsyUrlNormalized: normalized.normalizedUrl,
    etsyListingId: normalized.listingId,
    createdAt: now.getTime(),
  });
}
