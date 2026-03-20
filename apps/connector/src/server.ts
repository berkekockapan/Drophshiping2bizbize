import Fastify, { type FastifyInstance } from "fastify";

import type { ConnectorConfig } from "./config";
import { loadConfig } from "./config";
import { ChatGptWebProvider } from "./providers/chatgptWebProvider";
import type { AIProvider } from "./providers/base";
import { MockProvider } from "./providers/mockProvider";
import { registerGenerateRoute } from "./routes/generate";
import { registerHealthRoute } from "./routes/health";
import { registerProfilesRoutes } from "./routes/profiles";
import { createProfileStore, type ProfileStore } from "./store/profileStore";

export interface CreateConnectorServerOptions {
  config?: ConnectorConfig;
  store?: ProfileStore;
  provider?: AIProvider;
  logger?: boolean;
}

export interface ConnectorServerContext {
  server: FastifyInstance;
  config: ConnectorConfig;
  store: ProfileStore;
  provider: AIProvider;
}

function buildProvider(config: ConnectorConfig, store: ProfileStore) {
  return config.provider === "chatgpt-web"
    ? new ChatGptWebProvider(store)
    : new MockProvider(store);
}

export function createConnectorServer(options: CreateConnectorServerOptions = {}): ConnectorServerContext {
  const config = options.config ?? loadConfig();
  const store = options.store ?? createProfileStore(config.stateDir);
  const provider = options.provider ?? buildProvider(config, store);
  const server = Fastify({ logger: options.logger ?? false });

  registerHealthRoute(server, { provider });
  registerProfilesRoutes(server, { provider });
  registerGenerateRoute(server, { provider });

  return {
    server,
    config,
    store,
    provider,
  };
}