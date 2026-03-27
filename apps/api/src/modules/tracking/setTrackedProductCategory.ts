import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createProductCategoriesRepo } from "../../db/repositories/productCategoriesRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export async function setTrackedProductCategory(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  categoryId: string | null,
  now = new Date(),
) {
  const productsRepo = createProductsRepo(db);
  const categoriesRepo = createProductCategoriesRepo(db);

  const trackedProduct = await productsRepo.getTrackedProduct(productId, ownerKey);
  if (!trackedProduct) {
    return null;
  }

  if (categoryId !== null) {
    const category = await categoriesRepo.get(ownerKey, categoryId);
    if (!category) {
      return null;
    }
  }

  const result = await productsRepo.setUserCategory(ownerKey, productId, categoryId, now);
  if (!result) {
    return null;
  }

  return {
    productId: result.productId,
    userCategory:
      result.userCategory === null
        ? null
        : {
            id: result.userCategory.id,
            name: result.userCategory.name,
          },
  };
}
