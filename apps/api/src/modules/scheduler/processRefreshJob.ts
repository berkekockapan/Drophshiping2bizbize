import type { Env, MessageBatch, RefreshJob } from "../../config/bindings";
import { RefreshProductNotFoundError, processRefreshJob as applyRefreshJob } from "../sync/applyProductRefresh";

export async function processRefreshQueueBatch(batch: MessageBatch<RefreshJob>, env: Pick<Env, "DB">) {
  for (const message of batch.messages) {
    try {
      await applyRefreshJob(env, message.body, {
        source: "SCHEDULED",
      });
      message.ack();
    } catch (error) {
      if (error instanceof RefreshProductNotFoundError) {
        message.ack();
        continue;
      }

      message.retry();
      throw error;
    }
  }
}
