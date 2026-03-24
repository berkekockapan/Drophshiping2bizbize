import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { ProviderId } from "./store/profileStore";

export interface ConnectorConfig {
  host: string;
  port: number;
  provider: ProviderId;
  stateDir: string;
}

export interface DotEnvLoadResult {
  loaded: boolean;
  path: string;
  keys: string[];
}

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadDotEnvFile(
  filePath = resolve(process.cwd(), ".env"),
  targetEnv: NodeJS.ProcessEnv = process.env,
): DotEnvLoadResult {
  if (!existsSync(filePath)) {
    return {
      loaded: false,
      path: filePath,
      keys: [],
    };
  }

  const content = readFileSync(filePath, "utf8");
  const keys: string[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    if (!key || key in targetEnv) {
      continue;
    }

    const value = line.slice(separatorIndex + 1);
    targetEnv[key] = stripWrappingQuotes(value);
    keys.push(key);
  }

  return {
    loaded: true,
    path: filePath,
    keys,
  };
}

function toProviderId(value: string | undefined): ProviderId {
  if (value === "mock") {
    return "mock";
  }

  return "chatgpt-web";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConnectorConfig {
  return {
    host: env.CONNECTOR_HOST ?? "127.0.0.1",
    port: Number(env.CONNECTOR_PORT ?? 4317),
    provider: toProviderId(env.CONNECTOR_PROVIDER),
    stateDir: resolve(process.cwd(), env.CONNECTOR_STATE_DIR ?? ".state"),
  };
}
