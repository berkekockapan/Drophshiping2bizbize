import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AIConnectionsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows local connector status, active account, and account switching actions", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("127.0.0.1:4317/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
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

    expect(await screen.findByText(/chatgpt workspace bağlı/i)).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /aktif yap/i })).toBeEnabled();
  });
});