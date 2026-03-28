import { describe, expect, it } from "vitest";

import { createApp } from "../../src";
import { createFlakyD1 } from "../support/flakyD1";
import { createTestEnv } from "../support/sqlite";

describe("settings route", () => {
  it("retries a transient settings write instead of losing the update", async () => {
    const { env } = createTestEnv();
    const flakyEnv = { ...env, DB: createFlakyD1(env.DB, ["insert into app_settings", "update app_settings"]) };
    const app = createApp();

    const response = await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshIntervalHours: 12 }),
      },
      flakyEnv,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      refreshIntervalHours: 12,
      connectorHealthcheckEnabled: true,
    });
  });

  it("merges ai target fields into the existing settings document", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const response = await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetLabel: "Windows",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetApiKey: "api_live_123",
        }),
      },
      env,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      refreshIntervalHours: 5,
      connectorHealthcheckEnabled: true,
      aiTargetBaseUrl: "https://clip.example.com",
      aiTargetLabel: "Windows",
      aiTargetManagementKey: "mgmt_live_123",
      aiTargetApiKey: "api_live_123",
    });

    const refreshOnly = await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshIntervalHours: 12 }),
      },
      env,
    );

    expect(refreshOnly.status).toBe(200);
    expect(await refreshOnly.json()).toMatchObject({
      refreshIntervalHours: 12,
      connectorHealthcheckEnabled: true,
      aiTargetBaseUrl: "https://clip.example.com",
      aiTargetLabel: "Windows",
      aiTargetManagementKey: "mgmt_live_123",
      aiTargetApiKey: "api_live_123",
    });
  });

  it("normalizes cleared ai target fields without resetting unrelated fields", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refreshIntervalHours: 8,
          connectorHealthcheckEnabled: false,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetLabel: "Windows",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetApiKey: "api_live_123",
        }),
      },
      env,
    );

    const cleared = await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTargetBaseUrl: "   ",
          aiTargetLabel: " ",
          aiTargetManagementKey: "",
          aiTargetApiKey: null,
        }),
      },
      env,
    );

    expect(cleared.status).toBe(200);
    expect(await cleared.json()).toMatchObject({
      refreshIntervalHours: 8,
      connectorHealthcheckEnabled: false,
      aiTargetBaseUrl: null,
      aiTargetLabel: null,
      aiTargetManagementKey: null,
      aiTargetApiKey: null,
    });
  });

  it("rejects invalid ai target field types", async () => {
    const { env } = createTestEnv();
    const app = createApp();

    const response = await app.request(
      "http://localhost/settings",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiTargetBaseUrl: 123,
        }),
      },
      env,
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "aiTargetBaseUrl must be a string or null",
    });
  });
});
