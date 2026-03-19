import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { createProductsRepo } from "../db/repositories/productsRepo";

export function createProductsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/:productId", async (c) => {
    const product = await createProductsRepo(c.env.DB).getRefreshSnapshot(c.req.param("productId"));
    if (!product) {
      return c.json({ error: "Product not found" }, 404);
    }

    return c.json(product);
  });

  return app;
}
