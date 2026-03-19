import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { buildProductDetailView } from "../modules/tracking/buildProductDetailView";

export function createProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/:productId", async (c) => {
    const detail = await buildProductDetailView(c.env.DB, c.req.param("productId"));
    if (!detail) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(detail);
  });

  return app;
}
