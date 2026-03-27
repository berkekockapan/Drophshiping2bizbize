import "@testing-library/jest-dom/vitest";
import { describe, expect, it } from "vitest";

import { collectFilesFromDropItems, collectFilesFromInputList } from "./fileCollection";

function createTextFile(name: string, content = "ok") {
  return new File([content], name, { type: "text/plain" });
}

interface MockFileEntry {
  isFile: true;
  isDirectory: false;
  name: string;
  fullPath: string;
  file: (success: (file: File) => void, error?: (error: unknown) => void) => void;
}

interface MockDirectoryEntry {
  isFile: false;
  isDirectory: true;
  name: string;
  fullPath: string;
  createReader: () => {
    readEntries: (success: (entries: Array<MockFileEntry | MockDirectoryEntry>) => void, error?: (error: unknown) => void) => void;
  };
}

function createFileEntry(fullPath: string, file: File): MockFileEntry {
  return {
    isFile: true,
    isDirectory: false,
    name: file.name,
    fullPath,
    file: (success: (file: File) => void) => success(file),
  };
}

function createDirectoryEntry(fullPath: string, children: Array<MockFileEntry | MockDirectoryEntry>): MockDirectoryEntry {
  let readCount = 0;

  return {
    isFile: false,
    isDirectory: true,
    name: fullPath.split("/").filter(Boolean).pop() ?? "root",
    fullPath,
    createReader: () => ({
      readEntries: (success: (entries: Array<MockFileEntry | MockDirectoryEntry>) => void) => {
        if (readCount === 0) {
          readCount += 1;
          success(children);
          return;
        }

        success([]);
      },
    }),
  };
}

describe("fileCollection", () => {
  it("webkitRelativePath değerini koruyarak input listesini toplar", () => {
    const first = createTextFile("photo-a.jpg");
    const second = createTextFile("photo-b.png");
    Object.defineProperty(first, "webkitRelativePath", { value: "album//sub/../cover/photo-a.jpg" });
    Object.defineProperty(second, "webkitRelativePath", { value: "album/cover/photo-b.png" });

    const files = collectFilesFromInputList([second, first]);

    expect(files.map((item) => item.relativePath)).toEqual(["album/cover/photo-a.jpg", "album/cover/photo-b.png"]);
    expect(files.map((item) => item.extension)).toEqual(["jpg", "png"]);
    expect(files.every((item) => item.source === "input")).toBe(true);
  });

  it("drop edilen klasör ağacını alt klasör yapısıyla birlikte toplar", async () => {
    const nestedPhoto = createTextFile("nested.webp");
    const rootPhoto = createTextFile("root.jpg");
    const nestedEntry = createFileEntry("/kitaplik/arsiv/2026/nested.webp", nestedPhoto);
    const rootEntry = createFileEntry("/kitaplik/root.jpg", rootPhoto);
    const directory = createDirectoryEntry("/kitaplik", [rootEntry, createDirectoryEntry("/kitaplik/arsiv", [nestedEntry])]);

    const files = await collectFilesFromDropItems([
      {
        webkitGetAsEntry: () => directory,
      } as never,
    ]);

    expect(files.map((item) => item.relativePath)).toEqual(["kitaplik/arsiv/2026/nested.webp", "kitaplik/root.jpg"]);
    expect(files.map((item) => item.extension)).toEqual(["webp", "jpg"]);
    expect(files.every((item) => item.source === "drop")).toBe(true);
  });

  it("entry olmayan drop öğelerinde getAsFile geri dönüşünü kullanır", async () => {
    const file = createTextFile("standalone.avif");

    const files = await collectFilesFromDropItems([
      {
        getAsFile: () => file,
      } as never,
    ]);

    expect(files).toHaveLength(1);
    expect(files[0].relativePath).toBe("standalone.avif");
    expect(files[0].extension).toBe("avif");
  });
});
