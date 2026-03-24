import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

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
