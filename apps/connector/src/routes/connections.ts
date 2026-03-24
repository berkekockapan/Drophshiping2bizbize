import type { FastifyInstance } from "fastify";

import type { AIProvider } from "../providers/base";

export function registerConnectionsRoutes(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.post("/connections/openai/start", async (_request, reply) => {
    const attempt = await deps.provider.startConnection("openai");
    return reply.code(202).send({ attempt });
  });

  server.get<{ Params: { attemptId: string } }>("/connections/openai/attempts/:attemptId", async (request, reply) => {
    const attempt = await deps.provider.getConnectionAttempt(request.params.attemptId);

    if (!attempt) {
      return reply.code(404).send({ error: "Connection attempt not found" });
    }

    return { attempt };
  });

  server.post<{ Params: { attemptId: string } }>(
    "/connections/openai/attempts/:attemptId/cancel",
    async (request, reply) => {
      const attempt = await deps.provider.cancelConnectionAttempt(request.params.attemptId);

      if (!attempt) {
        return reply.code(404).send({ error: "Connection attempt not found" });
      }

      return { attempt };
    },
  );
}
