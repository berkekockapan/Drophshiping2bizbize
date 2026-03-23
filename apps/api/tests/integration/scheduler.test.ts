import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import worker from "../../src/worker";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv, InMemoryRefreshQueue } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");

describe("scheduler", () => {
  it("enqueues active products only when the refresh interval window has elapsed", async () => {
    const queue = new InMemoryRefreshQueue();
    const { env, sqlite } = createTestEnv({ queue });

    sqlite
      .prepare(
        `insert into app_settings (
          id, refresh_interval_hours, prompt_preferences_json, connector_healthcheck_enabled, created_at, updated_at
        ) values (?, ?, ?, ?, ?, ?)`,
      )
      .run("default", 5, '{"tone":"balanced"}', 1, Date.parse("2026-03-19T00:00:00.000Z"), Date.parse("2026-03-19T00:00:00.000Z"));

    const dueOne = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const dueTwo = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml.replaceAll("Oversize Hoodie", "Oversize Hoodie 2"), { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-789?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml.replaceAll("Oversize Hoodie", "Oversize Hoodie 3"), { status: 200 }),
        now: new Date("2026-03-20T09:00:00.000Z"),
      },
    );

    const waits: Array<Promise<unknown>> = [];
    worker.scheduled?.(
      { cron: "0 * * * *", scheduledTime: Date.parse("2026-03-20T10:00:00.000Z") },
      env,
      {
        waitUntil(promise) {
          waits.push(promise);
        },
      },
    );

    await Promise.all(waits);

    expect(queue.sent).toEqual([dueOne.product.id, dueTwo.product.id]);
  });
});
