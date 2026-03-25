import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AIConnectionsPage } from "./AIConnectionsPage";
import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { renderWithProviders } from "../../../test/test-utils";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mockConnectorFetches({
  health,
  healthError,
}: {
  health?: Record<string, unknown>;
  healthError?: Error;
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

    if (url === "http://127.0.0.1:4317/health") {
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

    if (url === "http://127.0.0.1:4317/connections/openai/start" && init?.method === "POST") {
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
        },
        202,
      );
    }

    if (url === "http://127.0.0.1:4317/profiles/profile_main/reconnect" && init?.method === "POST") {
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

    if (url === "http://127.0.0.1:4317/profiles/profile_main" && init?.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    if (url === "http://127.0.0.1:4317/connections/openai/attempts/attempt_1") {
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

    expect(await screen.findByText("OpenAI ba\u011flant\u0131s\u0131 haz\u0131r")).toBeInTheDocument();
    expect(screen.getAllByText(/wo\*\*\*@company.com/i)).not.toHaveLength(0);
    expect(screen.queryByLabelText("Ba\u011flant\u0131 Servisi URL")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ba\u011flant\u0131y\u0131 Kald\u0131r" })).toBeInTheDocument();
  });

  it("keeps advanced settings collapsed until the user opens them", async () => {
    const user = userEvent.setup();

    mockConnectorFetches({
      healthError: new Error("connect ECONNREFUSED 127.0.0.1:4317"),
    });

    renderWithProviders(<AIConnectionsPage />);

    expect(await screen.findByText("Yerel ba\u011flant\u0131 servisi haz\u0131r de\u011fil")).toBeInTheDocument();
    expect(screen.queryByLabelText("Ba\u011flant\u0131 Servisi URL")).not.toBeInTheDocument();

    await user.click(screen.getByText("Geli\u015fmi\u015f Ayarlar"));
    expect(screen.getByLabelText("Ba\u011flant\u0131 Servisi URL")).toBeInTheDocument();
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

    expect(await screen.findByText("OpenAI ba\u011flant\u0131s\u0131 gerekli")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OpenAI ile Ba\u011flan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ba\u011flant\u0131y\u0131 Kald\u0131r" })).not.toBeInTheDocument();
  });
});
