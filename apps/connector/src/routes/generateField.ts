import type { FastifyInstance } from "fastify";

import type { AIProvider, GenerateFieldRequest } from "../providers/base";

export function registerGenerateFieldRoute(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.post<{
    Body: {
      field?: GenerateFieldRequest["field"];
      prompt?: string;
      context?: Record<string, unknown>;
    };
  }>("/generate-field", async (request, reply) => {
    const body = request.body;
    if (!body?.field || !body?.prompt) {
      return reply.code(400).send({ error: "field and prompt are required" });
    }

    if (typeof deps.provider.generateField !== "function") {
      return reply.code(501).send({ error: "field generation is not supported by the active provider" });
    }

    return deps.provider.generateField({
      field: body.field,
      prompt: body.prompt,
      context: body.context ?? {},
    });
  });
}
