import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppRouter } from "../../../app/router";
import { AppShell } from "../../../app/shell/AppShell";
import { render, renderWithProviders } from "../../../test/test-utils";
import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { ImageMetadataCleanerPage } from "./ImageMetadataCleanerPage";
import { SettingsPage } from "../../settings/routes/SettingsPage";

function TestRouter() {
  return (
    <AppShell>
      <Routes>
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/settings/image-metadata-cleaner" element={<ImageMetadataCleanerPage />} />
      </Routes>
    </AppShell>
  );
}

describe("ImageMetadataCleanerPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("settings kartindan araca gecis yapar", async () => {
    const user = userEvent.setup();

    installMockLocalStorage();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "settings_1",
          refreshIntervalHours: 6,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: null,
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    renderWithProviders(<TestRouter />, { route: "/settings" });

    await user.click(await screen.findByRole("link", { name: /araci ac/i }));

    expect(await screen.findByRole("heading", { name: /gorsel metadata temizleme/i })).toBeInTheDocument();
    expect(screen.getByText(/sunucuya gondermez/i)).toBeInTheDocument();
  });

  it("router image cleaner route'unu dogrudan acar", () => {
    installMockLocalStorage();
    window.history.pushState({}, "", "/settings/image-metadata-cleaner");
    render(<AppRouter />);
    expect(screen.getByRole("heading", { name: /gorsel metadata temizleme/i })).toBeInTheDocument();
    expect(screen.getByText(/tarayici icinde, cihazda calisir/i)).toBeInTheDocument();
    expect(screen.getByText(/dosyalari buraya surukleyin/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /temizlemeyi baslat/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /zip indir/i })).toBeDisabled();
  });
});

