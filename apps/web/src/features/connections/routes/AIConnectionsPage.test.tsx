import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AIConnectionsPage", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("starts a connection, polls it to completion, and renders account actions", async () => {
    const user = userEvent.setup();

    let activeProfile: {
      id: string;
      label: string;
      emailMasked: string | null;
      provider: string;
      status: string;
      lastValidatedAt: number | null;
      lastError: string | null;
    } | null = null;
    let connectionAttempt: {
      id: string;
      provider: "openai";
      status: string;
      profileId: string | null;
      error: string | null;
      createdAt: number;
      updatedAt: number;
    } | null = null;
    let profiles: Array<{
      id: string;
      label: string;
      emailMasked: string | null;
      provider: string;
      status: string;
      lastValidatedAt: number | null;
      lastError: string | null;
    }> = [];
    let attemptPollCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("127.0.0.1:4317/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
            provider: "chatgpt-web",
            activeProfile,
            connectionAttempt,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("127.0.0.1:4317/profiles") && (!init?.method || init?.method === "GET")) {
        return new Response(
          JSON.stringify({
            items: profiles,
            activeProfile,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("127.0.0.1:4317/connections/openai/start") && init?.method === "POST") {
        connectionAttempt = {
          id: "attempt_1",
          provider: "openai",
          status: "waiting_for_login",
          profileId: "profile_primary",
          error: null,
          createdAt: Date.parse("2026-03-24T10:00:00.000Z"),
          updatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
        };

        return new Response(JSON.stringify({ attempt: connectionAttempt }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("127.0.0.1:4317/connections/openai/attempts/attempt_1") && (!init?.method || init?.method === "GET")) {
        attemptPollCount += 1;

        if (attemptPollCount >= 2) {
          activeProfile = {
            id: "profile_primary",
            label: "ChatGPT Workspace",
            emailMasked: "wo***@company.com",
            provider: "chatgpt-web",
            status: "connected",
            lastValidatedAt: Date.parse("2026-03-24T10:00:05.000Z"),
            lastError: null,
          };
          profiles = [
            activeProfile,
            {
              id: "profile_backup",
              label: "Backup Workspace",
              emailMasked: "ba***@company.com",
              provider: "chatgpt-web",
              status: "connected",
              lastValidatedAt: Date.parse("2026-03-24T09:00:00.000Z"),
              lastError: null,
            },
          ];
          connectionAttempt = {
            ...connectionAttempt!,
            status: "completed",
            updatedAt: Date.parse("2026-03-24T10:00:05.000Z"),
          };
        }

        return new Response(JSON.stringify({ attempt: connectionAttempt }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/profiles/profile_backup/activate") && init?.method === "POST") {
        activeProfile = profiles.find((profile) => profile.id === "profile_backup") ?? null;
        return new Response(
          JSON.stringify({
            ok: true,
            activeProfile,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/profiles/profile_primary/reconnect") && init?.method === "POST") {
        return new Response(
          JSON.stringify({
            attempt: {
              id: "attempt_reconnect",
              provider: "openai",
              status: "waiting_for_login",
              profileId: "profile_primary",
              error: null,
              createdAt: Date.parse("2026-03-24T10:00:06.000Z"),
              updatedAt: Date.parse("2026-03-24T10:00:06.000Z"),
            },
          }),
          { status: 202, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.includes("/profiles/profile_backup") && init?.method === "DELETE") {
        profiles = profiles.filter((profile) => profile.id !== "profile_backup");
        return new Response(null, { status: 204 });
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

    await user.click(await screen.findByRole("button", { name: /openai ile bağlan/i }));

    expect(await screen.findByText(/tarayıcıda giriş bekleniyor/i)).toBeInTheDocument();

    expect(await screen.findByRole("button", { name: /yeniden bağlan/i }, { timeout: 2_500 })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /bağlantıyı kaldır/i }, { timeout: 2_500 })).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /aktif yap/i }));

    const backupCard = screen
      .getAllByText("Backup Workspace")
      .map((node) => node.closest("article"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);

    expect(backupCard).not.toBeNull();
    expect(within(backupCard!).getByText(/aktif hesap/i)).toBeInTheDocument();
  });
});
