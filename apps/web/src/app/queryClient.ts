import { QueryClient } from "@tanstack/react-query";

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        // Canli senkron sayfalari kendi refetch ayarlarini override eder.
      },
      mutations: {
        retry: false,
      },
    },
  });
}
