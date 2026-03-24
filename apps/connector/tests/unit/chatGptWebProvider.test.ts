import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ChatGptWebProvider } from "../../src/providers/chatgptWebProvider";
import { createConnectionAttemptStore } from "../../src/store/connectionAttemptStore";
import { createProfileStore } from "../../src/store/profileStore";

describe("ChatGptWebProvider", () => {
  it("starts a connection, completes it on poll, and reports structured health", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const attempts = createConnectionAttemptStore(dir);

    let sessionVerified = false;
    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      attempts,
      browserSession: {
        ensureProfilePage: async () => ({ page: {} as never }),
      },
      openLoginPage: async () => undefined,
      inspectSession: async () =>
        sessionVerified
          ? {
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
            }
          : null,
      createId: (() => {
        let value = 0;
        return () => `profile-${++value}`;
      })(),
      now: (() => {
        let value = Date.parse("2026-03-24T10:00:00.000Z");
        return () => value++;
      })(),
    });

    const started = await provider.startConnection("openai");
    expect(started).toEqual(
      expect.objectContaining({
        status: "waiting_for_login",
      }),
    );

    sessionVerified = true;

    const completed = await provider.getConnectionAttempt(started.id);
    expect(completed).toEqual(
      expect.objectContaining({
        status: "completed",
        profileId: expect.any(String),
      }),
    );

    await expect(provider.getHealth()).resolves.toEqual(
      expect.objectContaining({
        status: "online",
        provider: "chatgpt-web",
        activeProfile: expect.objectContaining({
          status: "connected",
        }),
        connectionAttempt: expect.objectContaining({
          status: "completed",
        }),
      }),
    );
  });

  it("throws a structured reauth error when the active profile is no longer usable", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);

    await store.saveProfile({
      id: "profile_main",
      label: "ChatGPT Workspace",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
      status: "needs_reauth",
      lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
      lastError: "Session expired",
    });

    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: {} as never }),
      },
      openLoginPage: async () => undefined,
      inspectSession: async () => null,
    });

    await expect(
      provider.generateField({
        field: "title",
        prompt: "Return ONLY valid JSON.",
        context: { productId: "prod_1" },
      }),
    ).rejects.toMatchObject({
      code: "PROFILE_NEEDS_REAUTH",
    });
  });

  it("ignores stale mock profiles when running in chatgpt-web mode", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);

    await store.saveProfile({
      id: "mock-default",
      label: "Mock Workspace",
      emailMasked: "mo***@local.dev",
      provider: "mock",
      status: "connected",
      lastValidatedAt: null,
      lastError: null,
    });

    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: {} as never }),
      },
      openLoginPage: async () => undefined,
      inspectSession: async () => null,
    });

    await expect(provider.listProfiles()).resolves.toEqual([]);
    await expect(provider.getActiveProfile()).resolves.toBeNull();
    await expect(provider.getHealth()).resolves.toEqual(
      expect.objectContaining({
        provider: "chatgpt-web",
        activeProfile: null,
      }),
    );
  });
});
