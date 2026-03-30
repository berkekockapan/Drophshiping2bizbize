import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

import type { TariffSeedItem } from "../../modules/tariff/catalog/usTariffSeed";

export interface TariffCatalogSearchRow {
  id: string;
  canonicalHs6: string;
  title: string;
  description: string | null;
  keywords: string[];
  sourceType: string;
  sourceVersion: string;
  effectiveFrom: number | null;
  effectiveTo: number | null;
  score: number;
}

export interface TariffMasterUsEntryRow {
  id: string;
  htsCode8: string;
  htsCode10: string;
  description: string;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  sourceRevision: string;
  sourceUrl: string | null;
  effectiveFrom: number | null;
  effectiveTo: number | null;
}

export interface TariffUsProfileRow {
  id: string;
  catalogId: string;
  profileName: string | null;
  confidenceMode: string;
  defaultShipentegraUsd: number | null;
  masterEntryId: string | null;
  masterEntry: TariffMasterUsEntryRow | null;
  htsusCode: string | null;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  summaryText: string;
  revisionLabel: string;
}

type CatalogRow = {
  id: string;
  canonicalHs6: string;
  title: string;
  description: string | null;
  keywordsJson: string | null;
  sourceType: string;
  sourceVersion: string;
  effectiveFrom: number | null;
  effectiveTo: number | null;
};

type TariffProfileQueryRow = {
  id: string;
  catalogId: string;
  profileName: string | null;
  confidenceMode: string;
  defaultShipentegraUsd: number | null;
  masterEntryId: string | null;
  htsusCode: string | null;
  generalDutyRate: number | null;
  additionalDutyRate: number | null;
  combinedDutyRate: number | null;
  summaryText: string | null;
  revisionLabel: string | null;
  masterHtsCode8: string | null;
  masterHtsCode10: string | null;
  masterDescription: string | null;
  masterGeneralDutyRate: number | null;
  masterAdditionalDutyRate: number | null;
  masterCombinedDutyRate: number | null;
  masterDutySummary: string | null;
  masterSourceRevision: string | null;
  masterSourceUrl: string | null;
  masterEffectiveFrom: number | null;
  masterEffectiveTo: number | null;
};

function parseKeywords(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function normalize(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function tokenize(query: string) {
  return Array.from(new Set(normalize(query).split(/[^a-z0-9]+/i).filter(Boolean)));
}

function computeScore(tokens: string[], row: { canonicalHs6: string; title: string; description: string | null; keywords: string[] }) {
  if (tokens.length === 0) {
    return 0;
  }

  const title = normalize(row.title);
  const description = normalize(row.description ?? "");
  const keywords = row.keywords.map((item) => normalize(item));
  const hs6 = normalize(row.canonicalHs6);

  let score = 0;
  for (const token of tokens) {
    if (hs6.includes(token)) {
      score += 120;
    }
    if (title.includes(token)) {
      score += 50;
    }
    if (description.includes(token)) {
      score += 30;
    }
    if (keywords.some((keyword) => keyword.includes(token))) {
      score += 40;
    }
  }

  return score;
}

function buildLegacyUsProfileId(item: TariffSeedItem) {
  if (item.usProfileId) {
    return item.usProfileId;
  }

  const suffix = (item.sourceVersion ?? "2026-r4").replace(/[^a-z0-9]+/gi, "");
  return `us_${item.canonicalHs6}_${suffix}`;
}

function mapCatalogRow(row: CatalogRow) {
  return {
    ...row,
    keywords: parseKeywords(row.keywordsJson),
  };
}

function mapProfileRow(row: TariffProfileQueryRow): TariffUsProfileRow {
  const masterEntry =
    row.masterEntryId &&
    row.masterHtsCode8 &&
    row.masterHtsCode10 &&
    row.masterDescription &&
    row.masterDutySummary &&
    row.masterSourceRevision
      ? {
          id: row.masterEntryId,
          htsCode8: row.masterHtsCode8,
          htsCode10: row.masterHtsCode10,
          description: row.masterDescription,
          generalDutyRate: row.masterGeneralDutyRate ?? row.generalDutyRate ?? 0,
          additionalDutyRate: row.masterAdditionalDutyRate ?? row.additionalDutyRate ?? 0,
          combinedDutyRate: row.masterCombinedDutyRate ?? row.combinedDutyRate ?? 0,
          dutySummary: row.masterDutySummary,
          sourceRevision: row.masterSourceRevision,
          sourceUrl: row.masterSourceUrl,
          effectiveFrom: row.masterEffectiveFrom,
          effectiveTo: row.masterEffectiveTo,
        }
      : null;

  return {
    id: row.id,
    catalogId: row.catalogId,
    profileName: row.profileName,
    confidenceMode: row.confidenceMode,
    defaultShipentegraUsd: row.defaultShipentegraUsd,
    masterEntryId: row.masterEntryId,
    masterEntry,
    htsusCode: row.htsusCode ?? masterEntry?.htsCode10 ?? null,
    generalDutyRate: row.generalDutyRate ?? masterEntry?.generalDutyRate ?? 0,
    additionalDutyRate: row.additionalDutyRate ?? masterEntry?.additionalDutyRate ?? 0,
    combinedDutyRate: row.combinedDutyRate ?? masterEntry?.combinedDutyRate ?? 0,
    summaryText: row.summaryText ?? masterEntry?.dutySummary ?? "",
    revisionLabel: row.revisionLabel ?? masterEntry?.sourceRevision ?? "",
  };
}

const profileSelect = `
  select p.id, p.catalog_id as catalogId,
         c.profile_name as profileName,
         c.confidence_mode as confidenceMode,
         c.default_shipentegra_usd as defaultShipentegraUsd,
         c.master_entry_id as masterEntryId,
         p.htsus_code as htsusCode,
         p.general_duty_rate as generalDutyRate,
         p.additional_duty_rate as additionalDutyRate,
         p.combined_duty_rate as combinedDutyRate,
         p.summary_text as summaryText,
         p.revision_label as revisionLabel,
         m.hts_code_8 as masterHtsCode8,
         m.hts_code_10 as masterHtsCode10,
         m.description as masterDescription,
         m.general_duty_rate as masterGeneralDutyRate,
         m.additional_duty_rate as masterAdditionalDutyRate,
         m.combined_duty_rate as masterCombinedDutyRate,
         m.duty_summary as masterDutySummary,
         m.source_revision as masterSourceRevision,
         m.source_url as masterSourceUrl,
         m.effective_from as masterEffectiveFrom,
         m.effective_to as masterEffectiveTo
  from tariff_classification_us_profiles p
  join tariff_classification_catalog c on c.id = p.catalog_id
  left join tariff_master_us_entries m on m.id = c.master_entry_id
`;

export function createTariffCatalogRepo(db: D1Database) {
  return {
    async upsertCatalogWithUsProfile(item: TariffSeedItem) {
      const now = Date.now();
      const legacyUsProfileId = buildLegacyUsProfileId(item);

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert or replace into tariff_master_us_entries
             (id, hts_code_8, hts_code_10, description, general_duty_rate, additional_duty_rate, combined_duty_rate, duty_summary, source_revision, source_url, effective_from, effective_to, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce((select created_at from tariff_master_us_entries where id = ?), ?), ?)`,
          )
          .bind(
            item.masterEntry.id,
            item.masterEntry.htsCode8,
            item.masterEntry.htsCode10,
            item.masterEntry.description,
            item.masterEntry.generalDutyRate,
            item.masterEntry.additionalDutyRate,
            item.masterEntry.combinedDutyRate,
            item.masterEntry.dutySummary,
            item.masterEntry.sourceRevision,
            item.masterEntry.sourceUrl,
            item.effectiveFrom ?? null,
            item.effectiveTo ?? null,
            item.masterEntry.id,
            now,
            now,
          )
          .run();

        await db
          .prepare(
            `insert or replace into tariff_classification_catalog
             (id, canonical_hs6, profile_name, title, description, keywords_json, source_type, source_version, confidence_mode, master_entry_id, default_shipentegra_usd, effective_from, effective_to, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce((select created_at from tariff_classification_catalog where id = ?), ?), ?)`,
          )
          .bind(
            item.catalogId,
            item.canonicalHs6,
            item.profileName,
            item.title,
            item.description,
            JSON.stringify(item.keywords),
            item.sourceType ?? "seed",
            item.sourceVersion ?? "2026-r4",
            item.confidenceMode,
            item.masterEntry.id,
            item.defaultShipentegraUsd,
            item.effectiveFrom ?? null,
            item.effectiveTo ?? null,
            item.catalogId,
            now,
            now,
          )
          .run();

        await db
          .prepare(
            `insert or replace into tariff_classification_us_profiles
             (id, catalog_id, htsus_code, general_duty_rate, additional_duty_rate, combined_duty_rate, summary_text, revision_label, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, coalesce((select created_at from tariff_classification_us_profiles where id = ?), ?), ?)`,
          )
          .bind(
            legacyUsProfileId,
            item.catalogId,
            item.masterEntry.htsCode10,
            item.masterEntry.generalDutyRate,
            item.masterEntry.additionalDutyRate,
            item.masterEntry.combinedDutyRate,
            item.masterEntry.dutySummary,
            item.masterEntry.sourceRevision,
            legacyUsProfileId,
            now,
            now,
          )
          .run();
      });
    },
    async searchCatalog(query: string, limit = 10) {
      const rows = (
        await db
          .prepare(
            `select id, canonical_hs6 as canonicalHs6, title, description, keywords_json as keywordsJson,
                    source_type as sourceType, source_version as sourceVersion,
                    effective_from as effectiveFrom, effective_to as effectiveTo
             from tariff_classification_catalog`,
          )
          .all<CatalogRow>()
      ).results;

      const tokens = tokenize(query);
      return rows
        .map<TariffCatalogSearchRow>((row) => {
          const mappedRow = mapCatalogRow(row);

          return {
            id: mappedRow.id,
            canonicalHs6: mappedRow.canonicalHs6,
            title: mappedRow.title,
            description: mappedRow.description,
            keywords: mappedRow.keywords,
            sourceType: mappedRow.sourceType,
            sourceVersion: mappedRow.sourceVersion,
            effectiveFrom: mappedRow.effectiveFrom,
            effectiveTo: mappedRow.effectiveTo,
            score: computeScore(tokens, {
              canonicalHs6: mappedRow.canonicalHs6,
              title: mappedRow.title,
              description: mappedRow.description,
              keywords: mappedRow.keywords,
            }),
          };
        })
        .filter((row) => row.score > 0)
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, limit);
    },
    async getByCatalogId(catalogId: string) {
      const row = await db
        .prepare(
          `select id, canonical_hs6 as canonicalHs6, title, description, keywords_json as keywordsJson,
                  source_type as sourceType, source_version as sourceVersion,
                  effective_from as effectiveFrom, effective_to as effectiveTo
           from tariff_classification_catalog
           where id = ?
           limit 1`,
        )
        .bind(catalogId)
        .first<CatalogRow>();

      return row ? mapCatalogRow(row) : null;
    },
    async getUsProfileByCatalogId(catalogId: string) {
      const row = await db
        .prepare(
          `${profileSelect}
           where p.catalog_id = ?
           limit 1`,
        )
        .bind(catalogId)
        .first<TariffProfileQueryRow>();

      return row ? mapProfileRow(row) : null;
    },
    async getUsProfileById(profileId: string) {
      const row = await db
        .prepare(
          `${profileSelect}
           where p.id = ?
           limit 1`,
        )
        .bind(profileId)
        .first<TariffProfileQueryRow>();

      return row ? mapProfileRow(row) : null;
    },
  };
}
