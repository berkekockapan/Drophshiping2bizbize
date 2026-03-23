import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { buildEtsyPrepView } from "../modules/etsyPrep/buildEtsyPrepView";
import {
  InvalidEtsyPrepDraftPayloadError,
  saveEtsyPrepDraft,
} from "../modules/etsyPrep/saveEtsyPrepDraft";
import { downloadProductImageAsJpg } from "../modules/tracking/downloadProductImageAsJpg";
import { buildProductDetailView } from "../modules/tracking/buildProductDetailView";

export function createProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/:productId/etsy-prep", async (c) => {
    const view = await buildEtsyPrepView(c.env.DB, c.req.param("productId"));
    if (!view) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(view);
  });

  app.put("/:productId/etsy-prep/save", async (c) => {
    const body = await c.req.json().catch(() => undefined);
    if (body === undefined || body === null || typeof body !== "object") {
      return c.json({ error: "Invalid JSON payload" }, 400);
    }

    try {
      const saved = await saveEtsyPrepDraft(c.env.DB, c.req.param("productId"), body, Date.now());

      if (!saved) {
        return c.json({ error: "Product not found" }, 404);
      }

      return c.json(saved);
    } catch (error) {
      if (error instanceof InvalidEtsyPrepDraftPayloadError) {
        return c.json({ error: "Invalid JSON payload" }, 400);
      }

      throw error;
    }
  });

  app.get("/:productId/images/download", async (c) => {
    const url = c.req.query("url");
    if (!url) {
      return c.json({ error: "url is required" }, 400);
    }

    const result = await downloadProductImageAsJpg(c.env.DB, c.req.param("productId"), url);

    if (result.kind === "ok") {
      return result.response;
    }

    if (result.kind === "not-found") {
      return c.json({ error: "Product not found" }, 404);
    }

    if (result.kind === "invalid-image") {
      return c.json({ error: "Image does not belong to product" }, 400);
    }

    return c.json({ error: "Image download failed" }, 502);
  });

  app.get("/:productId", async (c) => {
    const detail = await buildProductDetailView(c.env.DB, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(detail);
  });

  return app;
}
