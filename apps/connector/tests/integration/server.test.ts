import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { MockProvider } from "../../src/providers/mockProvider";
import { createConnectorServer, type ConnectorServerContext } from "../../src/server";
import { createProfileStore } from "../../src/store/profileStore";

let context: ConnectorServerContext | null = null;

afterEach(async () => {
  if (context) {
    await context.server.close();
    context = null;
  }
});

describe("connector server", () => {
  it("returns connector health and active profile from the local server", async () => {
    const dir = await mkdtemp(join(tmpdir(), "connector-server-"));
    const store = createProfileStore(dir);
    await store.saveProfile({
      id: "primary",
      label: "Primary",
      emailMasked: "wo***@company.com",
      provider: "chatgpt-web",
    });

    const provider = new MockProvider(store);
    context = createConnectorServer({
      store,
      provider,
      config: {
        host: "127.0.0.1",
        port: 4317,
        provider: "mock",
        stateDir: dir,
      },
    });

    const health = await context.server.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);
    expect(health.json().status).toBe("online");
    expect(health.headers["access-control-allow-origin"]).toBe("*");

    const preflight = await context.server.inject({
      method: "OPTIONS",
      url: "/generate",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "POST",
      },
    });

    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers["access-control-allow-origin"]).toBe("*");
    expect(preflight.headers["access-control-allow-methods"]).toContain("POST");

    const profiles = await context.server.inject({ method: "GET", url: "/profiles" });
    expect(profiles.statusCode).toBe(200);
    expect(profiles.json().items).toHaveLength(1);

    const upsertProfile = await context.server.inject({
      method: "POST",
      url: "/profiles",
      payload: {
        id: "secondary",
        label: "Secondary",
        emailMasked: "se***@company.com",
        provider: "chatgpt-web",
      },
    });

    expect(upsertProfile.statusCode).toBe(200);
    expect(upsertProfile.json().profile.id).toBe("secondary");

    const activate = await context.server.inject({ method: "POST", url: "/profiles/primary/activate" });
    expect(activate.statusCode).toBe(200);
    expect(activate.json().activeProfile.id).toBe("primary");

    const generated = await context.server.inject({
      method: "POST",
      url: "/generate",
      payload: {
        productId: "prod_1",
        language: "en",
        sourceTitle: "Oversize Hoodie",
      },
    });

    expect(generated.statusCode).toBe(200);
    expect(generated.json().englishTitle).toContain("Oversize Hoodie");
  });
});
