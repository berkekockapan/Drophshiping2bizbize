import {
  getImageExtensionFromFileName,
  getPreferredImageExtensionForFormat,
  getSupportedImageFormatFromFileName,
  type SupportedImageFormat,
} from "./supportedImageFormats";

export function normalizeRelativePath(input: string): string {
  const trimmed = input.replace(/\0/g, "").trim();
  if (!trimmed) {
    return "";
  }

  const normalized = trimmed.replaceAll("\\", "/").replace(/^\/+/, "");
  const segments = normalized.split("/");
  const result: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === ".") {
      continue;
    }

    if (segment === "..") {
      if (result.length > 0) {
        result.pop();
      }
      continue;
    }

    result.push(segment);
  }

  return result.join("/");
}

export function resolveRelativePathForFormat(relativePath: string, format: SupportedImageFormat): string {
  const normalized = normalizeRelativePath(relativePath);
  const safePath = normalized || relativePath.replace(/\0/g, "").trim() || "dosya";
  const lastSlashIndex = safePath.lastIndexOf("/");
  const folder = lastSlashIndex >= 0 ? safePath.slice(0, lastSlashIndex) : "";
  const fileName = lastSlashIndex >= 0 ? safePath.slice(lastSlashIndex + 1) : safePath;
  const currentExtension = getImageExtensionFromFileName(fileName);
  const currentFormat = getSupportedImageFormatFromFileName(fileName);
  const nextExtension = currentFormat === format && currentExtension ? currentExtension : getPreferredImageExtensionForFormat(format);
  const nextFileName =
    currentExtension && fileName.length > currentExtension.length + 1
      ? `${fileName.slice(0, -(currentExtension.length + 1))}.${nextExtension}`
      : `${fileName}.${nextExtension}`;

  return folder ? `${folder}/${nextFileName}` : nextFileName;
}

export function getRelativePathName(relativePath: string): string {
  const normalized = normalizeRelativePath(relativePath);
  if (!normalized) {
    return "";
  }

  const index = normalized.lastIndexOf("/");
  return index >= 0 ? normalized.slice(index + 1) : normalized;
}

function splitFilename(name: string) {
  const normalized = name.replace(/\0/g, "");
  const dotIndex = normalized.lastIndexOf(".");

  if (dotIndex <= 0) {
    return {
      stem: normalized,
      extension: "",
    };
  }

  return {
    stem: normalized.slice(0, dotIndex),
    extension: normalized.slice(dotIndex),
  };
}

export function resolveDeterministicZipPath(candidatePath: string, usedPaths: Set<string>): string {
  const normalized = normalizeRelativePath(candidatePath);
  const safeCandidate = normalized || "dosya";

  if (!usedPaths.has(safeCandidate)) {
    usedPaths.add(safeCandidate);
    return safeCandidate;
  }

  const lastSlashIndex = safeCandidate.lastIndexOf("/");
  const folder = lastSlashIndex >= 0 ? safeCandidate.slice(0, lastSlashIndex) : "";
  const fileName = lastSlashIndex >= 0 ? safeCandidate.slice(lastSlashIndex + 1) : safeCandidate;
  const { stem, extension } = splitFilename(fileName);

  for (let counter = 2; ; counter += 1) {
    const nextName = `${stem} (${counter})${extension}`;
    const nextCandidate = folder ? `${folder}/${nextName}` : nextName;

    if (!usedPaths.has(nextCandidate)) {
      usedPaths.add(nextCandidate);
      return nextCandidate;
    }
  }
}
