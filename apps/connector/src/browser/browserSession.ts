import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium, type BrowserContext, type Page } from "playwright";

export class BrowserSession {
  private sessions = new Map<string, Promise<{ context: BrowserContext; page: Page }>>();

  constructor(
    private readonly stateDir: string,
    private readonly options: { headless?: boolean } = {},
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

  private async createProfileSession(profileId: string) {
    const profileDir = resolve(this.stateDir, "profiles", profileId);
    await mkdir(profileDir, { recursive: true });

    const context = await chromium.launchPersistentContext(profileDir, {
      headless: this.options.headless ?? false,
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
