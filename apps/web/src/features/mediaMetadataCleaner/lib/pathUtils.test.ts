import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { normalizeRelativePath, resolveDeterministicZipPath } from "./pathUtils";

describe("pathUtils", () => {
  it("relative path değerlerini güvenli biçimde normalize eder", () => {
    expect(normalizeRelativePath("  /album//sub/../cover\\photo.jpg  ")).toBe("album/cover/photo.jpg");
    expect(normalizeRelativePath("../../foto/./a.png")).toBe("foto/a.png");
    expect(normalizeRelativePath("folder///child/")).toBe("folder/child");
  });

  it("zip path çakışmalarını deterministik biçimde çözer", () => {
    const usedPaths = new Set<string>();

    expect(resolveDeterministicZipPath("album/photo.jpg", usedPaths)).toBe("album/photo.jpg");
    expect(resolveDeterministicZipPath("album/photo.jpg", usedPaths)).toBe("album/photo (2).jpg");
    expect(resolveDeterministicZipPath("album/photo.jpg", usedPaths)).toBe("album/photo (3).jpg");
    expect(resolveDeterministicZipPath("hatali/photo.jpg", usedPaths)).toBe("hatali/photo.jpg");
    expect(resolveDeterministicZipPath("hatali/photo.jpg", usedPaths)).toBe("hatali/photo (2).jpg");
  });
});

