import type { D1Database } from "../../config/bindings";
import type { OwnerKey } from "../../contracts/owners";
import { createProductEtsyLinksRepo } from "../../db/repositories/productEtsyLinksRepo";

export async function deleteTrackedProductEtsyLink(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  etsyLinkId: string,
) {
  return createProductEtsyLinksRepo(db).delete(ownerKey, productId, etsyLinkId);
}
