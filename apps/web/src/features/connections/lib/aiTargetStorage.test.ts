import { afterEach, describe, expect, it, vi } from "vitest";

import { clearAiTargetCache, readAiTargetCache, writeAiTargetCache } from "./aiTargetStorage";

describe("aiTargetStorage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads the cached target metadata from localStorage", () => {
    localStorage.setItem("aiTarget.baseUrl", "https://cached.clip.example.com");
    localStorage.setItem("aiTarget.label", "Windows");
    localStorage.setItem("aiTarget.updatedAt", "1711274400000");

    expect(readAiTargetCache()).toEqual({
      baseUrl: "https://cached.clip.example.com",
      label: "Windows",
      updatedAt: 1711274400000,
    });
  });

  it("writes and clears cache values", () => {
    vi.spyOn(Date, "now").mockReturnValue(1711274400000);

    writeAiTargetCache({
      baseUrl: "https://clip.example.com",
      label: "Windows",
    });

    expect(readAiTargetCache()).toEqual({
      baseUrl: "https://clip.example.com",
      label: "Windows",
      updatedAt: 1711274400000,
    });

    clearAiTargetCache();

    expect(readAiTargetCache()).toBeNull();
  });
});
