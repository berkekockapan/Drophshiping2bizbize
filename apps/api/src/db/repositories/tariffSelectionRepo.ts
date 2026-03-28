import type { D1Database } from '../../config/bindings';
import { runWithWriteRetry } from '../runWithWriteRetry';

export interface UpsertTariffSelectionInput {
  productId: string;
  ownerKey: string;
  catalogId: string;
  usProfileId: string | null;
  selectionSource: string;
  selectedBy: string;
  selectedAt: number;
  analysisRunId?: string | null;
}

export interface TariffSelectionRow {
  productId: string;
  ownerKey: string;
  catalogId: string;
  usProfileId: string | null;
  selectionSource: string;
  selectedBy: string;
  selectedAt: number;
  analysisRunId: string | null;
  createdAt: number;
  updatedAt: number;
  canonicalHs6: string;
  title: string;
  combinedDutyRate: number | null;
  generalDutyRate: number | null;
  additionalDutyRate: number | null;
  dutySummary: string | null;
  revisionLabel: string | null;
}

export function createTariffSelectionRepo(db: D1Database) {
  return {
    async upsertSelection(input: UpsertTariffSelectionInput) {
      const now = input.selectedAt;

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into product_tariff_selection
             (product_id, owner_key, catalog_id, us_profile_id, selection_source, selected_by, selected_at, analysis_run_id, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             on conflict(product_id) do update set
               owner_key = excluded.owner_key,
               catalog_id = excluded.catalog_id,
               us_profile_id = excluded.us_profile_id,
               selection_source = excluded.selection_source,
               selected_by = excluded.selected_by,
               selected_at = excluded.selected_at,
               analysis_run_id = excluded.analysis_run_id,
               updated_at = excluded.updated_at`,
          )
          .bind(
            input.productId,
            input.ownerKey,
            input.catalogId,
            input.usProfileId,
            input.selectionSource,
            input.selectedBy,
            input.selectedAt,
            input.analysisRunId ?? null,
            now,
            now,
          )
          .run();
      });

      return this.getSelection(input.productId);
    },
    async getSelection(productId: string) {
      return db
        .prepare(
          `select s.product_id as productId, s.owner_key as ownerKey, s.catalog_id as catalogId, s.us_profile_id as usProfileId,
                  s.selection_source as selectionSource, s.selected_by as selectedBy, s.selected_at as selectedAt,
                  s.analysis_run_id as analysisRunId, s.created_at as createdAt, s.updated_at as updatedAt,
                  c.canonical_hs6 as canonicalHs6, c.title,
                  p.combined_duty_rate as combinedDutyRate, p.general_duty_rate as generalDutyRate,
                  p.additional_duty_rate as additionalDutyRate, p.summary_text as dutySummary, p.revision_label as revisionLabel
           from product_tariff_selection s
           join tariff_classification_catalog c on c.id = s.catalog_id
           left join tariff_classification_us_profiles p on p.id = s.us_profile_id
           where s.product_id = ?
           limit 1`,
        )
        .bind(productId)
        .first<TariffSelectionRow>();
    },
  };
}
