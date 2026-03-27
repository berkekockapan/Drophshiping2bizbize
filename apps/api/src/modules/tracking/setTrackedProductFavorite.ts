import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export async function setTrackedProductFavorite(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  isFavorite: boolean,
  now: Date = new Date(),
) {
  const productsRepo = createProductsRepo(db);
  return productsRepo.setFavorite(ownerKey, productId, isFavorite, now);
}
