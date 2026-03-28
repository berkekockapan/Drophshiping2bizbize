export const LIVE_SYNC_INTERVAL_MS = 10_000;

export const liveSyncQueryOptions = {
  staleTime: 0,
  refetchInterval: LIVE_SYNC_INTERVAL_MS,
  refetchOnWindowFocus: "always" as const,
  refetchOnReconnect: true,
};
