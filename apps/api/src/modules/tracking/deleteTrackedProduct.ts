import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export async function deleteTrackedProduct(db: D1Database, productId: string) {
  const productsRepo = createProductsRepo(db);
  const product = await productsRepo.getTrackedProduct(productId);

  if (!product) {
    return false;
  }

  await productsRepo.deleteTrackedProduct(productId);
  return true;
}
