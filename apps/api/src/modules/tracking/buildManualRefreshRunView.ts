import type { D1Database } from "../../config/bindings";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

export async function buildManualRefreshRunView(db: D1Database, runId: string) {
  return createManualRefreshRunsRepo(db).getRun(runId);
}

export async function buildActiveManualRefreshRunView(db: D1Database) {
  return createManualRefreshRunsRepo(db).getActiveRun();
}
