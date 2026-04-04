import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductCategoriesRepo } from "../../db/repositories/sourceProductCategoriesRepo";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function setSourceProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  categoryId: string | null,
  now = new Date(),
) {
  const categoriesRepo = createSourceProductCategoriesRepo(db);
  if (categoryId !== null) {
    const category = await categoriesRepo.get(ownerKey, categoryId);
    if (!category) {
      return null;
    }
  }

  const updated = await createSourceProductsRepo(db).setCategory(ownerKey, sourceProductId, categoryId, now);
  if (!updated) {
    return null;
  }

  return {
    sourceProductId: updated.id,
    sourceCategory:
      updated.sourceCategoryId && updated.sourceCategoryName
        ? {
            id: updated.sourceCategoryId,
            name: updated.sourceCategoryName,
          }
        : null,
  };
}
