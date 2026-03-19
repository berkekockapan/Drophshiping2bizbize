import type { Env, MessageBatch, RefreshJob } from "../../config/bindings";
import { processRefreshJob as applyRefreshJob } from "../sync/applyProductRefresh";

export async function processRefreshQueueBatch(batch: MessageBatch<RefreshJob>, env: Pick<Env, "DB">) {
  for (const message of batch.messages) {
    try {
      await applyRefreshJob(env, message.body);
      message.ack();
    } catch (error) {
      message.retry();
      throw error;
    }
  }
}
