import type { FastifyInstance } from "fastify";

import { generateFieldNames, type AIProvider, type GenerateFieldName } from "../providers/base";

const VALID_GENERATE_FIELDS = new Set<string>(generateFieldNames);

function isGenerateFieldName(value: string): value is GenerateFieldName {
  return VALID_GENERATE_FIELDS.has(value);
}

export function registerGenerateFieldRoute(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.post<{
    Body: {
      field?: string;
      prompt?: string;
      context?: Record<string, unknown>;
    };
  }>("/generate-field", async (request, reply) => {
    const body = request.body;
    if (!body?.field || !body?.prompt) {
      return reply.code(400).send({ error: "field and prompt are required" });
    }

    if (!isGenerateFieldName(body.field)) {
      return reply.code(400).send({ error: "field must be one of: title, description, tags" });
    }

    return deps.provider.generateField({
      field: body.field,
      prompt: body.prompt,
      context: body.context ?? {},
    });
  });
}
