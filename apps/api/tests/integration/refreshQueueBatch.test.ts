import { describe, expect, it } from "vitest";

import type { MessageBatch, RefreshJob } from "../../src/config/bindings";
import { processRefreshQueueBatch } from "../../src/modules/scheduler/processRefreshJob";
import { createTestEnv } from "../support/sqlite";

describe("processRefreshQueueBatch", () => {
  it("acks missing products instead of retrying deleted-product messages", async () => {
    const { env } = createTestEnv();
    let ackCount = 0;
    let retryCount = 0;

    const batch: MessageBatch<RefreshJob> = {
      messages: [
        {
          body: { productId: "deleted-product-id" },
          ack() {
            ackCount += 1;
          },
          retry() {
            retryCount += 1;
          },
        },
      ],
    };

    await expect(processRefreshQueueBatch(batch, env)).resolves.toBeUndefined();
    expect(ackCount).toBe(1);
    expect(retryCount).toBe(0);
  });
});
