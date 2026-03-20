import { Hono } from "hono";

import type { Env } from "./config/bindings";
import type { CreateTrackedProductOptions } from "./modules/tracking/createTrackedProduct";
import { createAiProfilesRouter } from "./routes/aiProfiles";
import { createDraftsRouter } from "./routes/drafts";
import { createNotificationsRouter } from "./routes/notifications";
import { createProductsRouter } from "./routes/products";
import { createSettingsRouter } from "./routes/settings";
import { createTrackingRouter } from "./routes/tracking";

export function createApp(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();
  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/tracking", createTrackingRouter(options));
  app.route("/products", createProductsRouter());
  app.route("/drafts", createDraftsRouter());
  app.route("/ai-profiles", createAiProfilesRouter());
  app.route("/notifications", createNotificationsRouter());
  app.route("/settings", createSettingsRouter());
  return app;
}

export default createApp;
