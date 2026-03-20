import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

function Providers({
  children,
  route = "/",
  path,
}: PropsWithChildren<{ route?: string; path?: string }>) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return (
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>
        {path ? (
          <Routes>
            <Route path={path} element={children} />
          </Routes>
        ) : (
          children
        )}
      </QueryClientProvider>
    </MemoryRouter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  { route = "/", path }: { route?: string; path?: string } = {},
) {
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers route={route} path={path}>
        {children}
      </Providers>
    ),
  });
}

export * from "@testing-library/react";
