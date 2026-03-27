import { normalizeRelativePath } from "./pathUtils";
import {
  SUPPORTED_IMAGE_EXTENSIONS,
  type SupportedImageExtension,
} from "./supportedImageFormats";

export interface CollectedMediaFile {
  file: File;
  relativePath: string;
  source: "drop" | "input";
  extension: SupportedImageExtension | null;
}

interface FileSystemEntryLike {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  fullPath?: string;
}

interface FileSystemFileEntryLike extends FileSystemEntryLike {
  isFile: true;
  isDirectory: false;
  file: (success: (file: File) => void, error?: (error: unknown) => void) => void;
}

interface FileSystemDirectoryReaderLike {
  readEntries: (success: (entries: FileSystemEntryLike[]) => void, error?: (error: unknown) => void) => void;
}

interface FileSystemDirectoryEntryLike extends FileSystemEntryLike {
  isFile: false;
  isDirectory: true;
  createReader: () => FileSystemDirectoryReaderLike;
}

interface DropDataTransferItemLike {
  kind?: string;
  getAsFile?: () => File | null;
  webkitGetAsEntry?: () => FileSystemEntryLike | null;
}

function getExtensionFromPath(relativePath: string): SupportedImageExtension | null {
  const normalized = normalizeRelativePath(relativePath);
  const fileName = normalized.slice(normalized.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex <= 0) {
    return null;
  }

  const extension = fileName.slice(dotIndex + 1).toLowerCase();
  return (SUPPORTED_IMAGE_EXTENSIONS as readonly string[]).includes(extension)
    ? (extension as SupportedImageExtension)
    : null;
}

function getRelativePathFromFile(file: File): string {
  const webkitRelativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath?.trim();
  const candidate = webkitRelativePath && webkitRelativePath.length > 0 ? webkitRelativePath : file.name;
  return normalizeRelativePath(candidate) || normalizeRelativePath(file.name) || file.name;
}

function compareCollectedMediaFiles(a: CollectedMediaFile, b: CollectedMediaFile) {
  if (a.relativePath < b.relativePath) {
    return -1;
  }

  if (a.relativePath > b.relativePath) {
    return 1;
  }

  if (a.file.name < b.file.name) {
    return -1;
  }

  if (a.file.name > b.file.name) {
    return 1;
  }

  return 0;
}

function readDirectoryEntries(reader: FileSystemDirectoryReaderLike): Promise<FileSystemEntryLike[]> {
  return new Promise((resolve, reject) => {
    reader.readEntries(resolve, reject);
  });
}

function readFileEntry(entry: FileSystemFileEntryLike): Promise<File> {
  return new Promise((resolve, reject) => {
    entry.file(resolve, reject);
  });
}

function isDirectoryEntry(entry: FileSystemEntryLike): entry is FileSystemDirectoryEntryLike {
  return entry.isDirectory;
}

function isFileEntry(entry: FileSystemEntryLike): entry is FileSystemFileEntryLike {
  return entry.isFile;
}

async function collectFromEntry(entry: FileSystemEntryLike, collected: CollectedMediaFile[]): Promise<void> {
  if (isFileEntry(entry)) {
    const file = await readFileEntry(entry);
    const relativePath = normalizeRelativePath(entry.fullPath ?? file.name) || normalizeRelativePath(file.name) || file.name;

    collected.push({
      file,
      relativePath,
      source: "drop",
      extension: getExtensionFromPath(relativePath),
    });
    return;
  }

  if (!isDirectoryEntry(entry)) {
    return;
  }

  const reader = entry.createReader();
  while (true) {
    const children = await readDirectoryEntries(reader);
    if (children.length === 0) {
      break;
    }

    for (const child of children) {
      await collectFromEntry(child, collected);
    }
  }
}

export function collectFilesFromInputList(files: ArrayLike<File>): CollectedMediaFile[] {
  const collected: CollectedMediaFile[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const relativePath = getRelativePathFromFile(file);

    collected.push({
      file,
      relativePath,
      source: "input",
      extension: getExtensionFromPath(relativePath),
    });
  }

  return collected.sort(compareCollectedMediaFiles);
}

export async function collectFilesFromDropItems(items: ArrayLike<DropDataTransferItemLike>): Promise<CollectedMediaFile[]> {
  const collected: CollectedMediaFile[] = [];

  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    const entry = item.webkitGetAsEntry?.() ?? null;

    if (entry) {
      await collectFromEntry(entry, collected);
      continue;
    }

    const file = item.getAsFile?.() ?? null;
    if (!file) {
      continue;
    }

    const relativePath = normalizeRelativePath(file.name) || file.name || `dosya-${index + 1}`;
    collected.push({
      file,
      relativePath,
      source: "drop",
      extension: getExtensionFromPath(relativePath),
    });
  }

  return collected.sort(compareCollectedMediaFiles);
}
