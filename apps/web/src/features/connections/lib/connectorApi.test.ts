import { describe, expect, it, vi } from "vitest";

import { ConnectorApiRequestError, createConnectorApiClient } from "./connectorApi";

describe("connectorApi", () => {
  it("uses the desktop connector health endpoint", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: "online",
          provider: "chatgpt-web",
          activeProfile: null,
          connectionAttempt: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createConnectorApiClient({
      baseUrl: "http://127.0.0.1:4318",
      fetchImpl,
    });

    await expect(client.getHealth()).resolves.toMatchObject({
      status: "online",
      provider: "chatgpt-web",
    });
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:4318/health", undefined);
  });

  it("maps connector 409 profile reauth responses to a typed error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ error: { code: "PROFILE_NEEDS_REAUTH", message: "Aktif hesap yeniden giri? istiyor." } }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const client = createConnectorApiClient({ baseUrl: "http://127.0.0.1:4318" });
    await expect(client.generateField({ field: "title", prompt: "Return JSON", context: {} })).rejects.toMatchObject({
      code: "PROFILE_NEEDS_REAUTH",
    });
  });

  it("sends connector generate-field requests as JSON", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ field: "title", value: "Generated Title", provider: "chatgpt-web" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createConnectorApiClient({
      baseUrl: "http://127.0.0.1:4318",
      fetchImpl,
    });

    await expect(client.generateField({ field: "title", prompt: "Return JSON", context: { productId: "prod_1" } })).resolves.toEqual({
      field: "title",
      value: "Generated Title",
      provider: "chatgpt-web",
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:4318/generate-field",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field: "title", prompt: "Return JSON", context: { productId: "prod_1" } }),
      }),
    );
  });

  it("exposes request status on typed connector errors", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Connection attempt not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createConnectorApiClient({
      baseUrl: "http://127.0.0.1:4318",
      fetchImpl,
    });

    await expect(client.getConnectionAttempt("missing")).rejects.toEqual(
      expect.objectContaining<Partial<ConnectorApiRequestError>>({
        code: "CONNECTOR_REQUEST_FAILED",
        message: "Connection attempt not found",
        status: 404,
      }),
    );
  });
});

