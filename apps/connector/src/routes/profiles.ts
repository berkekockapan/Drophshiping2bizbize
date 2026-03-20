import type { FastifyInstance } from "fastify";

import type { AIProvider } from "../providers/base";

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
}