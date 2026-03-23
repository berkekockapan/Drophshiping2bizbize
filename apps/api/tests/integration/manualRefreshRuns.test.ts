import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const unavailableProductHtml = readFileSync(new URL("../fixtures/trendyol/product-unavailable.html", import.meta.url), "utf8");

function createExecutionContext(promises: Array<Promise<unknown>>): Parameters<ReturnType<typeof createApp>["fetch"]>[2] {
  return {
    waitUntil(promise) {
      promises.push(promise);
    },
    passThroughOnException() {
      return;
    },
    props: {},
  };
}

describe("manual refresh runs", () => {
  it("starts a run, exposes active progress, completes with partial failure, and retries failed items only", async () => {
    const { env } = createTestEnv();
    let failSecondProduct = true;
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("-456")) {
        return new Response(failSecondProduct ? unavailableProductHtml : basicProductHtml, { status: 200 });
      }

      return new Response(basicProductHtml, { status: 200 });
    };
    const app = createApp({ fetchImpl });

    await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );
    await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/favorite-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:05:00.000Z"),
      },
    );

    const waitUntilPromises: Array<Promise<unknown>> = [];

    const startResponse = await app.fetch(
      new Request("http://localhost/tracking/products/refresh-runs", { method: "POST" }),
      env,
      createExecutionContext(waitUntilPromises),
    );

    expect(startResponse.status).toBe(202);

    const started = await startResponse.json() as {
      run: { id: string; totalCount: number; status: string };
    };
    expect(started.run.totalCount).toBe(2);
    expect(started.run.status).toBe("RUNNING");

    const activeResponse = await app.request("http://localhost/tracking/products/refresh-runs/active", undefined, env);
    expect(activeResponse.status).toBe(200);
    expect((await activeResponse.json()) as { run: { id: string } }).toEqual({
      run: expect.objectContaining({ id: started.run.id }),
    });

    await Promise.all(waitUntilPromises);

    const completedResponse = await app.request(
      `http://localhost/tracking/products/refresh-runs/${started.run.id}`,
      undefined,
      env,
    );
    expect(completedResponse.status).toBe(200);
    expect((await completedResponse.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        id: started.run.id,
        status: "COMPLETED",
        successCount: 1,
        failedCount: 1,
      }),
    });

    failSecondProduct = false;

    const retryPromises: Array<Promise<unknown>> = [];
    const retryResponse = await app.fetch(
      new Request(`http://localhost/tracking/products/refresh-runs/${started.run.id}/retry-failed`, { method: "POST" }),
      env,
      createExecutionContext(retryPromises),
    );

    expect(retryResponse.status).toBe(202);
    const retried = await retryResponse.json() as {
      run: { id: string; totalCount: number; status: string; sourceRunId: string | null };
    };
    expect(retried.run.totalCount).toBe(1);
    expect(retried.run.status).toBe("RUNNING");
    expect(retried.run.sourceRunId).toBe(started.run.id);

    await Promise.all(retryPromises);

    const retriedCompletedResponse = await app.request(
      `http://localhost/tracking/products/refresh-runs/${retried.run.id}`,
      undefined,
      env,
    );
    expect(retriedCompletedResponse.status).toBe(200);
    expect((await retriedCompletedResponse.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        id: retried.run.id,
        status: "COMPLETED",
        successCount: 1,
        failedCount: 0,
        scope: "FAILED_ONLY",
        sourceRunId: started.run.id,
      }),
    });
  });
});
