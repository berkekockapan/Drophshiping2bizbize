import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { buildTrackingListView } from "../modules/tracking/buildTrackingListView";
import { DuplicateProductError, type CreateTrackedProductOptions, createTrackedProduct } from "../modules/tracking/createTrackedProduct";

export function createTrackingRouter(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/products", async (c) => {
    const view = await buildTrackingListView(c.env.DB, {
      status: c.req.query("status"),
      parseStatus: c.req.query("parseStatus"),
      search: c.req.query("search"),
    });

    return c.json(view);
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

      throw error;
    }
  });

  return app;
}
