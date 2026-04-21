import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { renderWithProviders } from "../../../test/test-utils";
import { AIConnectionsPage } from "./AIConnectionsPage";

function normalizeTurkishText(value: string) {
  return value.normalize("NFKD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function textMatcher(expected: string) {
  return (_content: string, element: Element | null) =>
    normalizeTurkishText(element?.textContent ?? "") === normalizeTurkishText(expected);
}

function nameMatcher(expected: string) {
  return (accessibleName: string) => normalizeTurkishText(accessibleName) === normalizeTurkishText(expected);
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockConnectorFetches({
  health,
  healthError,
  connectorHealth,
  authorizationUrl = "https://auth.openai.test/oauth",
  connectorStartAttemptId = "attempt_local",
}: {
  health?: Record<string, unknown>;
  healthError?: Error;
  connectorHealth?: Record<string, unknown>;
  authorizationUrl?: string;
  connectorStartAttemptId?: string;
}) {
  const settings = {
    id: "default",
    refreshIntervalHours: 5,
    promptPreferences: null,
    connectorHealthcheckEnabled: true,
    aiTargetBaseUrl: null,
    aiTargetManagementKey: null,
    aiTargetLabel: null,
    aiTargetApiKey: null,
  };

  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
      return jsonResponse(settings);
    }

    if (url.endsWith("/settings") && init?.method === "PATCH") {
      const payload = JSON.parse(String(init.body)) as Partial<typeof settings>;
      return jsonResponse({
        ...settings,
        ...payload,
      });
    }

    if (url.endsWith("/ai-profiles/health")) {
      if (healthError) {
        throw healthError;
      }

      return jsonResponse(
        health ?? {
          status: "online",
          provider: "chatgpt-web",
          activeProfile: null,
          connectionAttempt: null,
        },
      );
    }

    if (url === "http://127.0.0.1:4318/health") {
      return jsonResponse(
        connectorHealth ?? {
          status: "online",
          provider: "chatgpt-web",
          activeProfile: null,
          connectionAttempt: null,
        },
      );
    }

    if (url.endsWith("/ai-profiles/openai/start") && init?.method === "POST") {
      return jsonResponse(
        {
          attempt: {
            id: "attempt_1",
            provider: "openai",
            status: "waiting_for_login",
            profileId: null,
            error: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          authorizationUrl,
        },
        202,
      );
    }

    if (url === "http://127.0.0.1:4318/connections/openai/start" && init?.method === "POST") {
      return jsonResponse(
        {
          attempt: {
            id: connectorStartAttemptId,
            provider: "openai",
            status: "waiting_for_login",
            profileId: null,
            error: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        202,
      );
    }

    if (url.endsWith("/ai-profiles/openai/attempts/attempt_1")) {
      return jsonResponse({
        attempt: {
          id: "attempt_1",
          provider: "openai",
          status: "waiting_for_login",
          profileId: null,
          error: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });
    }

    if (url === `http://127.0.0.1:4318/connections/openai/attempts/${connectorStartAttemptId}`) {
      return jsonResponse({
        attempt: {
          id: connectorStartAttemptId,
          provider: "openai",
          status: "waiting_for_login",
          profileId: null,
          error: null,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      });
    }

    if (url.endsWith("/ai-profiles/profile_main/reconnect") && init?.method === "POST") {
      return jsonResponse(
        {
          attempt: {
            id: "attempt_reconnect",
            provider: "openai",
            status: "waiting_for_login",
            profileId: "profile_main",
            error: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        },
        202,
      );
    }

    if (url.endsWith("/ai-profiles/profile_main") && init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    throw new Error(`Unhandled request: ${url}`);
  });
}

describe("AIConnectionsPage", () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows the connected desktop state without exposing technical fields by default", async () => {
    mockConnectorFetches({
      health: {
        status: "online",
        provider: "chatgpt-web",
        activeProfile: {
          id: "profile_main",
          label: "OpenAI Workspace",
          emailMasked: "wo***@company.com",
          provider: "chatgpt-web",
          status: "connected",
          lastValidatedAt: Date.now(),
          lastError: null,
        },
        connectionAttempt: null,
      },
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(screen.getByText("Cloudflare deploy notu")).toBeInTheDocument();
    expect(await screen.findByText(textMatcher("OpenAI bağlantısı hazır"))).toBeInTheDocument();
    expect(screen.getAllByText(/wo\*\*\*@company.com/i)).not.toHaveLength(0);
    expect(screen.queryByLabelText("Bağlantı Servisi URL")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: nameMatcher("Bağlantıyı Kaldır") })).toBeInTheDocument();
  });

  it("keeps advanced settings collapsed until the user opens them", async () => {
    const user = userEvent.setup();

    mockConnectorFetches({
      healthError: new Error("connect ECONNREFUSED 127.0.0.1:4318"),
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(
      await screen.findByText(
        "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText("Bağlantı Servisi URL")).not.toBeInTheDocument();

    await user.click(screen.getByText("Gelişmiş Ayarlar", { selector: "summary" }));
    expect(screen.getByLabelText("Bağlantı Servisi URL")).toBeInTheDocument();
  });

  it("shows the disconnected desktop state with a single connect action", async () => {
    mockConnectorFetches({
      health: {
        status: "online",
        provider: "chatgpt-web",
        activeProfile: null,
        connectionAttempt: null,
      },
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText(textMatcher("OpenAI bağlantısı gerekli"))).toBeInTheDocument();
    expect(screen.getByRole("button", { name: nameMatcher("OpenAI ile giriş yap") })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: nameMatcher("Bağlantıyı Kaldır") })).not.toBeInTheDocument();
  });

  it("opens the authorization URL in a synchronously opened popup", async () => {
    const user = userEvent.setup();
    const popupLocationReplace = vi.fn();
    const popupFocus = vi.fn();

    const openSpy = vi.spyOn(window, "open").mockReturnValue({
      closed: false,
      focus: popupFocus,
      close: vi.fn(),
      document: {
        title: "",
        body: {
          innerHTML: "",
        },
      },
      location: {
        replace: popupLocationReplace,
      },
      opener: window,
    } as unknown as WindowProxy);

    mockConnectorFetches({
      health: {
        status: "online",
        provider: "chatgpt-web",
        activeProfile: null,
        connectionAttempt: null,
      },
      authorizationUrl: "https://auth.openai.test/oauth?attempt=attempt_1",
    });

    renderWithProviders(<AIConnectionsPage />);

    await user.click(await screen.findByRole("button", { name: nameMatcher("OpenAI ile giriş yap") }));

    await waitFor(() => {
      expect(openSpy).toHaveBeenCalledWith("", "_blank", "noopener");
      expect(popupLocationReplace).toHaveBeenCalledWith("https://auth.openai.test/oauth?attempt=attempt_1");
      expect(popupFocus).toHaveBeenCalled();
    });

    expect(await screen.findByText(textMatcher("OpenAI bağlantısı kuruluyor"))).toBeInTheDocument();
  });

  it("shows a product error when the browser blocks the popup", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "open").mockReturnValue(null);

    mockConnectorFetches({
      health: {
        status: "online",
        provider: "chatgpt-web",
        activeProfile: null,
        connectionAttempt: null,
      },
    });

    renderWithProviders(<AIConnectionsPage />);

    await user.click(await screen.findByRole("button", { name: nameMatcher("OpenAI ile giriş yap") }));

    expect(
      await screen.findByText(textMatcher("Giriş sekmesi açılamadı. Tarayıcı izinlerini kontrol edip tekrar deneyin.")),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: nameMatcher("Tekrar Dene") })).toBeInTheDocument();
  });

  it("falls back to the local connector flow when cloud oauth config is invalid", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockReturnValue({} as WindowProxy);

    mockConnectorFetches({
      health: {
        status: "online",
        provider: "openai-oauth",
        activeProfile: null,
        connectionAttempt: {
          id: "attempt_cloud_failed",
          provider: "openai",
          status: "failed",
          profileId: null,
          error: "OPENAI_OAUTH_CLIENT_ID örnek placeholder görünüyor.",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
      connectorHealth: {
        status: "online",
        provider: "chatgpt-web",
        activeProfile: null,
        connectionAttempt: null,
      },
    });

    renderWithProviders(<AIConnectionsPage />);

    await user.click(await screen.findByRole("button", { name: nameMatcher("OpenAI ile giriş yap") }));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "http://127.0.0.1:4318/connections/openai/start",
        expect.objectContaining({ method: "POST" }),
      );
    });
    expect(openSpy).not.toHaveBeenCalled();
    expect(await screen.findByText(textMatcher("OpenAI bağlantısı kuruluyor"))).toBeInTheDocument();
  });
});
