import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { ParseError } from "../modules/scraping/parseErrors";
import { buildTrackingListView } from "../modules/tracking/buildTrackingListView";
import { deleteTrackedProduct } from "../modules/tracking/deleteTrackedProduct";
import { DuplicateProductError, type CreateTrackedProductOptions, createTrackedProduct } from "../modules/tracking/createTrackedProduct";
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
