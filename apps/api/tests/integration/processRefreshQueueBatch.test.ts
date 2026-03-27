import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { processRefreshQueueBatch } from "../../src/modules/scheduler/processRefreshJob";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { deleteTrackedProduct } from "../../src/modules/tracking/deleteTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

describe("processRefreshQueueBatch", () => {
  it("writes scheduled audits when queue batches are processed", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    let acked = false;
    let retried = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response(basicProductHtml, { status: 200 });

    try {
      await processRefreshQueueBatch(
        {
          messages: [
            {
              body: { productId: seeded.product.id },
              ack() {
                acked = true;
              },
              retry() {
                retried = true;
              },
            },
          ],
        },
        env,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    const audit = sqlite
      .prepare(
        `select source
         from product_refresh_audits
         where product_id = ?
         order by created_at desc
         limit 1`,
      )
      .get(seeded.product.id) as { source: string } | undefined;

    expect(acked).toBe(true);
    expect(retried).toBe(false);
    expect(audit).toEqual({ source: "SCHEDULED" });
  });

  it("acks without retry when the product was deleted before the scheduled refresh runs", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-789?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await deleteTrackedProduct(env.DB, "berke", seeded.product.id);

    let acked = false;
    let retried = false;

    await processRefreshQueueBatch(
      {
        messages: [
          {
            body: { productId: seeded.product.id },
            ack() {
              acked = true;
            },
            retry() {
              retried = true;
            },
          },
        ],
      },
      env,
    );

    expect(acked).toBe(true);
    expect(retried).toBe(false);
  });
});
