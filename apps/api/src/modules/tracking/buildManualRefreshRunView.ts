import type { D1Database } from "../../config/bindings";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";
import { reconcileStaleManualRefreshRuns } from "./reconcileStaleManualRefreshRuns";

export async function buildManualRefreshRunView(db: D1Database, runId: string) {
  await reconcileStaleManualRefreshRuns(db);
  return createManualRefreshRunsRepo(db).getRun(runId);
}

export async function buildActiveManualRefreshRunView(db: D1Database) {
  await reconcileStaleManualRefreshRuns(db);
  return createManualRefreshRunsRepo(db).getActiveRun();
}
