import type { FastifyInstance } from "fastify";

import type { AIProvider, GenerateRequest } from "../providers/base";

export function registerGenerateRoute(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.post<{ Body: Partial<GenerateRequest> }>("/generate", async (request, reply) => {
    const body = request.body;
    if (!body || !body.productId || !body.sourceTitle) {
      return reply.code(400).send({ error: "productId and sourceTitle are required" });
    }

    const generated = await deps.provider.generate({
      productId: body.productId,
      sourceTitle: body.sourceTitle,
      language: body.language ?? "en",
      sourceDescription: body.sourceDescription ?? null,
      sourceAttributes: body.sourceAttributes ?? [],
    });

    return generated;
  });
}