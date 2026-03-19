import { priceHistory, stockHistory } from "../schema";
import type { D1Database } from "../../config/bindings";
import type { PriceHistoryChange, StockHistoryChange } from "../../modules/sync/diffProductState";

export function createHistoryRepo(db: D1Database) {
  return {
    db,
    tables: {
      priceHistory,
      stockHistory,
    },
    async insertPriceHistory(productId: string, entries: PriceHistoryChange[]) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into price_history (
              id, product_id, variant_id, previous_price, new_price, changed_at, change_reason
            ) values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            null,
            entry.previousPrice,
            entry.newPrice,
            entry.changedAt,
            entry.changeReason,
          )
          .run();
      }
    },
    async insertStockHistory(productId: string, entries: StockHistoryChange[]) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into stock_history (
              id, product_id, variant_id, previous_stock_state, new_stock_state, changed_at
            ) values (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            entry.variantId,
            entry.previousStockState,
            entry.newStockState,
            entry.changedAt,
          )
          .run();
      }
    },
  };
}
