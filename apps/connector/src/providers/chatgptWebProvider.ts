import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import type { Page } from "playwright";

import { BrowserSession } from "../browser/browserSession";
import { runFieldPrompt, type GenerateFieldRequest, type GenerateFieldResponse } from "../browser/runFieldPrompt";
import { runPrompt } from "../browser/runPrompt";
import { createConnectionAttemptStore, type ConnectionAttempt, type ConnectionAttemptStore } from "../store/connectionAttemptStore";
import type {
  AIProvider,
  ConnectorHealth,
  ConnectorProviderError,
  GenerateRequest,
  GenerateResponse,
  UpsertProfileInput,
} from "./base";
import { ConnectorProviderError as ProviderError } from "./base";
import type { ConnectorProfile, ProfileStore } from "../store/profileStore";

interface BrowserSessionLike {
  ensureProfilePage(profileId: string): Promise<{ page: Page }>;
  closeProfile?(profileId: string): Promise<void>;
  deleteProfileStorage?(profileId: string): Promise<void>;
}

interface SessionProfileInfo {
  label: string;
  emailMasked: string | null;
}

interface ChatGptWebProviderOptions {
  stateDir?: string;
  browserSession?: BrowserSessionLike;
  attempts?: ConnectionAttemptStore;
  now?: () => number;
  createId?: () => string;
  openLoginPage?: (page: Page, profileId: string) => Promise<void>;
  inspectSession?: (page: Page, profileId: string) => Promise<SessionProfileInfo | null>;
  runPrompt?: (page: Page, request: GenerateRequest) => Promise<GenerateResponse>;
  runFieldPrompt?: (page: Page, request: GenerateFieldRequest) => Promise<GenerateFieldResponse>;
}

const FINAL_ATTEMPT_STATUSES = new Set(["completed", "failed", "cancelled"]);
const IN_PROGRESS_ATTEMPT_STATUSES = new Set(["pending_browser_launch", "waiting_for_login", "verifying_session"]);
const SESSION_EXPIRED_MESSAGE = "Session expired";

export class ChatGptWebProvider implements AIProvider {
  readonly id = "chatgpt-web";
  private readonly browserSession: BrowserSessionLike;
  private readonly attempts: ConnectionAttemptStore;
  private readonly now: () => number;
  private readonly createId: () => string;
  private readonly openLoginPageImpl: (page: Page, profileId: string) => Promise<void>;
  private readonly inspectSessionImpl: (page: Page, profileId: string) => Promise<SessionProfileInfo | null>;
  private readonly runPromptImpl: (page: Page, request: GenerateRequest) => Promise<GenerateResponse>;
  private readonly runFieldPromptImpl: (page: Page, request: GenerateFieldRequest) => Promise<GenerateFieldResponse>;

  constructor(private readonly store: ProfileStore, options: ChatGptWebProviderOptions = {}) {
    const stateDir = options.stateDir ?? resolve(process.cwd(), ".state");

    this.browserSession = options.browserSession ?? new BrowserSession(stateDir);
    this.attempts = options.attempts ?? createConnectionAttemptStore(stateDir);
    this.now = options.now ?? Date.now;
    this.createId = options.createId ?? randomUUID;
    this.openLoginPageImpl = options.openLoginPage ?? this.openLoginPage.bind(this);
    this.inspectSessionImpl = options.inspectSession ?? this.inspectSession.bind(this);
    this.runPromptImpl = options.runPrompt ?? runPrompt;
    this.runFieldPromptImpl = options.runFieldPrompt ?? runFieldPrompt;
  }

  async listProfiles(): Promise<ConnectorProfile[]> {
    return this.store.listProfiles();
  }

  async getActiveProfile() {
    return this.store.getActiveProfile();
  }

  async getHealth(): Promise<ConnectorHealth> {
    const [activeProfile, connectionAttempt] = await Promise.all([
      this.store.getActiveProfile(),
      this.attempts.getLatest(),
    ]);

    return {
      status: "online",
      provider: this.id,
      activeProfile,
      connectionAttempt,
    };
  }

  async startConnection(_provider: "openai") {
    const profileId = this.createId();
    return this.beginConnectionAttempt(profileId);
  }

  async getConnectionAttempt(attemptId: string): Promise<ConnectionAttempt | null> {
    const attempt = await this.attempts.get(attemptId);
    if (!attempt) {
      return null;
    }

    if (!attempt.profileId || FINAL_ATTEMPT_STATUSES.has(attempt.status)) {
      return attempt;
    }

    if (attempt.status === "pending_browser_launch") {
      return attempt;
    }

    await this.attempts.update(attempt.id, {
      status: "verifying_session",
      profileId: attempt.profileId,
      error: null,
    });

    const completed = await this.completeAttemptIfPossible(attempt.id, attempt.profileId);
    if (completed) {
      return completed;
    }

    return this.attempts.update(attempt.id, {
      status: "waiting_for_login",
      profileId: attempt.profileId,
      error: null,
    });
  }

  async cancelConnectionAttempt(attemptId: string): Promise<ConnectionAttempt | null> {
    const attempt = await this.attempts.get(attemptId);
    if (!attempt) {
      return null;
    }

    if (FINAL_ATTEMPT_STATUSES.has(attempt.status)) {
      return attempt;
    }

    if (attempt.profileId) {
      await this.browserSession.closeProfile?.(attempt.profileId).catch(() => undefined);
    }

    return this.attempts.update(attemptId, {
      status: "cancelled",
    });
  }

  async reconnectProfile(profileId: string) {
    await this.store.updateProfile(profileId, {
      status: "needs_reauth",
    });

    return this.beginConnectionAttempt(profileId);
  }

  async deleteProfile(profileId: string) {
    await this.store.deleteProfile(profileId);
    await this.browserSession.deleteProfileStorage?.(profileId).catch(() => undefined);
  }

  async activateProfile(profileId: string) {
    return this.store.setActiveProfile(profileId);
  }

  async upsertProfile(input: UpsertProfileInput) {
    const profile = await this.store.saveProfile({
      id: input.id,
      label: input.label,
      emailMasked: input.emailMasked,
      provider: input.provider,
      status: input.status ?? "connected",
      lastValidatedAt: input.lastValidatedAt ?? null,
      lastError: input.lastError ?? null,
      sessionSecret: input.sessionSecret,
    });

    if (input.makeActive) {
      return this.store.setActiveProfile(profile.id);
    }

    return profile;
  }

  private async ensureConnectedActiveProfile() {
    const activeProfile = await this.store.getActiveProfile();
    if (!activeProfile) {
      throw new ProviderError("NO_ACTIVE_PROFILE", "Aktif ChatGPT hesabı bulunamadı.");
    }

    if (activeProfile.status === "needs_reauth") {
      throw new ProviderError("PROFILE_NEEDS_REAUTH", "Aktif hesap yeniden giriş istiyor.");
    }

    const latestAttempt = await this.attempts.getLatest();
    if (latestAttempt && IN_PROGRESS_ATTEMPT_STATUSES.has(latestAttempt.status)) {
      throw new ProviderError("LOGIN_IN_PROGRESS", "Tarayıcıdaki giriş işlemi henüz tamamlanmadı.");
    }

    const { page } = await this.browserSession.ensureProfilePage(activeProfile.id);
    const session = await this.inspectSessionImpl(page, activeProfile.id);

    if (!session) {
      await this.store.updateProfile(activeProfile.id, {
        status: "needs_reauth",
        lastError: SESSION_EXPIRED_MESSAGE,
      });
      throw new ProviderError("PROFILE_NEEDS_REAUTH", "Aktif hesap yeniden giriş istiyor.");
    }

    const refreshedProfile = await this.store.saveProfile({
      id: activeProfile.id,
      label: session.label || activeProfile.label,
      emailMasked: session.emailMasked ?? activeProfile.emailMasked,
      provider: this.id,
      status: "connected",
      lastValidatedAt: this.now(),
      lastError: null,
    });

    await this.store.setActiveProfile(refreshedProfile.id);

    return {
      profile: refreshedProfile,
      page,
    };
  }

  private async beginConnectionAttempt(profileId: string) {
    const attempt = await this.attempts.create({
      provider: "openai",
      profileId,
    });

    try {
      const { page } = await this.browserSession.ensureProfilePage(profileId);
      await this.openLoginPageImpl(page, profileId);

      return this.attempts.update(attempt.id, {
        status: "waiting_for_login",
        profileId,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Bağlantı başlatılamadı.";
      const existingProfile = (await this.store.listProfiles()).find((profile) => profile.id === profileId);

      if (existingProfile) {
        await this.store.updateProfile(profileId, {
          status: "error",
          lastError: message,
        });
      }

      return this.attempts.update(attempt.id, {
        status: "failed",
        profileId,
        error: message,
      });
    }
  }

  private async completeAttemptIfPossible(attemptId: string, profileId: string) {
    const { page } = await this.browserSession.ensureProfilePage(profileId);
    const session = await this.inspectSessionImpl(page, profileId);

    if (!session) {
      return null;
    }

    const now = this.now();
    await this.store.saveProfile({
      id: profileId,
      label: session.label,
      emailMasked: session.emailMasked,
      provider: this.id,
      status: "connected",
      lastValidatedAt: now,
      lastError: null,
    });
    await this.store.setActiveProfile(profileId);

    return this.attempts.update(attemptId, {
      status: "completed",
      profileId,
      error: null,
    });
  }

  private async openLoginPage(page: Page) {
    await page.goto("https://chat.openai.com/", {
      waitUntil: "domcontentloaded",
    });
  }

  private async inspectSession(page: Page): Promise<SessionProfileInfo | null> {
    await page.waitForLoadState("domcontentloaded", {
      timeout: 5_000,
    }).catch(() => undefined);

    const url = page.url().toLowerCase();
    const bodyText = ((await page.textContent("body").catch(() => "")) ?? "").trim();

    if (
      url.includes("/auth") ||
      url.includes("login") ||
      url.includes("signup") ||
      /(log in|sign up|continue with|giriş yap)/i.test(bodyText)
    ) {
      return null;
    }

    const title = ((await page.title().catch(() => "")) || "ChatGPT Web").trim();
    const maskedEmailMatch = bodyText.match(/[A-Z0-9._%+-]{2}\*+@[A-Z0-9.-]+\.[A-Z]{2,}/i);

    return {
      label: title || "ChatGPT Web",
      emailMasked: maskedEmailMatch?.[0] ?? null,
    };
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const { page } = await this.ensureConnectedActiveProfile();

    try {
      return await this.runPromptImpl(page, request);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        "GENERATION_FAILED",
        error instanceof Error ? error.message : "Üretim başarısız oldu.",
      );
    }
  }

  async generateField(request: GenerateFieldRequest): Promise<GenerateFieldResponse> {
    const { page } = await this.ensureConnectedActiveProfile();

    try {
      return await this.runFieldPromptImpl(page, request);
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        "GENERATION_FAILED",
        error instanceof Error ? error.message : "Alan üretimi başarısız oldu.",
      );
    }
  }
}
