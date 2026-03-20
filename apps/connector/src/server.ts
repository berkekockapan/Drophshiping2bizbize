import Fastify, { type FastifyInstance, type FastifyReply } from "fastify";

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

function applyCorsHeaders(server: FastifyInstance) {
  const setHeaders = (reply: FastifyReply) => {
    reply.header("Access-Control-Allow-Origin", "*");
    reply.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    reply.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
    reply.header("Access-Control-Max-Age", "86400");
  };

  server.addHook("onRequest", async (request, reply) => {
    setHeaders(reply);

    if (request.method === "OPTIONS") {
      return reply.code(204).send();
    }
  });

  server.addHook("onSend", async (_request, reply, payload) => {
    setHeaders(reply);
    return payload;
  });
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
  applyCorsHeaders(server);

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
