import type { OwnerKey } from "../../contracts/owners";

import type { Env } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

export async function startManualRefreshRun(env: Pick<Env, "DB">, ownerKey: OwnerKey, now = new Date()) {
  const productIds = await createProductsRepo(env.DB).listTrackedProductIds(ownerKey);

  return createManualRefreshRunsRepo(env.DB).createRun(
    {
      ownerKey,
      productIds,
      scope: "ALL",
      sourceRunId: null,
    },
    now,
  );
}
