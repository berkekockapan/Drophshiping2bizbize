import type { D1Database } from "../../config/bindings";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

const STALE_MANUAL_REFRESH_RUN_AFTER_MS = 60_000;
const STALE_MANUAL_REFRESH_RUN_ERROR = "Toplu yenileme islemi tamamlanmadan durdu";

export async function reconcileStaleManualRefreshRuns(db: D1Database, now = new Date()) {
  const runsRepo = createManualRefreshRunsRepo(db);
  const staleRunIds = await runsRepo.listStaleRunIds(now.getTime() - STALE_MANUAL_REFRESH_RUN_AFTER_MS);

  for (const runId of staleRunIds) {
    await runsRepo.completeRunAsInterrupted(runId, STALE_MANUAL_REFRESH_RUN_ERROR, now);
  }
}
