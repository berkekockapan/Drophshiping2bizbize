import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ParseError } from "../modules/scraping/parseErrors";
import { buildActiveManualRefreshRunView, buildManualRefreshRunView } from "../modules/tracking/buildManualRefreshRunView";
import { buildTrackingListView } from "../modules/tracking/buildTrackingListView";
import { deleteTrackedProduct } from "../modules/tracking/deleteTrackedProduct";
import { DuplicateProductError, type CreateTrackedProductOptions, createTrackedProduct } from "../modules/tracking/createTrackedProduct";
import { processManualRefreshRun } from "../modules/tracking/processManualRefreshRun";
import { retryFailedManualRefreshRun } from "../modules/tracking/retryFailedManualRefreshRun";
import { startManualRefreshRun } from "../modules/tracking/startManualRefreshRun";
import { setTrackedProductFavorite } from "../modules/tracking/setTrackedProductFavorite";

export function createTrackingRouter(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/products", async (c) => {
    const favoriteQuery = c.req.query("favorite");
    const favorite = favoriteQuery === "true" ? true : favoriteQuery === "false" ? false : undefined;

    const view = await buildTrackingListView(c.env.DB, {
      status: c.req.query("status"),
      parseStatus: c.req.query("parseStatus"),
      search: c.req.query("search"),
      favorite,
    });

    return c.json(view);
  });

  app.post("/products/refresh-runs", async (c) => {
    const run = await startManualRefreshRun(c.env);
    c.executionCtx.waitUntil(processManualRefreshRun(c.env, run.id, options));

    const view = await buildManualRefreshRunView(c.env.DB, run.id);
    return c.json({ run: view }, 202);
  });

  app.get("/products/refresh-runs/active", async (c) => {
    return c.json({ run: await buildActiveManualRefreshRunView(c.env.DB) });
  });

  app.get("/products/refresh-runs/:runId", async (c) => {
    const run = await buildManualRefreshRunView(c.env.DB, c.req.param("runId"));
    if (!run) {
      return c.json({ error: "Run not found" }, 404);
    }

    return c.json({ run });
  });

  app.post("/products/refresh-runs/:runId/retry-failed", async (c) => {
    const sourceRunId = c.req.param("runId");
    const sourceRun = await buildManualRefreshRunView(c.env.DB, sourceRunId);
    if (!sourceRun) {
      return c.json({ error: "Run not found" }, 404);
    }

    const run = await retryFailedManualRefreshRun(c.env, sourceRunId);
    c.executionCtx.waitUntil(processManualRefreshRun(c.env, run.id, options));

    const view = await buildManualRefreshRunView(c.env.DB, run.id);
    return c.json({ run: view }, 202);
  });

  app.post("/products/:productId/favorite", async (c) => {
    const body = await c.req.json<{ isFavorite?: boolean }>().catch(() => null);
    if (typeof body?.isFavorite !== "boolean") {
      return c.json({ error: "isFavorite is required" }, 400);
    }

    const result = await setTrackedProductFavorite(c.env.DB, c.req.param("productId"), body.isFavorite);
    if (!result) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(result);
  });

  app.delete("/products/:productId", async (c) => {
    const deleted = await deleteTrackedProduct(c.env.DB, c.req.param("productId"));
    if (!deleted) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.body(null, 204);
  });

  app.post("/products", async (c) => {
    const body = await c.req.json<{ trendyolUrl?: string }>().catch(() => null);

    if (!body?.trendyolUrl) {
      return c.json({ error: "trendyolUrl is required" }, 400);
    }

    try {
      const result = await createTrackedProduct(c.env, { trendyolUrl: body.trendyolUrl }, options);
      return c.json(result, 201);
    } catch (error) {
      if (error instanceof DuplicateProductError) {
        return c.json({ error: error.message }, 409);
      }

      if (error instanceof ParseError) {
        return c.json({ error: `Trendyol sayfası ayrıştırılamadı (${error.code})` }, 422);
      }

      if (error instanceof Error) {
        return c.json({ error: error.message }, 502);
      }

      return c.json({ error: "Beklenmeyen bir hata oluştu" }, 500);
    }
  });

  return app;
}
