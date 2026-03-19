import { Hono } from "hono";

import type { Env } from "./config/bindings";
import type { CreateTrackedProductOptions } from "./modules/tracking/createTrackedProduct";
import { createTrackingRouter } from "./routes/tracking";

export function createApp(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/tracking", createTrackingRouter(options));
  return app;
}

export default createApp;
