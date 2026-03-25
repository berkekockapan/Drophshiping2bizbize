import { Hono } from "hono";

import type { Env } from "../config/bindings";
import { generateFieldWithOpenAi } from "../modules/ai/generateFieldWithOpenAi";
import { generateDraftWithOpenAi } from "../modules/ai/generateDraftWithOpenAi";
import {
  OpenAiAuthError,
  activateAiProfile,
  cancelOpenAiConnectionAttempt,
  deleteAiProfile,
  getAiProfileWorkspaces,
  getOpenAiConnectionAttempt,
  getOpenAiConnectionHealth,
  handleOpenAiOAuthCallback,
  listAiProfiles,
  reconnectAiProfile,
  selectAiProfileWorkspace,
  startOpenAiConnection,
} from "../modules/ai/openAiOAuth";
import { syncProfileMetadata, type SyncProfileInput } from "../modules/ai/syncProfileMetadata";

const VALID_PROFILE_STATUSES = new Set(["connected", "needs_reauth", "disconnected", "error"]);
const VALID_FIELD_NAMES = new Set(["title", "description", "tags"]);

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

function isGenerateFieldPayload(
  payload: unknown,
): payload is {
  field: "title" | "description" | "tags";
  prompt: string;
  context?: Record<string, unknown>;
} {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as {
    field?: unknown;
    prompt?: unknown;
    context?: unknown;
  };

  return (
    typeof candidate.field === "string" &&
    VALID_FIELD_NAMES.has(candidate.field) &&
    typeof candidate.prompt === "string" &&
    candidate.prompt.trim().length > 0 &&
    (typeof candidate.context === "undefined" || (!!candidate.context && typeof candidate.context === "object"))
  );
}

function isGenerateDraftPayload(
  payload: unknown,
): payload is {
  productId: string;
  language?: "en";
  sourceTitle: string;
  sourceDescription?: string | null;
  sourceAttributes?: Array<{ key: string; value: string }>;
} {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const candidate = payload as {
    productId?: unknown;
    language?: unknown;
    sourceTitle?: unknown;
    sourceDescription?: unknown;
    sourceAttributes?: unknown;
  };

  const validAttributes =
    typeof candidate.sourceAttributes === "undefined" ||
    (Array.isArray(candidate.sourceAttributes) &&
      candidate.sourceAttributes.every(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { key?: unknown }).key === "string" &&
          typeof (item as { value?: unknown }).value === "string",
      ));

  return (
    typeof candidate.productId === "string" &&
    candidate.productId.trim().length > 0 &&
    typeof candidate.sourceTitle === "string" &&
    candidate.sourceTitle.trim().length > 0 &&
    (typeof candidate.language === "undefined" || candidate.language === "en") &&
    (typeof candidate.sourceDescription === "undefined" ||
      candidate.sourceDescription === null ||
      typeof candidate.sourceDescription === "string") &&
    validAttributes
  );
}

function toErrorResponse(error: unknown) {
  if (error instanceof OpenAiAuthError) {
    return {
      status: error.statusCode,
      payload: {
        error: {
          code: error.code,
          message: error.message,
        },
      },
    };
  }

  return {
    status: 500,
    payload: {
      error: {
        code: "GENERATION_FAILED",
        message: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu.",
      },
    },
  };
}

export function createAiProfilesRouter() {
  const app = new Hono<{ Bindings: Env }>();

  app.get("/health", async (c) => {
    const health = await getOpenAiConnectionHealth(c.env.DB, c.env);
    return c.json(health);
  });

  app.post("/openai/start", async (c) => {
    try {
      const started = await startOpenAiConnection(c.env.DB, c.env);
      return c.json(started, 202);
    } catch (error) {
      const response = toErrorResponse(error);
      return c.json(response.payload, response.status as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503);
    }
  });

  app.get("/openai/attempts/:attemptId", async (c) => {
    const attempt = await getOpenAiConnectionAttempt(c.env.DB, c.req.param("attemptId"));
    if (!attempt) {
      return c.json({ error: "Connection attempt not found" }, 404);
    }

    return c.json({ attempt });
  });

  app.post("/openai/attempts/:attemptId/cancel", async (c) => {
    const attempt = await cancelOpenAiConnectionAttempt(c.env.DB, c.req.param("attemptId"));
    if (!attempt) {
      return c.json({ error: "Connection attempt not found" }, 404);
    }

    return c.json({ attempt });
  });

  app.get("/openai/callback", async (c) => {
    const result = await handleOpenAiOAuthCallback(c.env.DB, c.env, {
      code: c.req.query("code"),
      state: c.req.query("state"),
      error: c.req.query("error"),
      error_description: c.req.query("error_description"),
    });
    return c.html(result.html);
  });

  app.get("/", async (c) => {
    const items = await listAiProfiles(c.env.DB);
    return c.json({
      items,
      activeProfile: items.find((profile) => profile.isActive) ?? null,
    });
  });

  app.post("/:profileId/activate", async (c) => {
    const activeProfile = await activateAiProfile(c.env.DB, c.req.param("profileId"));
    if (!activeProfile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ ok: true, activeProfile });
  });

  app.post("/:profileId/reconnect", async (c) => {
    const reconnect = await reconnectAiProfile(c.env.DB, c.env, c.req.param("profileId"));
    if (!reconnect) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json(reconnect, 202);
  });

  app.delete("/:profileId", async (c) => {
    const removed = await deleteAiProfile(c.env.DB, c.req.param("profileId"));
    if (!removed) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.body(null, 204);
  });

  app.get("/:profileId/workspaces", async (c) => {
    const workspaces = await getAiProfileWorkspaces(c.env.DB, c.req.param("profileId"));
    if (!workspaces) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ items: workspaces });
  });

  app.post("/:profileId/workspaces/:workspaceId/select", async (c) => {
    const workspaces = await selectAiProfileWorkspace(
      c.env.DB,
      c.req.param("profileId"),
      c.req.param("workspaceId"),
    );
    if (!workspaces) {
      return c.json({ error: "Workspace not found" }, 404);
    }

    return c.json({ items: workspaces });
  });

  app.post("/generate-field", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isGenerateFieldPayload(body)) {
      return c.json({ error: "field and prompt are required" }, 400);
    }

    try {
      const generated = await generateFieldWithOpenAi(c.env.DB, c.env, {
        field: body.field,
        prompt: body.prompt,
        context: body.context ?? {},
      });
      return c.json(generated);
    } catch (error) {
      const response = toErrorResponse(error);
      return c.json(response.payload, response.status as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503);
    }
  });

  app.post("/generate", async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!isGenerateDraftPayload(body)) {
      return c.json({ error: "productId and sourceTitle are required" }, 400);
    }

    try {
      const generated = await generateDraftWithOpenAi(c.env.DB, c.env, {
        productId: body.productId,
        language: body.language ?? "en",
        sourceTitle: body.sourceTitle,
        sourceDescription: body.sourceDescription ?? null,
        sourceAttributes: body.sourceAttributes ?? [],
      });
      return c.json(generated);
    } catch (error) {
      const response = toErrorResponse(error);
      return c.json(response.payload, response.status as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 503);
    }
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
