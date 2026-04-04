import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function buildSourceProductsListView(db: D1Database, ownerKey: OwnerKey, search: string | null) {
  return createSourceProductsRepo(db).listSourceProducts(ownerKey, search);
}
