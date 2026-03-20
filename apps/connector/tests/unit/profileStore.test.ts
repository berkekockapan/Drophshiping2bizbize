import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createProfileStore } from "../../src/store/profileStore";

describe("profileStore", () => {
  it("persists profiles without storing raw session secrets in API payloads", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-store-"));
    const store = createProfileStore(dir);

    await store.saveProfile({
      id: "primary",
      label: "Primary",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
      sessionSecret: "super-secret",
    });

    const listed = await store.listProfiles();
    expect(listed).toHaveLength(1);
    expect(listed[0]).toEqual(
      expect.objectContaining({
        id: "primary",
        emailMasked: "wo***@company.com",
        provider: "chatgpt-web",
      }),
    );

    expect((listed[0] as unknown as { sessionSecret?: string }).sessionSecret).toBeUndefined();
    expect(await store.getProfileSecret("primary")).toBe("super-secret");

    const stateRaw = await readFile(join(dir, "profiles.json"), "utf8");
    expect(stateRaw).not.toContain("super-secret");
  });
});