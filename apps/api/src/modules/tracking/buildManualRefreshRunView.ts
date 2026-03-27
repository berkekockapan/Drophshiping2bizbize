import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";
import { reconcileStaleManualRefreshRuns } from "./reconcileStaleManualRefreshRuns";

export async function buildManualRefreshRunView(db: D1Database, ownerKey: OwnerKey, runId: string) {
  await reconcileStaleManualRefreshRuns(db, ownerKey);
  return createManualRefreshRunsRepo(db).getRun(runId, ownerKey);
}

export async function buildActiveManualRefreshRunView(db: D1Database, ownerKey: OwnerKey) {
  await reconcileStaleManualRefreshRuns(db, ownerKey);
  return createManualRefreshRunsRepo(db).getActiveRun(ownerKey);
}
