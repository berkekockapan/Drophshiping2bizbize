export type OwnerKey = "berke";

export const ownerOptions = [
  { key: "berke", label: "Berke" },
] as const satisfies ReadonlyArray<{ key: OwnerKey; label: string }>;

const OWNER_STORAGE_KEY = "tracking:last-owner-key";
const DEFAULT_OWNER_KEY: OwnerKey = "berke";

export function isOwnerKey(value: unknown): value is OwnerKey {
  return value === "berke";
}

export function readLastOwnerKey(): OwnerKey | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(OWNER_STORAGE_KEY);
  return isOwnerKey(raw) ? raw : null;
}

export function writeLastOwnerKey(ownerKey: OwnerKey) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(OWNER_STORAGE_KEY, ownerKey);
}

export function getDefaultOwnerKey() {
  return readLastOwnerKey() ?? DEFAULT_OWNER_KEY;
}

export function getDefaultOwnerPath() {
  return `/owners/${getDefaultOwnerKey()}/products`;
}

export function readOwnerKeyFromPath(pathname: string): OwnerKey | null {
  const matched = /^\/owners\/([^/]+)/.exec(pathname)?.[1];
  return isOwnerKey(matched) ? matched : null;
}
