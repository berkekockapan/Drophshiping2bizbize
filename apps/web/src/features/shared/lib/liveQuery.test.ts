import { describe, expect, it } from "vitest";

import { LIVE_SYNC_INTERVAL_MS, liveSyncQueryOptions } from "./liveQuery";

describe("liveSyncQueryOptions", () => {
  it("keeps the agreed polling and focus behavior", () => {
    expect(LIVE_SYNC_INTERVAL_MS).toBe(10_000);
    expect(liveSyncQueryOptions).toMatchObject({
      staleTime: 0,
      refetchInterval: 10_000,
      refetchOnWindowFocus: "always",
      refetchOnReconnect: true,
    });
  });
});
