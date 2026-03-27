import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createManualRefreshRunsRepo } from "../../src/db/repositories/manualRefreshRunsRepo";
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
  it("starts/retries only inside selected owner scope", async () => {
    const { env, sqlite } = createTestEnv();
    let failSecondBerkeProduct = true;
    const fetchImpl = async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("-456")) {
        return new Response(failSecondBerkeProduct ? unavailableProductHtml : basicProductHtml, { status: 200 });
      }

      return new Response(basicProductHtml, { status: 200 });
    };
    const app = createApp({ fetchImpl });

    const firstBerke = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl: async () => new Response(basicProductHtml, { status: 200 }), now: new Date("2026-03-20T00:00:00.000Z") },
    );
    await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/favorite-hoodie-p-456?merchantId=1" },
      { fetchImpl: async () => new Response(basicProductHtml, { status: 200 }), now: new Date("2026-03-20T00:05:00.000Z") },
    );
    await createTrackedProduct(
      env,
      { ownerKey: "kaan", trendyolUrl: "https://www.trendyol.com/north-apparel/kaan-hoodie-p-789?merchantId=1" },
      { fetchImpl: async () => new Response(basicProductHtml, { status: 200 }), now: new Date("2026-03-20T00:06:00.000Z") },
    );

    const waitUntilPromises: Array<Promise<unknown>> = [];

    const startResponse = await app.fetch(
      new Request("http://localhost/owners/berke/products/refresh-runs", { method: "POST" }),
      env,
      createExecutionContext(waitUntilPromises),
    );

    expect(startResponse.status).toBe(202);
    const started = (await startResponse.json()) as { run: { id: string; ownerKey: string; totalCount: number; status: string } };
    expect(started.run.ownerKey).toBe("berke");
    expect(started.run.totalCount).toBe(2);
    expect(started.run.status).toBe("RUNNING");

    const activeBerke = await app.request("http://localhost/owners/berke/products/refresh-runs/active", undefined, env);
    const activeKaan = await app.request("http://localhost/owners/kaan/products/refresh-runs/active", undefined, env);
    expect(activeBerke.status).toBe(200);
    expect(activeKaan.status).toBe(200);
    expect((await activeBerke.json()) as { run: { id: string } }).toEqual({
      run: expect.objectContaining({ id: started.run.id }),
    });
    expect(await activeKaan.json()).toEqual({ run: null });

    await Promise.all(waitUntilPromises);

    const completedResponse = await app.request(
      `http://localhost/owners/berke/products/refresh-runs/${started.run.id}`,
      undefined,
      env,
    );
    expect(completedResponse.status).toBe(200);
    expect((await completedResponse.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        id: started.run.id,
        ownerKey: "berke",
        status: "COMPLETED",
        successCount: 1,
        failedCount: 1,
      }),
    });

    failSecondBerkeProduct = false;

    const retryPromises: Array<Promise<unknown>> = [];
    const retryResponse = await app.fetch(
      new Request(`http://localhost/owners/berke/products/refresh-runs/${started.run.id}/retry-failed`, { method: "POST" }),
      env,
      createExecutionContext(retryPromises),
    );

    expect(retryResponse.status).toBe(202);
    const retried = (await retryResponse.json()) as {
      run: { id: string; ownerKey: string; totalCount: number; status: string; sourceRunId: string | null };
    };
    expect(retried.run.ownerKey).toBe("berke");
    expect(retried.run.totalCount).toBe(1);
    expect(retried.run.status).toBe("RUNNING");
    expect(retried.run.sourceRunId).toBe(started.run.id);

    await Promise.all(retryPromises);

    const retriedCompleted = await app.request(
      `http://localhost/owners/berke/products/refresh-runs/${retried.run.id}`,
      undefined,
      env,
    );
    expect(retriedCompleted.status).toBe(200);
    expect((await retriedCompleted.json()) as { run: unknown }).toEqual({
      run: expect.objectContaining({
        id: retried.run.id,
        ownerKey: "berke",
        status: "COMPLETED",
        successCount: 1,
        failedCount: 0,
        scope: "FAILED_ONLY",
        sourceRunId: started.run.id,
      }),
    });

    const audits = sqlite
      .prepare(
        `select source, manual_refresh_run_id as manualRefreshRunId
         from product_refresh_audits
         where product_id = ?
         order by created_at desc`,
      )
      .all(firstBerke.product.id) as Array<{ source: string; manualRefreshRunId: string | null }>;
    expect(audits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source: "MANUAL",
          manualRefreshRunId: started.run.id,
        }),
      ]),
    );
  });

  it("reconciles stale runs only for requested owner", async () => {
    const { env, sqlite } = createTestEnv();
    const fetchImpl = async () => new Response(basicProductHtml, { status: 200 });
    const app = createApp({ fetchImpl });
    const runsRepo = createManualRefreshRunsRepo(env.DB);
    const staleNow = new Date("2020-01-01T00:00:00.000Z");

    const first = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      { fetchImpl, now: staleNow },
    );
    const second = await createTrackedProduct(
      env,
      { ownerKey: "berke", trendyolUrl: "https://www.trendyol.com/north-apparel/favorite-hoodie-p-456?merchantId=1" },
      { fetchImpl, now: staleNow },
    );

    const staleRun = await runsRepo.createRun(
      {
        ownerKey: "berke",
        productIds: [first.product.id, second.product.id],
        scope: "ALL",
        sourceRunId: null,
      },
      staleNow,
    );

    await runsRepo.markItemRunning(staleRun.id, first.product.id, staleNow);
    await runsRepo.markItemSucceeded(staleRun.id, first.product.id, staleNow);
    await runsRepo.markItemRunning(staleRun.id, second.product.id, staleNow);

    const activeResponse = await app.request("http://localhost/owners/berke/products/refresh-runs/active", undefined, env);
    expect(activeResponse.status).toBe(200);
    expect(await activeResponse.json()).toEqual({ run: null });

    const detailResponse = await app.request(
      `http://localhost/owners/berke/products/refresh-runs/${staleRun.id}`,
      undefined,
      env,
    );
    expect(detailResponse.status).toBe(200);
    expect(await detailResponse.json()).toEqual({
      run: expect.objectContaining({
        id: staleRun.id,
        ownerKey: "berke",
        status: "COMPLETED",
        pendingCount: 0,
        runningCount: 0,
        successCount: 1,
        failedCount: 1,
      }),
    });

    const mismatchResponse = await app.request(
      `http://localhost/owners/kaan/products/refresh-runs/${staleRun.id}`,
      undefined,
      env,
    );
    expect(mismatchResponse.status).toBe(404);

    expect(
      sqlite
        .prepare("select status, error_message as errorMessage from manual_refresh_run_items where run_id = ? and product_id = ?")
        .get(staleRun.id, second.product.id),
    ).toEqual({
      status: "FAILED",
      errorMessage: "Toplu yenileme islemi tamamlanmadan durdu",
    });
  });
});
