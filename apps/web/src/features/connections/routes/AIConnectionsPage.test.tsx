import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("AIConnectionsPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts OAuth connection, polls completion, and supports account actions", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

    let activeProfile: {
      id: string;
      label: string;
      emailMasked: string | null;
      provider: string;
      status: "connected" | "needs_reauth" | "disconnected" | "error";
      lastValidatedAt: number | null;
      lastError: string | null;
      isActive?: boolean;
    } | null = null;

    let connectionAttempt: {
      id: string;
      provider: "openai";
      status:
        | "pending_browser_launch"
        | "waiting_for_login"
        | "verifying_session"
        | "completed"
        | "failed"
        | "cancelled";
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
      status: "connected" | "needs_reauth" | "disconnected" | "error";
      lastValidatedAt: number | null;
      lastError: string | null;
      isActive?: boolean;
    }> = [];

    let attemptPollCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/ai-profiles/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
            provider: "openai-oauth",
            activeProfile,
            connectionAttempt,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles") && (!init?.method || init?.method === "GET")) {
        return new Response(
          JSON.stringify({
            items: profiles,
            activeProfile,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles/openai/start") && init?.method === "POST") {
        connectionAttempt = {
          id: "attempt_1",
          provider: "openai",
          status: "waiting_for_login",
          profileId: "profile_primary",
          error: null,
          createdAt: Date.parse("2026-03-24T10:00:00.000Z"),
          updatedAt: Date.parse("2026-03-24T10:00:00.000Z"),
        };

        return new Response(
          JSON.stringify({
            attempt: connectionAttempt,
            authorizationUrl: "https://auth.openai.com/oauth/authorize?client_id=test",
          }),
          { status: 202, headers: { "Content-Type": "application/json" } },
        );
      }

      if (
        url.includes("/ai-profiles/openai/attempts/attempt_1") &&
        (!init?.method || init?.method === "GET")
      ) {
        attemptPollCount += 1;

        if (attemptPollCount >= 2) {
          activeProfile = {
            id: "profile_primary",
            label: "OpenAI Workspace",
            emailMasked: "wo***@company.com",
            provider: "openai-oauth",
            status: "connected",
            lastValidatedAt: Date.parse("2026-03-24T10:00:05.000Z"),
            lastError: null,
            isActive: true,
          };
          profiles = [
            activeProfile,
            {
              id: "profile_backup",
              label: "Backup Workspace",
              emailMasked: "ba***@company.com",
              provider: "openai-oauth",
              status: "connected",
              lastValidatedAt: Date.parse("2026-03-24T09:00:00.000Z"),
              lastError: null,
              isActive: false,
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

      if (url.endsWith("/ai-profiles/profile_backup/activate") && init?.method === "POST") {
        activeProfile = profiles.find((profile) => profile.id === "profile_backup") ?? null;
        profiles = profiles.map((profile) => ({
          ...profile,
          isActive: profile.id === "profile_backup",
        }));
        return new Response(
          JSON.stringify({
            ok: true,
            activeProfile,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles/profile_primary/reconnect") && init?.method === "POST") {
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
            authorizationUrl: "https://auth.openai.com/oauth/authorize?client_id=test",
          }),
          { status: 202, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles/profile_primary") && init?.method === "DELETE") {
        profiles = profiles.filter((profile) => profile.id !== "profile_primary");
        activeProfile = profiles[0] ?? null;
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(/provider: openai-oauth/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /openai ile bağlan/i }));

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://auth.openai.com/oauth/authorize?client_id=test",
      "_blank",
      "noopener,noreferrer",
    );
    expect(await screen.findByText(/tarayıcıda giriş bekleniyor/i)).toBeInTheDocument();
    expect(await screen.findByText(/openai workspace bağlı/i, {}, { timeout: 2_500 })).toBeInTheDocument();
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

  it("shows empty state when no profile is connected yet", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/ai-profiles/health")) {
        return new Response(
          JSON.stringify({
            status: "online",
            provider: "openai-oauth",
            activeProfile: null,
            connectionAttempt: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (url.endsWith("/ai-profiles")) {
        return new Response(
          JSON.stringify({
            items: [],
            activeProfile: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(/henüz bağlı bir openai hesabı yok/i)).toBeInTheDocument();
    expect(await screen.findByText(/henüz bağlı hesap yok/i)).toBeInTheDocument();
  });
});
