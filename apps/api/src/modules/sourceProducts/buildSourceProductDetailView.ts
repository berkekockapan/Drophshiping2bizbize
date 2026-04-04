import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function buildSourceProductDetailView(db: D1Database, ownerKey: OwnerKey, sourceProductId: string) {
  const detail = await createSourceProductsRepo(db).getManagementDetail(ownerKey, sourceProductId);
  if (!detail) {
    return null;
  }

  const { sourceCategoryId, sourceCategoryName, ...sourceProduct } = detail.sourceProduct;

  return {
    ...detail,
    sourceProduct: {
      ...sourceProduct,
      sourceCategory:
        sourceCategoryId && sourceCategoryName
          ? {
              id: sourceCategoryId,
              name: sourceCategoryName,
            }
          : null,
    },
  };
}
