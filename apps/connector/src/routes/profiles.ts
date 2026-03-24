import type { FastifyInstance } from "fastify";

import type { AIProvider } from "../providers/base";
import type { ProviderId } from "../store/profileStore";

interface UpsertProfilePayload {
  id?: string;
  label?: string;
  emailMasked?: string | null;
  provider?: ProviderId;
  sessionSecret?: string | null;
  makeActive?: boolean;
}

export function registerProfilesRoutes(server: FastifyInstance, deps: { provider: AIProvider }) {
  server.get("/profiles", async () => {
    const [profiles, activeProfile] = await Promise.all([
      deps.provider.listProfiles(),
      deps.provider.getActiveProfile(),
    ]);

    return {
      items: profiles,
      activeProfile,
    };
  });

  server.post<{ Body: UpsertProfilePayload }>("/profiles", async (request, reply) => {
    const body = request.body;

    if (!body?.id || !body.label || !body.provider) {
      return reply.code(400).send({ error: "id, label and provider are required" });
    }

    const profile = await deps.provider.upsertProfile({
      id: body.id,
      label: body.label,
      emailMasked: body.emailMasked ?? null,
      provider: body.provider,
      sessionSecret: body.sessionSecret ?? null,
      makeActive: body.makeActive ?? false,
    });

    return {
      ok: true,
      profile,
    };
  });

  server.post<{ Params: { id: string } }>("/profiles/:id/activate", async (request, reply) => {
    try {
      const activeProfile = await deps.provider.activateProfile(request.params.id);
      return {
        ok: true,
        activeProfile,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile activation failed";
      return reply.code(404).send({ error: message });
    }
  });

  server.post<{ Params: { id: string } }>("/profiles/:id/reconnect", async (request, reply) => {
    try {
      const attempt = await deps.provider.reconnectProfile(request.params.id);
      return reply.code(202).send({ attempt });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile reconnect failed";
      return reply.code(404).send({ error: message });
    }
  });

  server.delete<{ Params: { id: string } }>("/profiles/:id", async (request, reply) => {
    try {
      await deps.provider.deleteProfile(request.params.id);
      return reply.code(204).send();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Profile delete failed";
      return reply.code(404).send({ error: message });
    }
  });
}
