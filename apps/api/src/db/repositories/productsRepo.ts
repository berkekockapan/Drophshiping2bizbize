import { products, productVariants, productCurrentState } from "../schema";
import type { D1Database } from "../../config/bindings";

export function createProductsRepo(db: D1Database) {
  return {
    db,
    tables: {
      products,
      productVariants,
      productCurrentState,
    },
  };
}
