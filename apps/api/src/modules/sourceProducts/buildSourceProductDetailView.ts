import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function buildSourceProductDetailView(db: D1Database, ownerKey: OwnerKey, sourceProductId: string) {
  return createSourceProductsRepo(db).getDetail(ownerKey, sourceProductId);
}
