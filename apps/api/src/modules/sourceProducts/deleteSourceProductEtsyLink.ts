import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function deleteSourceProductEtsyLink(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  etsyLinkId: string,
  now = new Date(),
) {
  void now;
  return createSourceProductsRepo(db).deleteEtsyLink(ownerKey, sourceProductId, etsyLinkId);
}
