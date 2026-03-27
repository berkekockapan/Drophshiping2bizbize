import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { beforeEach, describe, expect, it, vi } from "vitest";

const { launchPersistentContext } = vi.hoisted(() => ({
  launchPersistentContext: vi.fn(),
}));

vi.mock("playwright", () => ({
  chromium: {
    launchPersistentContext,
  },
}));

import { BrowserSession } from "../../src/browser/browserSession";

function createStubContext() {
  return {
    addInitScript: vi.fn(async () => undefined),
    pages: () => [],
    newPage: async () => ({ id: "page" }),
    on: vi.fn(),
    close: vi.fn(),
  } as never;
}

describe("BrowserSession", () => {
  beforeEach(() => {
    launchPersistentContext.mockReset();
  });

  it("tries real browser channels before falling back to bundled chromium", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-browser-session-"));
    const context = createStubContext();

    launchPersistentContext
      .mockRejectedValueOnce(new Error("chrome missing"))
      .mockResolvedValueOnce(context);

    const session = new BrowserSession(dir);
    await session.ensureProfilePage("profile-1");

    expect(launchPersistentContext).toHaveBeenCalledTimes(2);
    expect(launchPersistentContext).toHaveBeenNthCalledWith(
      1,
      expect.any(String),
      expect.objectContaining({
        headless: false,
        channel: "chrome",
      }),
    );
    expect(launchPersistentContext).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({
        headless: false,
        channel: "msedge",
      }),
    );
  });

  it("can disable browser channel forcing when explicitly configured", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-browser-session-"));
    const context = createStubContext();

    launchPersistentContext.mockResolvedValueOnce(context);

    const session = new BrowserSession(dir, {
      channel: null,
      fallbackChannels: [],
    });
    await session.ensureProfilePage("profile-2");

    expect(launchPersistentContext).toHaveBeenCalledTimes(1);
    expect(launchPersistentContext).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headless: false,
      }),
    );
    expect(launchPersistentContext.mock.calls[0]?.[1]).not.toHaveProperty("channel");
  });

  it("can read only currently open profile pages without launching new browser contexts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-browser-session-"));
    const context = createStubContext();

    launchPersistentContext.mockResolvedValueOnce(context);

    const session = new BrowserSession(dir);
    await session.ensureProfilePage("profile-open");

    const openProfile = await session.getOpenProfilePage("profile-open");
    const missingProfile = await session.getOpenProfilePage("profile-missing");

    expect(openProfile).not.toBeNull();
    expect(missingProfile).toBeNull();
    expect(launchPersistentContext).toHaveBeenCalledTimes(1);
  });
});
