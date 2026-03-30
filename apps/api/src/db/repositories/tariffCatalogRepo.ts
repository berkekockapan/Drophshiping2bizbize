import type { D1Database } from '../../config/bindings';
import { runWithWriteRetry } from '../runWithWriteRetry';

import type { TariffSeedItem } from '../../modules/tariff/catalog/usTariffSeed';

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

export interface TariffUsProfileRow {
  id: string;
  catalogId: string;
  htsusCode: string;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  summaryText: string;
  revisionLabel: string;
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

export interface TariffCatalogUsProfileRow extends TariffUsProfileRow {
  profileName: string | null;
  confidenceMode: 'high_confidence' | 'low_confidence';
  defaultShipentegraUsd: number | null;
  masterEntry: TariffMasterUsEntryRow | null;
}

function parseKeywords(value: string | null) {
  if (!value) {
    return [] as string[];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokenize(query: string) {
  return Array.from(new Set(normalize(query).split(/[^a-z0-9]+/i).filter(Boolean)));
}

function computeScore(tokens: string[], row: { canonicalHs6: string; title: string; description: string | null; keywords: string[] }) {
  if (tokens.length === 0) {
    return 0;
  }

  const title = normalize(row.title);
  const description = normalize(row.description ?? '');
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

export function createTariffCatalogRepo(db: D1Database) {
  return {
    async upsertCatalogWithUsProfile(item: TariffSeedItem) {
      const now = Date.now();

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
            item.sourceType ?? 'seed',
            item.sourceVersion ?? '2026-r4',
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
            item.usProfileId,
            item.catalogId,
            item.masterEntry.htsCode10,
            item.masterEntry.generalDutyRate,
            item.masterEntry.additionalDutyRate,
            item.masterEntry.combinedDutyRate,
            item.masterEntry.dutySummary,
            item.masterEntry.sourceRevision,
            item.usProfileId,
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
          .all<{
            id: string;
            canonicalHs6: string;
            title: string;
            description: string | null;
            keywordsJson: string | null;
            sourceType: string;
            sourceVersion: string;
            effectiveFrom: number | null;
            effectiveTo: number | null;
          }>()
      ).results;

      const tokens = tokenize(query);
      return rows
        .map<TariffCatalogSearchRow>((row) => ({
          id: row.id,
          canonicalHs6: row.canonicalHs6,
          title: row.title,
          description: row.description,
          keywords: parseKeywords(row.keywordsJson),
          sourceType: row.sourceType,
          sourceVersion: row.sourceVersion,
          effectiveFrom: row.effectiveFrom,
          effectiveTo: row.effectiveTo,
          score: computeScore(tokens, {
            canonicalHs6: row.canonicalHs6,
            title: row.title,
            description: row.description,
            keywords: parseKeywords(row.keywordsJson),
          }),
        }))
        .filter((row) => row.score > 0)
        .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
        .slice(0, limit);
    },
    async getByCatalogId(catalogId: string) {
      return db
        .prepare(
          `select id, canonical_hs6 as canonicalHs6, title, description, keywords_json as keywordsJson,
                  source_type as sourceType, source_version as sourceVersion,
                  effective_from as effectiveFrom, effective_to as effectiveTo
           from tariff_classification_catalog
           where id = ?
           limit 1`,
        )
        .bind(catalogId)
        .first<{
          id: string;
          canonicalHs6: string;
          title: string;
          description: string | null;
          keywordsJson: string | null;
          sourceType: string;
          sourceVersion: string;
          effectiveFrom: number | null;
          effectiveTo: number | null;
        }>()
        .then((row) =>
          row
            ? {
                ...row,
                keywords: parseKeywords(row.keywordsJson),
              }
            : null,
        );
    },
    async getUsProfileByCatalogId(catalogId: string) {
      return db
        .prepare(
          `select p.id, c.id as catalogId, p.htsus_code as htsusCode,
                  p.general_duty_rate as generalDutyRate, p.additional_duty_rate as additionalDutyRate,
                  p.combined_duty_rate as combinedDutyRate, p.summary_text as summaryText,
                  p.revision_label as revisionLabel, c.profile_name as profileName,
                  c.confidence_mode as confidenceMode, c.default_shipentegra_usd as defaultShipentegraUsd,
                  c.master_entry_id as masterEntryId, m.hts_code_8 as masterEntryHtsCode8,
                  m.hts_code_10 as masterEntryHtsCode10, m.description as masterEntryDescription,
                  m.general_duty_rate as masterEntryGeneralDutyRate,
                  m.additional_duty_rate as masterEntryAdditionalDutyRate,
                  m.combined_duty_rate as masterEntryCombinedDutyRate,
                  m.duty_summary as masterEntryDutySummary, m.source_revision as masterEntrySourceRevision,
                  m.source_url as masterEntrySourceUrl, m.effective_from as masterEntryEffectiveFrom,
                  m.effective_to as masterEntryEffectiveTo
           from tariff_classification_catalog c
           left join tariff_classification_us_profiles p on p.catalog_id = c.id
           left join tariff_master_us_entries m on m.id = c.master_entry_id
           where c.id = ?
           limit 1`,
        )
        .bind(catalogId)
        .first<{
          id: string | null;
          catalogId: string;
          htsusCode: string | null;
          generalDutyRate: number | null;
          additionalDutyRate: number | null;
          combinedDutyRate: number | null;
          summaryText: string | null;
          revisionLabel: string | null;
          profileName: string | null;
          confidenceMode: 'high_confidence' | 'low_confidence';
          defaultShipentegraUsd: number | null;
          masterEntryId: string | null;
          masterEntryHtsCode8: string | null;
          masterEntryHtsCode10: string | null;
          masterEntryDescription: string | null;
          masterEntryGeneralDutyRate: number | null;
          masterEntryAdditionalDutyRate: number | null;
          masterEntryCombinedDutyRate: number | null;
          masterEntryDutySummary: string | null;
          masterEntrySourceRevision: string | null;
          masterEntrySourceUrl: string | null;
          masterEntryEffectiveFrom: number | null;
          masterEntryEffectiveTo: number | null;
        }>()
        .then((row) => {
          if (!row) {
            return null;
          }

          const masterEntry = row.masterEntryId
            ? {
                id: row.masterEntryId,
                htsCode8: row.masterEntryHtsCode8 ?? '',
                htsCode10: row.masterEntryHtsCode10 ?? '',
                description: row.masterEntryDescription ?? '',
                generalDutyRate: row.masterEntryGeneralDutyRate ?? 0,
                additionalDutyRate: row.masterEntryAdditionalDutyRate ?? 0,
                combinedDutyRate: row.masterEntryCombinedDutyRate ?? 0,
                dutySummary: row.masterEntryDutySummary ?? '',
                sourceRevision: row.masterEntrySourceRevision ?? '',
                sourceUrl: row.masterEntrySourceUrl,
                effectiveFrom: row.masterEntryEffectiveFrom,
                effectiveTo: row.masterEntryEffectiveTo,
              }
            : null;

          return {
            id: row.id ?? row.masterEntryId ?? row.catalogId,
            catalogId: row.catalogId,
            htsusCode: row.htsusCode ?? masterEntry?.htsCode10 ?? '',
            generalDutyRate: row.generalDutyRate ?? masterEntry?.generalDutyRate ?? 0,
            additionalDutyRate: row.additionalDutyRate ?? masterEntry?.additionalDutyRate ?? 0,
            combinedDutyRate: row.combinedDutyRate ?? masterEntry?.combinedDutyRate ?? 0,
            summaryText: row.summaryText ?? masterEntry?.dutySummary ?? '',
            revisionLabel: row.revisionLabel ?? masterEntry?.sourceRevision ?? '',
            profileName: row.profileName,
            confidenceMode: row.confidenceMode,
            defaultShipentegraUsd: row.defaultShipentegraUsd,
            masterEntry,
          } satisfies TariffCatalogUsProfileRow;
        });
    },
    async getUsProfileById(profileId: string) {
      return db
        .prepare(
          `select id, catalog_id as catalogId, htsus_code as htsusCode,
                  general_duty_rate as generalDutyRate, additional_duty_rate as additionalDutyRate,
                  combined_duty_rate as combinedDutyRate, summary_text as summaryText,
                  revision_label as revisionLabel
           from tariff_classification_us_profiles
           where id = ?
           limit 1`,
        )
        .bind(profileId)
        .first<TariffUsProfileRow>();
    },
  };
}

