import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { renderWithProviders } from "../../../test/test-utils";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AIConnectionsPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads target settings, starts OAuth polling, and supports auth-file actions", async () => {
    const user = userEvent.setup();
    const windowOpenSpy = vi.spyOn(window, "open").mockReturnValue(null);

    let settings = {
      id: "default",
      refreshIntervalHours: 5,
      promptPreferences: null,
      connectorHealthcheckEnabled: true,
      aiTargetBaseUrl: "https://clip.example.com",
      aiTargetManagementKey: "mgmt_live_123",
      aiTargetLabel: "Windows",
      aiTargetApiKey: "api_live_123",
    };

    let authFiles = [
      { name: "primary.json", label: "Primary Workspace", disabled: false },
      { name: "backup.json", label: "Backup Workspace", disabled: true },
    ];

    let authStatusPollCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse(settings);
      }

      if (url.endsWith("/settings") && init?.method === "PATCH") {
        settings = {
          ...settings,
          ...(JSON.parse(String(init.body)) as Partial<typeof settings>),
        };

        return jsonResponse(settings);
      }

      if (url === "https://clip.example.com/v0/management/auth-files") {
        return jsonResponse({ items: authFiles });
      }

      if (url === "https://clip.example.com/v0/management/codex-auth-url?is_webui=1") {
        authFiles = [];

        return jsonResponse({
          authorizationUrl: "https://auth.openai.com/oauth/authorize?client_id=test",
          state: "oauth_state_1",
        });
      }

      if (url === "https://clip.example.com/v0/management/get-auth-status?state=oauth_state_1") {
        authStatusPollCount += 1;

        if (authStatusPollCount >= 2) {
          authFiles = [
            { name: "primary.json", label: "Primary Workspace", disabled: false },
            { name: "backup.json", label: "Backup Workspace", disabled: true },
          ];

          return jsonResponse({
            status: "ok",
            authFile: authFiles[0],
          });
        }

        return jsonResponse({ status: "wait" });
      }

      if (url === "https://clip.example.com/v0/management/auth-files/status" && init?.method === "PATCH") {
        const payload = JSON.parse(String(init.body)) as { name: string; disabled: boolean };
        authFiles = authFiles.map((item) => (item.name === payload.name ? { ...item, disabled: payload.disabled } : item));
        return jsonResponse({ ok: true });
      }

      if (url === "https://clip.example.com/v0/management/auth-files?name=backup.json" && init?.method === "DELETE") {
        authFiles = authFiles.filter((item) => item.name !== "backup.json");
        return new Response(null, { status: 204 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByDisplayValue("https://clip.example.com")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("Windows")).toBeInTheDocument();
    expect(await screen.findByText(/primary workspace aktif hesap olarak hazır/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /openai ile bağlan/i }));

    expect(windowOpenSpy).toHaveBeenCalledWith(
      "https://auth.openai.com/oauth/authorize?client_id=test",
      "_blank",
      "noopener,noreferrer",
    );
    expect(await screen.findByText(/windows oturumunda giriş tamamlayın/i)).toBeInTheDocument();
    expect(await screen.findByText(/tarayıcıda giriş bekleniyor/i)).toBeInTheDocument();
    expect(await screen.findByText(/primary workspace aktif hesap olarak hazır/i, {}, { timeout: 2_500 })).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /aktif yap/i }));

    expect(await screen.findByText(/backup workspace aktif hesap olarak hazır/i)).toBeInTheDocument();

    const backupCard = screen
      .getAllByText("Backup Workspace")
      .map((node) => node.closest("article"))
      .find((node): node is HTMLElement => node instanceof HTMLElement);

    expect(backupCard).not.toBeNull();
    expect(within(backupCard!).getByText(/aktif hesap/i)).toBeInTheDocument();

    await user.click(within(backupCard!).getByRole("button", { name: /bağlantıyı kaldır/i }));

    expect(screen.queryByText(/backup workspace/i)).not.toBeInTheDocument();
  });

  it("shows empty state when no codex account is connected yet", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetLabel: "Windows",
          aiTargetApiKey: "api_live_123",
        });
      }

      if (url === "https://clip.example.com/v0/management/auth-files") {
        return jsonResponse({ items: [] });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(/henüz bağlı codex hesabı yok/i)).toBeInTheDocument();
    expect(await screen.findByText(/henüz bağlı hesap yok/i)).toBeInTheDocument();
  });
});
