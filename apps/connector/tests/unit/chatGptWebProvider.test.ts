import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { ChatGptWebProvider } from "../../src/providers/chatgptWebProvider";
import { createConnectionAttemptStore } from "../../src/store/connectionAttemptStore";
import { createProfileStore } from "../../src/store/profileStore";

function createStubPage({
  url,
  bodyText,
  title = "ChatGPT",
}: {
  url: string;
  bodyText: string;
  title?: string;
}) {
  return {
    goto: async () => undefined,
    waitForLoadState: async () => undefined,
    waitForTimeout: async () => undefined,
    url: () => url,
    textContent: async () => bodyText,
    title: async () => title,
  } as never;
}


describe("ChatGptWebProvider", () => {
  it("marks the active profile as needs_reauth when health validation sees an expired session", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);

    await store.saveProfile({
      id: "profile_main",
      label: "ChatGPT Workspace",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
      status: "connected",
      lastValidatedAt: Date.parse("2026-03-25T09:00:00.000Z"),
      lastError: null,
    });

    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: {} as never }),
      },
      inspectSession: async () => null,
      openLoginPage: async () => undefined,
    });

    const health = await provider.getHealth();

    expect(health.activeProfile?.status).toBe("needs_reauth");
    expect(health.activeProfile?.lastError).toBe("Session expired");
  });

  it("keeps only the newest connected chatgpt-web profile after a successful connection", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const attempts = createConnectionAttemptStore(dir);

    await store.saveProfile({
      id: "profile_old",
      label: "Old Workspace",
      emailMasked: "ol***@mail.com",
      provider: "chatgpt-web",
      status: "connected",
      lastValidatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
      lastError: null,
    });

    let verified = false;
    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      attempts,
      browserSession: {
        ensureProfilePage: async () => ({ page: {} as never }),
        deleteProfileStorage: async () => undefined,
      },
      openLoginPage: async () => undefined,
      inspectSession: async () =>
        verified ? { label: "New Workspace", emailMasked: "ne***@mail.com" } : null,
      createId: () => "profile_new",
    });

    const started = await provider.startConnection("openai");
    verified = true;
    await provider.getConnectionAttempt(started.id);

    const profiles = await provider.listProfiles();
    expect(profiles.map((item) => item.id)).toEqual(["profile_new"]);
  });

  it("keeps the connection pending on Turkish logged-out ChatGPT pages", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const attempts = createConnectionAttemptStore(dir);
    const page = createStubPage({
      url: "https://chatgpt.com/",
      bodyText: ["ChatGPT", "Oturum ac", "Ucretsiz kaydol", "Herhangi bir sey sor"].join("\n"),
    });

    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      attempts,
      browserSession: {
        ensureProfilePage: async () => ({ page }),
      },
      openLoginPage: async () => undefined,
      createId: () => "profile-anon",
    });

    const started = await provider.startConnection("openai");
    const polled = await provider.getConnectionAttempt(started.id);
    const health = await provider.getHealth();

    expect(polled).toEqual(
      expect.objectContaining({
        status: "waiting_for_login",
        profileId: "profile-anon",
      }),
    );
    expect(health.activeProfile).toBeNull();
    expect(health.connectionAttempt).toEqual(
      expect.objectContaining({
        status: "waiting_for_login",
      }),
    );
  });

  it("treats localized auth modal copy as signed out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: createStubPage({ url: "https://chatgpt.com/", bodyText: "" }) }),
      },
      openLoginPage: async () => undefined,
    });

    const inspectSession = (provider as any).inspectSession.bind(provider) as (page: never) => Promise<unknown>;

    await expect(
      inspectSession(
        createStubPage({
          url: "https://chatgpt.com/",
          bodyText: ["Google ile devam et", "Apple ile devam et", "Telefonla devam et", "E-posta adresi", "Devam"].join("\n"),
        }),
      ),
    ).resolves.toBeNull();
  });

  it("treats empty titles as not yet authenticated", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: createStubPage({ url: "https://chatgpt.com/", bodyText: "" }) }),
      },
      openLoginPage: async () => undefined,
    });

    const inspectSession = (provider as any).inspectSession.bind(provider) as (page: never) => Promise<unknown>;

    await expect(
      inspectSession(
        createStubPage({
          url: "https://chatgpt.com/",
          title: "",
          bodyText: ["ChatGPT", "Herhangi bir sey sor"].join("\n"),
        }),
      ),
    ).resolves.toBeNull();
  });

  it("treats challenge titles as signed out", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      browserSession: {
        ensureProfilePage: async () => ({ page: createStubPage({ url: "https://chatgpt.com/", bodyText: "" }) }),
      },
      openLoginPage: async () => undefined,
    });

    const inspectSession = (provider as any).inspectSession.bind(provider) as (page: never) => Promise<unknown>;

    await expect(
      inspectSession(
        createStubPage({
          url: "https://chatgpt.com/",
          title: "Just a moment...",
          bodyText: ["Cloudflare", "Verify you are human"].join("\n"),
        }),
      ),
    ).resolves.toBeNull();
  });

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

  it("does not relaunch browser during polling when no open session exists", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-chatgpt-provider-"));
    const store = createProfileStore(dir);
    const attempts = createConnectionAttemptStore(dir);
    const ensureProfilePage = vi.fn(async () => ({ page: {} as never }));
    const getOpenProfilePage = vi.fn(async () => null);

    const provider = new ChatGptWebProvider(store, {
      stateDir: dir,
      attempts,
      browserSession: {
        ensureProfilePage,
        getOpenProfilePage,
      },
      openLoginPage: async () => undefined,
      inspectSession: async () => null,
      createId: () => "profile-closed",
    });

    const started = await provider.startConnection("openai");
    const polled = await provider.getConnectionAttempt(started.id);

    expect(polled).toEqual(
      expect.objectContaining({
        status: "waiting_for_login",
        profileId: "profile-closed",
      }),
    );
    expect(ensureProfilePage).toHaveBeenCalledTimes(1);
    expect(getOpenProfilePage).toHaveBeenCalledTimes(1);
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
