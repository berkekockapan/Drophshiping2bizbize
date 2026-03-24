import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ProviderId = "mock" | "chatgpt-web";
export type ConnectorProfileStatus = "connected" | "needs_reauth" | "disconnected" | "error";

export interface ConnectorProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: ProviderId;
  status: ConnectorProfileStatus;
  lastValidatedAt: number | null;
  lastError: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SaveProfileInput extends Omit<ConnectorProfile, "createdAt" | "updatedAt"> {
  sessionSecret?: string | null;
}

interface ProfileStateFile {
  profiles: ConnectorProfile[];
  activeProfileId: string | null;
}

type SecretsFile = Record<string, string>;

const DEFAULT_STATE: ProfileStateFile = {
  profiles: [],
  activeProfileId: null,
};

export interface ProfileStore {
  saveProfile(input: SaveProfileInput): Promise<ConnectorProfile>;
  listProfiles(): Promise<ConnectorProfile[]>;
  getActiveProfile(): Promise<ConnectorProfile | null>;
  setActiveProfile(profileId: string): Promise<ConnectorProfile>;
  updateProfile(profileId: string, patch: Partial<ConnectorProfile>): Promise<ConnectorProfile>;
  deleteProfile(profileId: string): Promise<void>;
  getProfileSecret(profileId: string): Promise<string | null>;
}

const DEFAULT_PROFILE_STATUS: ConnectorProfileStatus = "connected";
const VALID_PROFILE_STATUSES = new Set<ConnectorProfileStatus>(["connected", "needs_reauth", "disconnected", "error"]);

async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const content = await readFile(path, "utf8");
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

function isProviderId(value: unknown): value is ProviderId {
  return value === "mock" || value === "chatgpt-web";
}

function normalizeProfile(profile: Partial<ConnectorProfile>, now: number): ConnectorProfile {
  return {
    id: typeof profile.id === "string" ? profile.id : "",
    label: typeof profile.label === "string" ? profile.label : "",
    emailMasked: typeof profile.emailMasked === "string" ? profile.emailMasked : null,
    provider: isProviderId(profile.provider) ? profile.provider : "chatgpt-web",
    status:
      typeof profile.status === "string" && VALID_PROFILE_STATUSES.has(profile.status as ConnectorProfileStatus)
        ? (profile.status as ConnectorProfileStatus)
        : DEFAULT_PROFILE_STATUS,
    lastValidatedAt: typeof profile.lastValidatedAt === "number" ? profile.lastValidatedAt : null,
    lastError: typeof profile.lastError === "string" ? profile.lastError : null,
    createdAt: typeof profile.createdAt === "number" ? profile.createdAt : now,
    updatedAt: typeof profile.updatedAt === "number" ? profile.updatedAt : now,
  };
}

export function createProfileStore(baseDir: string): ProfileStore {
  const statePath = resolve(baseDir, "profiles.json");
  const secretsPath = resolve(baseDir, "secrets.json");

  async function readState() {
    const state = await readJson<ProfileStateFile>(statePath, DEFAULT_STATE);
    const now = Date.now();
    const profiles = Array.isArray(state.profiles)
      ? state.profiles
          .map((profile) => normalizeProfile(profile, now))
          .filter((profile) => profile.id.length > 0)
      : [];
    const activeProfileId =
      typeof state.activeProfileId === "string" && profiles.some((profile) => profile.id === state.activeProfileId)
        ? state.activeProfileId
        : null;

    return {
      profiles,
      activeProfileId,
    };
  }

  async function writeState(state: ProfileStateFile) {
    await writeJson(statePath, state);
  }

  async function readSecrets() {
    return readJson<SecretsFile>(secretsPath, {});
  }

  async function writeSecrets(secrets: SecretsFile) {
    await writeJson(secretsPath, secrets);
  }

  return {
    async saveProfile(input: SaveProfileInput) {
      const state = await readState();
      const existingIndex = state.profiles.findIndex((profile) => profile.id === input.id);
      const now = Date.now();
      const existing = existingIndex >= 0 ? state.profiles[existingIndex] : null;
      const profile: ConnectorProfile = normalizeProfile(
        {
          id: input.id,
          label: input.label,
          emailMasked: input.emailMasked,
          provider: input.provider,
          status: input.status ?? existing?.status ?? DEFAULT_PROFILE_STATUS,
          lastValidatedAt:
            typeof input.lastValidatedAt === "number"
              ? input.lastValidatedAt
              : existing?.lastValidatedAt ?? null,
          lastError:
            typeof input.lastError === "string" || input.lastError === null
              ? input.lastError
              : existing?.lastError ?? null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        },
        now,
      );

      if (existingIndex >= 0) {
        state.profiles[existingIndex] = profile;
      } else {
        state.profiles.push(profile);
      }

      if (!state.activeProfileId) {
        state.activeProfileId = profile.id;
      }

      await writeState(state);

      if (typeof input.sessionSecret !== "undefined") {
        const secrets = await readSecrets();
        if (input.sessionSecret === null) {
          delete secrets[input.id];
        } else {
          secrets[input.id] = input.sessionSecret;
        }
        await writeSecrets(secrets);
      }

      return profile;
    },

    async listProfiles() {
      const state = await readState();
      return [...state.profiles];
    },

    async getActiveProfile() {
      const state = await readState();
      if (!state.activeProfileId) {
        return null;
      }

      return state.profiles.find((profile) => profile.id === state.activeProfileId) ?? null;
    },

    async setActiveProfile(profileId: string) {
      const state = await readState();
      const profile = state.profiles.find((item) => item.id === profileId);
      if (!profile) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      state.activeProfileId = profile.id;
      await writeState(state);
      return profile;
    },

    async updateProfile(profileId: string, patch: Partial<ConnectorProfile>) {
      const state = await readState();
      const existingIndex = state.profiles.findIndex((profile) => profile.id === profileId);
      if (existingIndex < 0) {
        throw new Error(`Profile not found: ${profileId}`);
      }

      const existing = state.profiles[existingIndex];
      const now = Date.now();
      const updated = normalizeProfile(
        {
          ...existing,
          label: typeof patch.label === "string" ? patch.label : existing.label,
          emailMasked: typeof patch.emailMasked !== "undefined" ? patch.emailMasked : existing.emailMasked,
          provider: isProviderId(patch.provider) ? patch.provider : existing.provider,
          status:
            typeof patch.status === "string" && VALID_PROFILE_STATUSES.has(patch.status as ConnectorProfileStatus)
              ? (patch.status as ConnectorProfileStatus)
              : existing.status,
          lastValidatedAt:
            typeof patch.lastValidatedAt === "number" || patch.lastValidatedAt === null
              ? patch.lastValidatedAt
              : existing.lastValidatedAt,
          lastError:
            typeof patch.lastError === "string" || patch.lastError === null ? patch.lastError : existing.lastError,
          createdAt: existing.createdAt,
          updatedAt: now,
        },
        now,
      );

      state.profiles[existingIndex] = updated;
      await writeState(state);
      return updated;
    },

    async deleteProfile(profileId: string) {
      const state = await readState();
      state.profiles = state.profiles.filter((profile) => profile.id !== profileId);

      if (state.activeProfileId === profileId) {
        state.activeProfileId = state.profiles[0]?.id ?? null;
      }

      await writeState(state);

      const secrets = await readSecrets();
      if (typeof secrets[profileId] !== "undefined") {
        delete secrets[profileId];
        await writeSecrets(secrets);
      }
    },

    async getProfileSecret(profileId: string) {
      const secrets = await readSecrets();
      return secrets[profileId] ?? null;
    },
  };
}
