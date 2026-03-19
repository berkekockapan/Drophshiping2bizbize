import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { createSettingsRepo } from "../db/repositories/settingsRepo";

interface SettingsPayload {
  refreshIntervalHours?: number;
  promptPreferences?: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
}

export function createSettingsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const settings = await createSettingsRepo(c.env.DB).getSettings();
    return c.json(settings);
  });

  app.patch("/", async (c) => {
    const body = await c.req.json<SettingsPayload>().catch(() => null);

    if (!body || typeof body.refreshIntervalHours !== "number" || body.refreshIntervalHours <= 0) {
      return c.json({ error: "refreshIntervalHours must be a positive number" }, 400);
    }

    const settings = await createSettingsRepo(c.env.DB).saveSettings({
      refreshIntervalHours: body.refreshIntervalHours,
      promptPreferences: body.promptPreferences ?? null,
      connectorHealthcheckEnabled: body.connectorHealthcheckEnabled ?? true,
    });

    return c.json(settings);
  });

  return app;
}
