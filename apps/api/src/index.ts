import { Hono } from "hono";

import type { Env } from "./config/bindings";
import type { CreateTrackedProductOptions } from "./modules/tracking/createTrackedProduct";
import { createAiProfilesRouter } from "./routes/aiProfiles";
import { createOwnersRouter } from "./routes/owners";
import { createSettingsRouter } from "./routes/settings";

export function createApp(options: CreateTrackedProductOptions = {}) {
  const app = new Hono<{ Bindings: Env }>();

  app.use("*", async (c, next) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    } as const;

    if (c.req.method === "OPTIONS") {
      return c.body(null, 204, corsHeaders);
    }

    await next();

    const headers = new Headers(c.res.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
      headers.set(key, value);
    }

    c.res = new Response(c.res.body, {
      headers,
      status: c.res.status,
      statusText: c.res.statusText,
    });
  });

  app.get("/health", (c) => c.json({ ok: true }));
  app.route("/owners/:ownerKey", createOwnersRouter(options));
  app.route("/ai-profiles", createAiProfilesRouter());
  app.route("/settings", createSettingsRouter());
  return app;
}

export default createApp;
