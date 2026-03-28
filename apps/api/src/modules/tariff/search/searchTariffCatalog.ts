import type { D1Database } from '../../../config/bindings';
import { createTariffCatalogRepo } from '../../../db/repositories/tariffCatalogRepo';

import { formatTariffDutySummary } from '../analysis/formatTariffDutySummary';

export async function searchTariffCatalog(db: D1Database, query: string) {
  const repo = createTariffCatalogRepo(db);
  const matches = await repo.searchCatalog(query, 10);

  return Promise.all(
    matches.map(async (match) => {
      const profile = await repo.getUsProfileByCatalogId(match.id);

      return {
        catalogId: match.id,
        canonicalHs6: match.canonicalHs6,
        title: match.title,
        rationale: `Manuel arama sorgusu ${query.trim() || 'bos'} ile eslesen katalog kaydi.`,
        score: match.score,
        usProfileId: profile?.id ?? null,
        generalDutyRate: profile?.generalDutyRate ?? 0,
        additionalDutyRate: profile?.additionalDutyRate ?? 0,
        combinedDutyRate: profile?.combinedDutyRate ?? 0,
        dutySummary: profile?.summaryText ?? formatTariffDutySummary(0, 0),
        sourceBadges: ['Manuel arama'],
      };
    }),
  );
}
