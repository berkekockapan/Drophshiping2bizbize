import { Hono } from "hono";

import type { Env } from "./config/bindings";
import type { CreateTrackedProductOptions } from "./modules/tracking/createTrackedProduct";
import { createAiProfilesRouter } from "./routes/aiProfiles";
import { createOwnersRouter } from "./routes/owners";
import { createSettingsRouter } from "./routes/settings";

export function createApp(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", async (c, next) => {
    c.header("Access-Control-Allow-Origin", "*");
    c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type");

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204);
    }

    await next();
  });

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/owners/:ownerKey", createOwnersRouter(options));
  app.route("/ai-profiles", createAiProfilesRouter());
  app.route("/settings", createSettingsRouter());
  return app;
}

export default createApp;
