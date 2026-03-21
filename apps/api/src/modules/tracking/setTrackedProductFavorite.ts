import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export async function setTrackedProductFavorite(
  db: D1Database,
  productId: string,
  isFavorite: boolean,
  now: Date = new Date(),
) {
  const productsRepo = createProductsRepo(db);
  const product = await productsRepo.getTrackedProduct(productId);

  if (!product) {
    return null;
  }

  await productsRepo.setTrackedProductFavorite(productId, isFavorite, now);

  return {
    productId,
    isFavorite,
  };
}
