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
    async listRefreshAudits(productId: string) {
      return (
        await db
          .prepare(
            `select id, product_id as productId, source, manual_refresh_run_id as manualRefreshRunId,
                    status, change_count as changeCount, changed_fields_json as changedFieldsJson,
                    error_message as errorMessage, checked_at as checkedAt
             from product_refresh_audits
             where product_id = ?
             order by checked_at desc`,
          )
          .bind(productId)
          .all()
      ).results;
    },
    async listContentHistory(productId: string) {
      return (
        await db
          .prepare(
            `select id, product_id as productId, refresh_audit_id as refreshAuditId, field_key as fieldKey,
                    previous_value_raw as previousValueRaw, new_value_raw as newValueRaw, changed_at as changedAt
             from product_content_history
             where product_id = ?
             order by changed_at desc`,
          )
          .bind(productId)
          .all()
      ).results;
    },
  };
}
