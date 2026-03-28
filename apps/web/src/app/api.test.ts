import { afterEach, describe, expect, it, vi } from "vitest";

describe("app api", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prefixes owner requests with VITE_API_BASE_URL", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://trendyol-etsy-api.workers.dev");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ summary: { trackedCount: 0, activeCount: 0, reviewNeededCount: 0 }, items: [], filters: {} }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { fetchTrackingView } = await import("./api");
    await fetchTrackingView("berke");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://trendyol-etsy-api.workers.dev/owners/berke/products",
      expect.anything(),
    );
  });

  it("maps network failures to a clear cloud persistence message", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("fetch failed"));

    const { fetchTrackingView } = await import("./api");
    await expect(fetchTrackingView("berke")).rejects.toThrow(
      "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
    );

    expect(fetchMock).toHaveBeenCalledWith("/owners/berke/products", expect.anything());
  });
});
