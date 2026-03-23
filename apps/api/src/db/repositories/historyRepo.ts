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
    async insertPriceHistory(productId: string, refreshAuditId: string, entries: PriceHistoryChange[]) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into price_history (
              id, product_id, variant_id, previous_price, new_price, changed_at, change_reason, refresh_audit_id
            ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            entry.variantId,
            entry.previousPrice,
            entry.newPrice,
            entry.changedAt,
            entry.changeReason,
            refreshAuditId,
          )
          .run();
      }
    },
    async insertStockHistory(productId: string, refreshAuditId: string, entries: StockHistoryChange[]) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into stock_history (
              id, product_id, variant_id, previous_stock_state, new_stock_state, changed_at, refresh_audit_id
            ) values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            entry.variantId,
            entry.previousStockState,
            entry.newStockState,
            entry.changedAt,
            refreshAuditId,
          )
          .run();
      }
    },
    async listPriceHistory(productId: string) {
      const result = await db
        .prepare(
          `select id, product_id as productId, variant_id as variantId, previous_price as previousPrice,
                  new_price as newPrice, changed_at as changedAt, change_reason as changeReason,
                  refresh_audit_id as refreshAuditId
           from price_history
           where product_id = ?
           order by changed_at desc`,
        )
        .bind(productId)
        .all();

      return result.results;
    },
    async listStockHistory(productId: string) {
      const result = await db
        .prepare(
          `select id, product_id as productId, variant_id as variantId, previous_stock_state as previousStockState,
                  new_stock_state as newStockState, changed_at as changedAt, refresh_audit_id as refreshAuditId
           from stock_history
           where product_id = ?
           order by changed_at desc`,
        )
        .bind(productId)
        .all();

      return result.results;
    },
  };
}
