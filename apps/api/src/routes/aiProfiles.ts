import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { listStoredProfiles, syncProfileMetadata, type SyncProfileInput } from "../modules/ai/syncProfileMetadata";

const VALID_PROFILE_STATUSES = new Set(["connected", "needs_reauth", "disconnected", "error"]);

function isValidSyncPayload(payload: unknown): payload is SyncProfileInput {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as Partial<SyncProfileInput>;
  if (!candidate.connectorStatus || typeof candidate.connectorStatus !== "object") {
    return false;
  }

  if (!Array.isArray(candidate.profiles)) {
    return false;
  }

  return candidate.profiles.every((profile) =>
    profile &&
    typeof profile === "object" &&
    typeof profile.id === "string" &&
    typeof profile.label === "string" &&
    typeof profile.provider === "string" &&
    typeof profile.isActive === "boolean" &&
    (profile.emailMasked === null || typeof profile.emailMasked === "string" || typeof profile.emailMasked === "undefined") &&
    (typeof profile.status === "undefined" ||
      (typeof profile.status === "string" && VALID_PROFILE_STATUSES.has(profile.status))) &&
    (typeof profile.lastValidatedAt === "undefined" ||
      profile.lastValidatedAt === null ||
      typeof profile.lastValidatedAt === "number") &&
    (typeof profile.lastError === "undefined" ||
      profile.lastError === null ||
      typeof profile.lastError === "string"),
  );
}

export function createAiProfilesRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/", async (c) => {
    const items = await listStoredProfiles(c.env.DB);
    return c.json({ items });
  });

  app.post("/sync", async (c) => {
    const body = await c.req.json<SyncProfileInput>().catch(() => null);

    if (!isValidSyncPayload(body)) {
      return c.json({ error: "Invalid profile sync payload" }, 400);
    }

    const synced = await syncProfileMetadata(c.env.DB, body);
    return c.json(synced);
  });

  return app;
}
