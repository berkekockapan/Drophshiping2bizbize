import { describe, expect, it, vi } from "vitest";

import { CliProxyRequestError, createCliProxyApiClient } from "./cliProxyApi";

describe("cliProxyApi", () => {
  it("maps management auth failures to a target-specific error code", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Management key gecersiz" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const client = createCliProxyApiClient({
      baseUrl: "https://clip.example.com",
      managementKey: "mgmt_live_123",
      apiKey: "api_live_123",
      fetchImpl,
    });

    await expect(client.listAuthFiles()).rejects.toMatchObject({
      code: "TARGET_MANAGEMENT_UNAUTHORIZED",
      message: "Management key gecersiz",
    });
  });

  it("uses different auth headers for management and inference requests", async () => {
    const fetchImpl = vi.fn().mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/v0/management/auth-files")) {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const client = createCliProxyApiClient({
      baseUrl: "https://clip.example.com",
      managementKey: "mgmt_live_123",
      apiKey: "api_live_123",
      fetchImpl,
    });

    await client.listAuthFiles();
    await client.createChatCompletion({
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Merhaba" }],
    });

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "https://clip.example.com/v0/management/auth-files",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mgmt_live_123",
        }),
      }),
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "https://clip.example.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer api_live_123",
        }),
      }),
    );
  });

  it("raises a timeout error when the target does not respond in time", async () => {
    vi.useFakeTimers();

    const fetchImpl = vi.fn().mockImplementation((_input, init) => {
      const signal = init?.signal as AbortSignal | undefined;

      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), {
          once: true,
        });
      });
    });

    const client = createCliProxyApiClient({
      baseUrl: "https://clip.example.com",
      managementKey: "mgmt_live_123",
      fetchImpl,
      timeoutMs: 50,
    });

    const promise = client.listAuthFiles();
    const expectation = expect(promise).rejects.toMatchObject({
      code: "TARGET_REQUEST_TIMEOUT",
    });

    await vi.advanceTimersByTimeAsync(50);
    await expectation;

    vi.useRealTimers();
  });
});
