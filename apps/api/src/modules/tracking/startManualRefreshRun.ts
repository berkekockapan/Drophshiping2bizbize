import type { Env } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

export async function startManualRefreshRun(env: Pick<Env, "DB">, now = new Date()) {
  const productIds = await createProductsRepo(env.DB).listTrackedProductIds();

  return createManualRefreshRunsRepo(env.DB).createRun(
    {
      productIds,
      scope: "ALL",
      sourceRunId: null,
    },
    now,
  );
}
