import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { clearAiTargetCache, readAiTargetCache, writeAiTargetCache } from "./aiTargetStorage";

describe("aiTargetStorage", () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("reads only the cached base url override from localStorage", () => {
    localStorage.setItem("aiTarget.baseUrl", "https://cached.clip.example.com");
    localStorage.setItem("aiTarget.label", "Windows");
    localStorage.setItem("aiTarget.updatedAt", "1711274400000");

    expect(readAiTargetCache()).toEqual({
      baseUrl: "https://cached.clip.example.com",
    });
  });

  it("writes and clears only the cached base url", () => {
    vi.spyOn(Date, "now").mockReturnValue(1711274400000);

    writeAiTargetCache({
      baseUrl: "https://clip.example.com",
    });

    expect(readAiTargetCache()).toEqual({
      baseUrl: "https://clip.example.com",
    });
    expect(localStorage.getItem("aiTarget.label")).toBeNull();
    expect(localStorage.getItem("aiTarget.updatedAt")).toBeNull();

    clearAiTargetCache();

    expect(readAiTargetCache()).toBeNull();
  });
});
