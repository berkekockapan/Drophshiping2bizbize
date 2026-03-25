import { afterEach, describe, expect, it, vi } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("aiProfiles integration", () => {
  it("returns cloud OpenAI health payload", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const response = await app.request("http://localhost/ai-profiles/health", undefined, env);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        status: "online",
        provider: "openai-oauth",
        activeProfile: null,
      }),
    );
  });

  it("accepts and returns richer connector profile metadata", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const syncResponse = await app.request(
      "http://localhost/ai-profiles/sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorStatus: { status: "online", provider: "chatgpt-web" },
          profiles: [
            {
              id: "profile_main",
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
              provider: "chatgpt-web",
              isActive: true,
              status: "needs_reauth",
              lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
              lastError: "Session expired",
            },
          ],
        }),
      },
      env,
    );

    expect(syncResponse.status).toBe(200);
    expect((await syncResponse.json()).items[0]).toEqual(
      expect.objectContaining({
        id: "profile_main",
        status: "needs_reauth",
        lastError: "Session expired",
        lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
      }),
    );
  });

  it("returns authorizationUrl and waiting_for_login when starting an OpenAI connection", async () => {
    const { env } = createTestEnv();
    env.OPENAI_OAUTH_CLIENT_ID = "client_test";
    env.OPENAI_OAUTH_REDIRECT_URI = "http://localhost/ai-profiles/openai/callback";
    env.OPENAI_OAUTH_ENCRYPTION_KEY = "12345678901234567890123456789012";

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      return new Response(null, {
        status: 302,
        headers: {
          Location: String(input),
        },
      });
    });

    const app = createApp();

    const response = await app.request("http://localhost/ai-profiles/openai/start", {
      method: "POST",
    }, env);

    expect(response.status).toBe(202);
    const body = (await response.json()) as {
      authorizationUrl: string;
      attempt: { status: string };
    };

    expect(body.authorizationUrl).toContain("client_id=client_test");
    expect(body.attempt.status).toBe("waiting_for_login");
  });

  it("returns a config error when OPENAI_OAUTH_CLIENT_ID is left as placeholder", async () => {
    const { env } = createTestEnv();
    env.OPENAI_OAUTH_CLIENT_ID = "app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    env.OPENAI_OAUTH_REDIRECT_URI = "http://localhost/ai-profiles/openai/callback";

    const app = createApp();
    const response = await app.request(
      "http://localhost/ai-profiles/openai/start",
      {
        method: "POST",
      },
      env,
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "OPENAI_OAUTH_CONFIG_MISSING",
          message: expect.stringContaining("örnek placeholder"),
        }),
      }),
    );
  });

  it("fails stuck in-progress attempts during health check when oauth config is invalid", async () => {
    const { env } = createTestEnv();
    env.OPENAI_OAUTH_CLIENT_ID = "app_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
    env.OPENAI_OAUTH_REDIRECT_URI = "http://localhost/ai-profiles/openai/callback";

    const now = Date.now();
    await env.DB.prepare(
      `insert into ai_openai_connection_attempts (
        id, provider, profile_id, status, error, oauth_state, code_verifier, nonce,
        redirect_uri, authorization_url, created_at, updated_at
      ) values (?, 'openai', ?, 'waiting_for_login', null, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        "attempt_stuck",
        "profile_main",
        "state_stuck",
        "verifier_stuck",
        "nonce_stuck",
        "http://localhost/ai-profiles/openai/callback",
        "https://auth.openai.com/oauth/authorize?client_id=app_x",
        now,
        now,
      )
      .run();

    const app = createApp();
    const response = await app.request("http://localhost/ai-profiles/health", undefined, env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        connectionAttempt: expect.objectContaining({
          id: "attempt_stuck",
          status: "failed",
          error: expect.stringContaining("örnek placeholder"),
        }),
      }),
    );
  });

  it("returns a structured auth error when generation is requested without an active profile", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const response = await app.request(
      "http://localhost/ai-profiles/generate-field",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field: "title",
          prompt: "Return JSON",
          context: {},
        }),
      },
      env,
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "NO_ACTIVE_PROFILE",
        }),
      }),
    );
  });
});
