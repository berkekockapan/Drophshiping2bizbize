import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export type ConnectionAttemptStatus =
  | "pending_browser_launch"
  | "waiting_for_login"
  | "verifying_session"
  | "completed"
  | "failed"
  | "cancelled";

export interface ConnectionAttempt {
  id: string;
  provider: "openai";
  status: ConnectionAttemptStatus;
  profileId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

interface ConnectionAttemptStateFile {
  attempts: ConnectionAttempt[];
}

export interface ConnectionAttemptStore {
  create(input: { provider: "openai"; status?: ConnectionAttemptStatus; profileId?: string | null; error?: string | null }): Promise<ConnectionAttempt>;
  update(
    attemptId: string,
    patch: Partial<Pick<ConnectionAttempt, "status" | "profileId" | "error">>,
  ): Promise<ConnectionAttempt>;
  get(attemptId: string): Promise<ConnectionAttempt | null>;
  getLatest(): Promise<ConnectionAttempt | null>;
}

const DEFAULT_STATE: ConnectionAttemptStateFile = {
  attempts: [],
};

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

export function createConnectionAttemptStore(baseDir: string): ConnectionAttemptStore {
  const statePath = resolve(baseDir, "connection-attempts.json");

  async function readState() {
    const state = await readJson<ConnectionAttemptStateFile>(statePath, DEFAULT_STATE);
    return {
      attempts: Array.isArray(state.attempts) ? state.attempts : [],
    };
  }

  async function writeState(state: ConnectionAttemptStateFile) {
    await writeJson(statePath, state);
  }

  return {
    async create(input) {
      const state = await readState();
      const now = Date.now();
      const attempt: ConnectionAttempt = {
        id: randomUUID(),
        provider: input.provider,
        status: input.status ?? "pending_browser_launch",
        profileId: input.profileId ?? null,
        error: input.error ?? null,
        createdAt: now,
        updatedAt: now,
      };

      state.attempts.push(attempt);
      await writeState(state);
      return attempt;
    },

    async update(attemptId, patch) {
      const state = await readState();
      const existingIndex = state.attempts.findIndex((attempt) => attempt.id === attemptId);
      if (existingIndex < 0) {
        throw new Error(`Connection attempt not found: ${attemptId}`);
      }

      const existing = state.attempts[existingIndex];
      const updated: ConnectionAttempt = {
        ...existing,
        status: patch.status ?? existing.status,
        profileId: typeof patch.profileId !== "undefined" ? patch.profileId : existing.profileId,
        error: typeof patch.error !== "undefined" ? patch.error : existing.error,
        updatedAt: Date.now(),
      };

      state.attempts[existingIndex] = updated;
      await writeState(state);
      return updated;
    },

    async get(attemptId) {
      const state = await readState();
      return state.attempts.find((attempt) => attempt.id === attemptId) ?? null;
    },

    async getLatest() {
      const state = await readState();
      return [...state.attempts].sort((left, right) => right.updatedAt - left.updatedAt)[0] ?? null;
    },
  };
}
