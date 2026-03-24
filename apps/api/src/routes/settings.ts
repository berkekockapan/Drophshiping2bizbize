import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { createSettingsRepo } from "../db/repositories/settingsRepo";

interface SettingsPayload {
  refreshIntervalHours?: unknown;
  promptPreferences?: unknown;
  connectorHealthcheckEnabled?: unknown;
  aiTargetBaseUrl?: unknown;
  aiTargetManagementKey?: unknown;
  aiTargetLabel?: unknown;
  aiTargetApiKey?: unknown;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return value === null ? null : undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalStringValue(value: unknown) {
  return typeof value === "undefined" || value === null || typeof value === "string";
}

export function createSettingsRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const settings = await createSettingsRepo(c.env.DB).getSettings();
    return c.json(settings);
  });

  app.patch("/", async (c) => {
    const body = await c.req.json<SettingsPayload>().catch(() => null);

    if (!isRecord(body)) {
      return c.json({ error: "Invalid settings payload" }, 400);
    }

    if (
      typeof body.refreshIntervalHours !== "undefined" &&
      (typeof body.refreshIntervalHours !== "number" || body.refreshIntervalHours <= 0)
    ) {
      return c.json({ error: "refreshIntervalHours must be a positive number" }, 400);
    }

    if (
      typeof body.connectorHealthcheckEnabled !== "undefined" &&
      typeof body.connectorHealthcheckEnabled !== "boolean"
    ) {
      return c.json({ error: "connectorHealthcheckEnabled must be a boolean" }, 400);
    }

    if (
      typeof body.promptPreferences !== "undefined" &&
      body.promptPreferences !== null &&
      !isRecord(body.promptPreferences)
    ) {
      return c.json({ error: "promptPreferences must be an object or null" }, 400);
    }

    if (!isOptionalStringValue(body.aiTargetBaseUrl)) {
      return c.json({ error: "aiTargetBaseUrl must be a string or null" }, 400);
    }

    if (!isOptionalStringValue(body.aiTargetManagementKey)) {
      return c.json({ error: "aiTargetManagementKey must be a string or null" }, 400);
    }

    if (!isOptionalStringValue(body.aiTargetLabel)) {
      return c.json({ error: "aiTargetLabel must be a string or null" }, 400);
    }

    if (!isOptionalStringValue(body.aiTargetApiKey)) {
      return c.json({ error: "aiTargetApiKey must be a string or null" }, 400);
    }

    const settings = await createSettingsRepo(c.env.DB).saveSettings({
      refreshIntervalHours: typeof body.refreshIntervalHours === "number" ? body.refreshIntervalHours : undefined,
      promptPreferences:
        typeof body.promptPreferences === "undefined"
          ? undefined
          : (body.promptPreferences as Record<string, unknown> | null),
      connectorHealthcheckEnabled:
        typeof body.connectorHealthcheckEnabled === "boolean" ? body.connectorHealthcheckEnabled : undefined,
      aiTargetBaseUrl: normalizeOptionalString(body.aiTargetBaseUrl),
      aiTargetManagementKey: normalizeOptionalString(body.aiTargetManagementKey),
      aiTargetLabel: normalizeOptionalString(body.aiTargetLabel),
      aiTargetApiKey: normalizeOptionalString(body.aiTargetApiKey),
    });

    return c.json(settings);
  });

  return app;
}
