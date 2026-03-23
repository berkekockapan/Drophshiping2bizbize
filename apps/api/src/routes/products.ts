import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { downloadProductImageAsJpg } from "../modules/tracking/downloadProductImageAsJpg";
import { buildProductDetailView } from "../modules/tracking/buildProductDetailView";

export function createProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

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
