import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

export interface BrowserSessionOptions {
  headless?: boolean;
  channel?: string | null;
  fallbackChannels?: string[];
}

export class BrowserSession {
  private sessions = new Map<string, Promise<{ context: BrowserContext; page: Page }>>();

  constructor(
    private readonly stateDir: string,
    private readonly options: BrowserSessionOptions = {},
  ) {}

  async ensureProfilePage(profileId: string) {
    const existing = this.sessions.get(profileId);
    if (existing) {
      return existing;
    }

    const created = this.createProfileSession(profileId);
    this.sessions.set(profileId, created);
    return created;
  }

  async getOpenProfilePage(profileId: string) {
    const existing = this.sessions.get(profileId);
    if (!existing) {
      return null;
    }

    const session = await existing.catch(() => null);
    if (!session) {
      this.sessions.delete(profileId);
      return null;
    }

    return {
      context: session.context,
      page: session.page,
    };
  }

  private async createProfileSession(profileId: string) {
    const profileDir = resolve(this.stateDir, "profiles", profileId);
    await mkdir(profileDir, { recursive: true });

    const launchOptions = {
      args: ["--disable-blink-features=AutomationControlled"],
      headless: this.options.headless ?? false,
      ignoreDefaultArgs: ["--enable-automation"],
    };
    const primaryChannel = this.options.channel === undefined ? "chrome" : this.options.channel;
    const candidateChannels = [
      primaryChannel,
      ...(this.options.fallbackChannels ?? ["msedge"]),
      null,
    ].filter((value, index, values): value is string | null => values.indexOf(value) === index);

    let context: BrowserContext | null = null;
    let lastError: unknown = null;

    for (const channel of candidateChannels) {
      try {
        context = await chromium.launchPersistentContext(profileDir, {
          ...launchOptions,
          ...(channel ? { channel } : {}),
        });
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!context) {
      throw lastError instanceof Error ? lastError : new Error("Browser session baslatilamadi.");
    }

    await context.addInitScript(() => {
      Object.defineProperty(window.navigator, "webdriver", {
        configurable: true,
        get: () => undefined,
      });
    });

    const page = context.pages()[0] ?? (await context.newPage());

    context.on("close", () => {
      this.sessions.delete(profileId);
    });

    return { context, page };
  }

  async closeProfile(profileId: string) {
    const sessionPromise = this.sessions.get(profileId);
    if (!sessionPromise) {
      return;
    }

    this.sessions.delete(profileId);

    const session = await sessionPromise.catch(() => null);
    if (session) {
      await session.context.close().catch(() => undefined);
    }
  }

  async deleteProfileStorage(profileId: string) {
    await this.closeProfile(profileId);
    await rm(resolve(this.stateDir, "profiles", profileId), {
      recursive: true,
      force: true,
    }).catch(() => undefined);
  }

  async close() {
    const sessionPromises = [...this.sessions.values()];
    this.sessions.clear();

    const settled = await Promise.allSettled(sessionPromises);
    await Promise.all(
      settled.map((result) =>
        result.status === "fulfilled" ? result.value.context.close().catch(() => undefined) : Promise.resolve()
      ),
    );
  }
}
