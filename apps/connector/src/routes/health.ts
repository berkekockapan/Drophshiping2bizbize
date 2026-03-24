import type { FastifyInstance } from "fastify";

import type { AIProvider } from "../providers/base";

export function registerHealthRoute(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.get("/health", async () => {
    return deps.provider.getHealth();
  });
}
