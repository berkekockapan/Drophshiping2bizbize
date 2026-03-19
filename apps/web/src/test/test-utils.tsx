import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

function Providers({ children, route = "/" }: PropsWithChildren<{ route?: string }>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(ui: ReactElement, { route = "/" }: { route?: string } = {}) {
  return render(ui, {
    wrapper: ({ children }) => <Providers route={route}>{children}</Providers>,
  });
}

export * from "@testing-library/react";
