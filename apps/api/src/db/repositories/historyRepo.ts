import { priceHistory, stockHistory } from "../schema";
import type { D1Database } from "../../config/bindings";

export function createHistoryRepo(db: D1Database) {
  return {
    db,
    tables: {
      priceHistory,
      stockHistory,
    },
  };
}
