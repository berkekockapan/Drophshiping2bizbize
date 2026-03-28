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
    .replace(/[̀-ͯ]/g, '');
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
            `insert or replace into tariff_classification_catalog
             (id, canonical_hs6, title, description, keywords_json, source_type, source_version, effective_from, effective_to, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce((select created_at from tariff_classification_catalog where id = ?), ?), ?)`,
          )
          .bind(
            item.catalogId,
            item.canonicalHs6,
            item.title,
            item.description,
            JSON.stringify(item.keywords),
            item.sourceType ?? 'seed',
            item.sourceVersion ?? '2026-r4',
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
            item.usProfile.id,
            item.catalogId,
            item.usProfile.htsusCode,
            item.usProfile.generalDutyRate,
            item.usProfile.additionalDutyRate,
            item.usProfile.combinedDutyRate,
            item.usProfile.summaryText,
            item.usProfile.revisionLabel,
            item.usProfile.id,
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
          `select id, catalog_id as catalogId, htsus_code as htsusCode,
                  general_duty_rate as generalDutyRate, additional_duty_rate as additionalDutyRate,
                  combined_duty_rate as combinedDutyRate, summary_text as summaryText,
                  revision_label as revisionLabel
           from tariff_classification_us_profiles
           where catalog_id = ?
           limit 1`,
        )
        .bind(catalogId)
        .first<TariffUsProfileRow>();
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
