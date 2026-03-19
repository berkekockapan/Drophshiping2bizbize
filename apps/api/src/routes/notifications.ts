import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { createNotificationsRepo } from "../db/repositories/notificationsRepo";

export function createNotificationsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const productId = c.req.query("productId") ?? null;
    const notifications = await createNotificationsRepo(c.env.DB).listNotifications(productId);
    return c.json({ items: notifications });
  });

  return app;
}
