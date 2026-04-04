import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function restoreSourceProduct(db: D1Database, ownerKey: OwnerKey, sourceProductId: string, now = new Date()) {
  return createSourceProductsRepo(db).restore(ownerKey, sourceProductId, now);
}
