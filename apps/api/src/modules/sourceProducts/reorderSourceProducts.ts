import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function reorderSourceProducts(
  db: D1Database,
  ownerKey: OwnerKey,
  categoryId: string | null,
  orderedIds: string[],
  now = new Date(),
) {
  if (orderedIds.length === 0) {
    return { orderedIds: [] };
  }

  const result = await createSourceProductsRepo(db).reorder(ownerKey, categoryId, orderedIds, now);
  if (!result) {
    return null;
  }

  return { orderedIds: result };
}
