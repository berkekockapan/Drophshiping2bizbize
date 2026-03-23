import type { D1Database } from "../../config/bindings";
import type { ContentHistoryChange } from "../../modules/sync/diffProductState";
import { productContentHistory, productRefreshAudits } from "../schema";

export function createRefreshAuditRepo(db: D1Database) {
  return {
    db,
    tables: {
      productRefreshAudits,
      productContentHistory,
    },
    async insertAudit(input: {
      productId: string;
      source: "MANUAL" | "SCHEDULED";
      manualRefreshRunId: string | null;
      status: "SUCCESS" | "NO_CHANGE" | "PARSE_ERROR" | "FETCH_ERROR";
      changeCount: number;
      changedFields: string[];
      errorMessage: string | null;
      checkedAt: number;
    }) {
      const id = crypto.randomUUID();

      await db
        .prepare(
          `insert into product_refresh_audits (
            id, product_id, source, manual_refresh_run_id, status, change_count,
            changed_fields_json, error_message, checked_at, created_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          id,
          input.productId,
          input.source,
          input.manualRefreshRunId,
          input.status,
          input.changeCount,
          JSON.stringify(input.changedFields),
          input.errorMessage,
          input.checkedAt,
          input.checkedAt,
        )
        .run();

      return { id };
    },
    async insertContentHistory(productId: string, refreshAuditId: string, entries: ContentHistoryChange[]) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into product_content_history (
              id, product_id, refresh_audit_id, field_key, previous_value_raw, new_value_raw, changed_at, created_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            refreshAuditId,
            entry.fieldKey,
            entry.previousValueRaw,
            entry.newValueRaw,
            entry.changedAt,
            entry.changedAt,
          )
          .run();
      }
    },
  };
}
