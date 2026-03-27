import type { OwnerKey } from "../../contracts/owners";

import type { Env } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

export async function retryFailedManualRefreshRun(
  env: Pick<Env, "DB">,
  ownerKey: OwnerKey,
  sourceRunId: string,
  now = new Date(),
) {
  const productIds = await createProductsRepo(env.DB).listFailedRunProductIds(sourceRunId, ownerKey);

  return createManualRefreshRunsRepo(env.DB).createRun(
    {
      ownerKey,
      productIds,
      scope: "FAILED_ONLY",
      sourceRunId,
    },
    now,
  );
}
