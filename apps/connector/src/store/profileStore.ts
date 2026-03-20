import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ProviderId = "mock" | "chatgpt-web";

export interface ConnectorProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: ProviderId;
}

export interface SaveProfileInput extends ConnectorProfile {
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
  getProfileSecret(profileId: string): Promise<string | null>;
}

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

export function createProfileStore(baseDir: string): ProfileStore {
  const statePath = resolve(baseDir, "profiles.json");
  const secretsPath = resolve(baseDir, "secrets.json");

  async function readState() {
    const state = await readJson<ProfileStateFile>(statePath, DEFAULT_STATE);
    return {
      profiles: Array.isArray(state.profiles) ? state.profiles : [],
      activeProfileId: state.activeProfileId ?? null,
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
      const profile: ConnectorProfile = {
        id: input.id,
        label: input.label,
        emailMasked: input.emailMasked,
        provider: input.provider,
      };

      if (existingIndex >= 0) {
        state.profiles[existingIndex] = profile;
      } else {
        state.profiles.push(profile);
      }

      if (!state.activeProfileId) {
        state.activeProfileId = profile.id;
      }

      await writeState(state);

      if (input.sessionSecret) {
        const secrets = await readSecrets();
        secrets[input.id] = input.sessionSecret;
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

    async getProfileSecret(profileId: string) {
      const secrets = await readSecrets();
      return secrets[profileId] ?? null;
    },
  };
}