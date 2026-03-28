import type { D1Database } from '../../../config/bindings';
import { createTariffAnalysisRepo } from '../../../db/repositories/tariffAnalysisRepo';
import { createTariffCatalogRepo } from '../../../db/repositories/tariffCatalogRepo';

import { formatTariffDutySummary } from './formatTariffDutySummary';

export interface BuildTariffRecommendationsInput {
  ownerKey: string;
  productId: string;
  title: string | null;
  descriptionRaw: string | null;
  category: string | null;
  attributes: Array<{ key: string; value: string }>;
  images: string[];
  aiContext: unknown;
}

export interface TariffRecommendation {
  catalogId: string;
  canonicalHs6: string;
  title: string;
  rationale: string;
  score: number;
  usProfileId: string | null;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  sourceBadges: string[];
}

export interface BuildTariffRecommendationsResult {
  runId: string;
  usedAi: boolean;
  recommendations: TariffRecommendation[];
}

export async function buildTariffRecommendations(
  db: D1Database,
  input: BuildTariffRecommendationsInput,
): Promise<BuildTariffRecommendationsResult> {
  const catalogRepo = createTariffCatalogRepo(db);
  const analysisRepo = createTariffAnalysisRepo(db);
  const keywordQuery = [input.title, input.descriptionRaw, input.category, ...input.attributes.map((item) => item.value)]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .join(' ');

  const catalogMatches = await catalogRepo.searchCatalog(keywordQuery, 5);
  const recommendations = (
    await Promise.all(
      catalogMatches.slice(0, 2).map(async (match, index) => {
        const profile = await catalogRepo.getUsProfileByCatalogId(match.id);

        return {
          catalogId: match.id,
          canonicalHs6: match.canonicalHs6,
          title: match.title,
          rationale: `Urun basligi/aciklamasi ${match.title.toLocaleLowerCase('tr-TR')} sinyali ile eslesti.`,
          score: Math.max(1, 100 - index * 10 + match.score),
          usProfileId: profile?.id ?? null,
          generalDutyRate: profile?.generalDutyRate ?? 0,
          additionalDutyRate: profile?.additionalDutyRate ?? 0,
          combinedDutyRate: profile?.combinedDutyRate ?? 0,
          dutySummary: profile?.summaryText ?? formatTariffDutySummary(0, 0),
          sourceBadges: ['Kural eslesmesi'],
        } satisfies TariffRecommendation;
      }),
    )
  ).sort((left, right) => right.score - left.score);

  const run = await analysisRepo.createRun({
    ownerKey: input.ownerKey,
    productId: input.productId,
    usedAi: false,
    inputSnapshot: input,
    resultSnapshot: { recommendations },
    engineVersion: 'tariff-v1',
  });

  return {
    runId: run.id,
    usedAi: false,
    recommendations,
  };
}
