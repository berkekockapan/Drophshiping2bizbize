import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MockProvider } from "../../src/providers/mockProvider";
import { createConnectorServer, type ConnectorServerContext } from "../../src/server";
import type { AIProvider, GenerateFieldRequest, GenerateRequest } from "../../src/providers/base";
import { createProfileStore } from "../../src/store/profileStore";

let context: ConnectorServerContext | null = null;

afterEach(async () => {
  if (context) {
    await context.server.close();
    context = null;
  }
});

describe("connector server", () => {
  it("returns connector health and active profile from the local server", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-server-"));
    const store = createProfileStore(dir);
    await store.saveProfile({
      id: "primary",
      label: "Primary",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
      status: "connected",
      lastValidatedAt: null,
      lastError: null,
    });

    const provider = new MockProvider(store);
    context = createConnectorServer({
      store,
      provider,
      config: {
        host: "127.0.0.1",
        port: 4317,
        provider: "mock",
        stateDir: dir,
      },
    });

    const health = await context.server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("online");
    expect(health.headers["access-control-allow-origin"]).toBe("*");

    const preflight = await context.server.inject({
      method: "OPTIONS",
      url: "/generate",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "POST",
      },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("*");
    expect(preflight.headers["access-control-allow-methods"]).toContain("POST");

    const profiles = await context.server.inject({ method: "GET", url: "/profiles" });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().items).toHaveLength(1);

    const upsertProfile = await context.server.inject({
      method: "POST",
      url: "/profiles",
      payload: {
        id: "secondary",
        label: "Secondary",
        emailMasked: "se***@company.com",
        provider: "chatgpt-web",
      },
    });

    expect(upsertProfile.statusCode).toBe(200);
    expect(upsertProfile.json().profile.id).toBe("secondary");

    const activate = await context.server.inject({ method: "POST", url: "/profiles/primary/activate" });
    expect(activate.statusCode).toBe(200);
    expect(activate.json().activeProfile.id).toBe("primary");

    const generated = await context.server.inject({
      method: "POST",
      url: "/generate",
      payload: {
        productId: "prod_1",
        language: "en",
        sourceTitle: "Oversize Hoodie",
      },
    });

    expect(generated.statusCode).toBe(200);
    expect(generated.json().englishTitle).toContain("Oversize Hoodie");

    const generatedField = await context.server.inject({
      method: "POST",
      url: "/generate-field",
      payload: {
        field: "title",
        prompt: "Return ONLY valid JSON with a title field value.",
        context: { productId: "prod_1" },
      },
    });

    expect(generatedField.statusCode).toBe(200);
    expect(generatedField.json()).toEqual(
      expect.objectContaining({
        field: "title",
        value: expect.stringContaining("title"),
        provider: "mock",
      }),
    );

    const invalidField = await context.server.inject({
      method: "POST",
      url: "/generate-field",
      payload: {
        field: "price",
        prompt: "Return ONLY valid JSON with a price field value.",
        context: { productId: "prod_1" },
      },
    });

    expect(invalidField.statusCode).toBe(400);
    expect(invalidField.json()).toEqual({
      error: "field must be one of: title, description, tags",
    });
  });

  it("exposes connection start, poll, reconnect, delete, and richer health routes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-server-"));
    const store = createProfileStore(dir);
    const activeProfile = await store.saveProfile({
      id: "profile_main",
      label: "Primary",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
      status: "connected",
      lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
      lastError: null,
    });

    const attempt = {
      id: "attempt_main",
      provider: "openai" as const,
      status: "waiting_for_login" as const,
      profileId: activeProfile.id,
      error: null,
      createdAt: Date.parse("2026-03-24T10:00:00.000Z"),
      updatedAt: Date.parse("2026-03-24T10:00:01.000Z"),
    };
    const deletedIds: string[] = [];

    const provider: AIProvider = {
      id: "chatgpt-web",
      listProfiles: async () => [activeProfile],
      getActiveProfile: async () => activeProfile,
      getHealth: async () => ({
        status: "online",
        provider: "chatgpt-web",
        activeProfile,
        connectionAttempt: attempt,
      }),
      startConnection: async () => attempt,
      getConnectionAttempt: async () => attempt,
      reconnectProfile: async () => attempt,
      deleteProfile: async (profileId) => {
        deletedIds.push(profileId);
      },
      cancelConnectionAttempt: async () => ({
        ...attempt,
        status: "cancelled",
      }),
      activateProfile: async () => activeProfile,
      upsertProfile: async () => activeProfile,
      generate: async (request: GenerateRequest) => ({
        englishTitle: request.sourceTitle,
        shortDescription: request.sourceTitle,
        longDescription: request.sourceTitle,
        tags: [],
        materials: [],
        attributes: [],
        seoNotes: "",
        policyNotes: "",
        model: "stub",
      }),
      generateField: async (request: GenerateFieldRequest) => ({
        field: request.field,
        value: "stub value",
        provider: "chatgpt-web",
      }),
    };

    context = createConnectorServer({
      store,
      provider,
      config: {
        host: "127.0.0.1",
        port: 4317,
        provider: "chatgpt-web",
        stateDir: dir,
      },
    });

    const start = await context.server.inject({
      method: "POST",
      url: "/connections/openai/start",
    });
    expect(start.statusCode).toBe(202);
    expect(start.json().attempt).toEqual(
      expect.objectContaining({
        status: "waiting_for_login",
      }),
    );

    const poll = await context.server.inject({
      method: "GET",
      url: `/connections/openai/attempts/${attempt.id}`,
    });
    expect(poll.statusCode).toBe(200);
    expect(poll.json().attempt).toEqual(expect.objectContaining({ id: attempt.id }));

    const health = await context.server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json()).toEqual(
      expect.objectContaining({
        status: "online",
        provider: "chatgpt-web",
        activeProfile: expect.objectContaining({
          status: "connected",
        }),
      }),
    );

    const reconnect = await context.server.inject({
      method: "POST",
      url: "/profiles/profile_main/reconnect",
    });
    expect(reconnect.statusCode).toBe(202);
    expect(reconnect.json().attempt).toEqual(expect.objectContaining({ id: attempt.id }));

    const deleteResponse = await context.server.inject({
      method: "DELETE",
      url: "/profiles/profile_main",
    });
    expect(deleteResponse.statusCode).toBe(204);
    expect(deletedIds).toEqual(["profile_main"]);
  });
});
