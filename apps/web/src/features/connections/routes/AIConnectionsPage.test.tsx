import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AIConnectionsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows provider visibility for chatgpt-web and account switching actions", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("127.0.0.1:4317/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
            provider: "chatgpt-web",
            activeProfile: {
              id: "profile_primary",
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
              provider: "chatgpt-web",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("127.0.0.1:4317/profiles") && (!init?.method || init?.method === "GET")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "profile_primary",
                label: "ChatGPT Workspace",
                emailMasked: "wo***@company.com",
                provider: "chatgpt-web",
              },
              {
                id: "profile_backup",
                label: "Backup Workspace",
                emailMasked: "ba***@company.com",
                provider: "chatgpt-web",
              },
            ],
            activeProfile: {
              id: "profile_primary",
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
              provider: "chatgpt-web",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/profiles/profile_backup/activate") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            ok: true,
            activeProfile: {
              id: "profile_backup",
              label: "Backup Workspace",
              emailMasked: "ba***@company.com",
              provider: "chatgpt-web",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles/sync") && init?.method === "POST") {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(/provider: chatgpt-web/i)).toBeInTheDocument();
    expect(screen.queryByText(/test modu aktif/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/chatgpt workspace bağlı/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /aktif yap/i })).toBeEnabled();
  });

  it("shows a mock warning and test profile language when connector runs in mock mode", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("127.0.0.1:4317/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
            provider: "mock",
            activeProfile: {
              id: "mock-default",
              label: "Mock Workspace",
              emailMasked: "mo***@local.dev",
              provider: "mock",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("127.0.0.1:4317/profiles") && (!init?.method || init?.method === "GET")) {
        return new Response(
          JSON.stringify({
            items: [
              {
                id: "mock-default",
                label: "Mock Workspace",
                emailMasked: "mo***@local.dev",
                provider: "mock",
              },
            ],
            activeProfile: {
              id: "mock-default",
              label: "Mock Workspace",
              emailMasked: "mo***@local.dev",
              provider: "mock",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles/sync") && init?.method === "POST") {
        return new Response(JSON.stringify({ items: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(/provider: mock/i)).toBeInTheDocument();
    expect(await screen.findByText(/test modu aktif/i)).toBeInTheDocument();
    expect(await screen.findByText(/CONNECTOR_PROVIDER=chatgpt-web/i)).toBeInTheDocument();
    expect(await screen.findByText(/mock workspace test profili aktif/i)).toBeInTheDocument();
  });
});
