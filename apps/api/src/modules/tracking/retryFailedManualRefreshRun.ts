import type { Env } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

export async function retryFailedManualRefreshRun(env: Pick<Env, "DB">, sourceRunId: string, now = new Date()) {
  const productIds = await createProductsRepo(env.DB).listFailedRunProductIds(sourceRunId);

  return createManualRefreshRunsRepo(env.DB).createRun(
    {
      productIds,
      scope: "FAILED_ONLY",
      sourceRunId,
    },
    now,
  );
}
