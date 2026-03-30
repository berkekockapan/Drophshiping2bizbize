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
  profileName: string | null;
  title: string;
  rationale: string;
  score: number;
  usProfileId: string | null;
  htsCode10: string | null;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
  sourceBadges: string[];
}

export interface AutoSelectedTariffProfile {
  catalogId: string;
  profileName: string;
  canonicalHs6: string;
  htsCode10: string | null;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
}

export interface BuildTariffRecommendationsResult {
  runId: string;
  usedAi: boolean;
  confidenceState: "high_confidence" | "low_confidence";
  selectedProfile: AutoSelectedTariffProfile | null;
  lockedReason: string | null;
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
          profileName: profile?.profileName ?? null,
          title: match.title,
          rationale: `Urun basligi/aciklamasi ${match.title.toLocaleLowerCase('tr-TR')} sinyali ile eslesti.`,
          score: Math.max(1, 100 - index * 10 + match.score),
          usProfileId: profile?.id ?? null,
          htsCode10: profile?.masterEntry?.htsCode10 ?? profile?.htsusCode ?? null,
          generalDutyRate: profile?.generalDutyRate ?? 0,
          additionalDutyRate: profile?.additionalDutyRate ?? 0,
          combinedDutyRate: profile?.combinedDutyRate ?? 0,
          dutySummary: profile?.summaryText ?? formatTariffDutySummary(0, 0),
          defaultShipentegraUsd: profile?.defaultShipentegraUsd ?? null,
          sourceBadges: ['Kural eslesmesi'],
        } satisfies TariffRecommendation;
      }),
    )
  ).sort((left, right) => right.score - left.score);

  const best = recommendations[0] ?? null;
  const second = recommendations[1] ?? null;
  const confidenceState =
    best && best.score >= 140 && (!second || best.score - second.score >= 25) ? "high_confidence" : "low_confidence";
  const selectedProfile =
    confidenceState === "high_confidence" && best && best.profileName
      ? {
          catalogId: best.catalogId,
          profileName: best.profileName,
          canonicalHs6: best.canonicalHs6,
          htsCode10: best.htsCode10,
          combinedDutyRate: best.combinedDutyRate,
          dutySummary: best.dutySummary,
          defaultShipentegraUsd: best.defaultShipentegraUsd,
        }
      : null;
  const lockedReason = selectedProfile
    ? null
    : best
      ? "Sistem ABD profilinden yeterince emin degil. Yanlis kesin sonuc gostermemek icin hesap kilitli kalmali."
      : "Bu urun icin kullanilabilir ABD profili bulunamadi.";

  const run = await analysisRepo.createRun({
    ownerKey: input.ownerKey,
    productId: input.productId,
    usedAi: false,
    inputSnapshot: input,
    resultSnapshot: { confidenceState, selectedProfile, lockedReason, recommendations },
    engineVersion: 'tariff-v2',
  });

  return {
    runId: run.id,
    usedAi: false,
    confidenceState,
    selectedProfile,
    lockedReason,
    recommendations,
  };
}
