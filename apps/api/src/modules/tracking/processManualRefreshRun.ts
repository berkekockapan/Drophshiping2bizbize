import type { OwnerKey } from "../../contracts/owners";

import type { ProcessRefreshJobOptions } from "../sync/applyProductRefresh";
import { processRefreshJob } from "../sync/applyProductRefresh";
import type { Env } from "../../config/bindings";
import { createManualRefreshRunsRepo } from "../../db/repositories/manualRefreshRunsRepo";

function getFailureMessage(result: Awaited<ReturnType<typeof processRefreshJob>>) {
  return result.notifications[0]?.body ?? `Refresh ended with parse status ${result.product.parseStatus}`;
}

export async function processManualRefreshRun(
  env: Pick<Env, "DB">,
  ownerKey: OwnerKey,
  runId: string,
  options: ProcessRefreshJobOptions = {},
) {
  await Promise.resolve();

  const runsRepo = createManualRefreshRunsRepo(env.DB);
  const run = await runsRepo.getRunWithItems(runId, ownerKey);
  if (!run) {
    throw new Error(`Manual refresh run ${runId} not found`);
  }
  const activeRun = run;

  const concurrency = 20;
  const queue = [...activeRun.items.filter((item) => item.status === "PENDING")];

  async function workerLoop() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) {
        return;
      }

      await runsRepo.markItemRunning(activeRun.id, item.productId, new Date());

      try {
        const result = await processRefreshJob(env, { productId: item.productId }, {
          ...options,
          source: "MANUAL",
          ownerKey,
          manualRefreshRunId: activeRun.id,
        });

        if (result.product.parseStatus !== "OK") {
          await runsRepo.markItemFailed(activeRun.id, item.productId, getFailureMessage(result), new Date());
          continue;
        }

        await runsRepo.markItemSucceeded(activeRun.id, item.productId, new Date());
      } catch (error) {
        await runsRepo.markItemFailed(
          activeRun.id,
          item.productId,
          error instanceof Error ? error.message : "Unknown refresh error",
          new Date(),
        );
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, () => workerLoop()));
  await runsRepo.completeRun(activeRun.id, new Date());
}
