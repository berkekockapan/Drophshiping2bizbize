import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { createConnectionAttemptStore } from "../../src/store/connectionAttemptStore";

describe("connectionAttemptStore", () => {
  it("creates and updates persisted connection attempts", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-attempts-"));
    const attempts = createConnectionAttemptStore(dir);

    const created = await attempts.create({ provider: "openai" });

    expect(created.status).toBe("pending_browser_launch");

    await attempts.update(created.id, {
      status: "completed",
      profileId: "profile_main",
    });

    expect(await attempts.get(created.id)).toEqual(
      expect.objectContaining({
        status: "completed",
        profileId: "profile_main",
      }),
    );
  });
});
