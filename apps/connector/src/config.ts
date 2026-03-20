import { resolve } from "node:path";

import type { ProviderId } from "./store/profileStore";

export interface ConnectorConfig {
  host: string;
  port: number;
  provider: ProviderId;
  stateDir: string;
}

function toProviderId(value: string | undefined): ProviderId {
  return value === "chatgpt-web" ? "chatgpt-web" : "mock";
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): ConnectorConfig {
  return {
    host: env.CONNECTOR_HOST ?? "127.0.0.1",
    port: Number(env.CONNECTOR_PORT ?? 4317),
    provider: toProviderId(env.CONNECTOR_PROVIDER),
    stateDir: resolve(process.cwd(), env.CONNECTOR_STATE_DIR ?? ".state"),
  };
}