import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createSourceProductsRepo } from "../../db/repositories/sourceProductsRepo";

export async function setSourceProductShops(
  db: D1Database,
  ownerKey: OwnerKey,
  sourceProductId: string,
  shopIds: string[],
  now = new Date(),
) {
  const result = await createSourceProductsRepo(db).setShops(ownerKey, sourceProductId, shopIds, now);
  if (!result) {
    return null;
  }

  return {
    sourceProductId: result.id,
    shops: result.shops,
  };
}
