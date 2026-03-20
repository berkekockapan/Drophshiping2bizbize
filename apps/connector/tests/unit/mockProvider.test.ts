import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { MockProvider } from "../../src/providers/mockProvider";
import { createProfileStore } from "../../src/store/profileStore";

describe("MockProvider", () => {
  it("returns deterministic generation payload", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-mock-"));
    const store = createProfileStore(dir);
    const provider = new MockProvider(store);

    const result = await provider.generate({
      productId: "prod_1",
      language: "en",
      sourceTitle: "Oversize Hoodie",
      sourceDescription: "Soft touch hoodie",
      sourceAttributes: [{ key: "Fit", value: "Oversize" }],
    });

    expect(result.englishTitle).toContain("Oversize Hoodie");
    expect(result.tags).toHaveLength(13);
    expect(result.model).toBe("mock-v1");
  });
});