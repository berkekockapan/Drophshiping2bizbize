import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function setSourceProductUserCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  categoryId: string | null,
  now = new Date(),
) {
  const result = await createSourceProductsRepo(db).setUserCategory(ownerKey, sourceProductId, categoryId, now);
  if (!result) {
    return null;
  }

  return {
    sourceProductId: result.id,
    userCategory: result.userCategory,
  };
}
