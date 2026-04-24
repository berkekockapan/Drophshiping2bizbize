import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { EtsyCostCalculatorPage } from "./EtsyCostCalculatorPage";

describe("EtsyCostCalculatorPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads settings and autosaves calculator edits", async () => {
    const user = userEvent.setup();

    let settings = {
      id: "default",
      refreshIntervalHours: 5,
      promptPreferences: null,
      connectorHealthcheckEnabled: true,
      aiTargetBaseUrl: null,
      aiTargetManagementKey: null,
      aiTargetLabel: null,
      aiTargetApiKey: null,
      etsyCostCalculator: null,
    };

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      if (!init?.method || init.method === "GET") {
        return new Response(JSON.stringify(settings), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      const payload = JSON.parse(String(init.body));
      settings = { ...settings, ...payload };
      return new Response(JSON.stringify(settings), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    renderWithProviders(<EtsyCostCalculatorPage />, { route: "/etsy-cost-calculator" });

    expect(await screen.findByRole("tab", { name: /hedef kar icin satis fiyati bul/i })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: /hazir ayarlar/i }));
    expect(screen.getByText(/hazir ayar araci/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /gelismis ayarlar/i }));
    expect(screen.getByRole("dialog", { name: /gelismis ayarlar/i })).toBeInTheDocument();

    await user.clear(await screen.findByLabelText(/opsiyonel satis fiyati/i));
    await user.type(screen.getByLabelText(/opsiyonel satis fiyati/i), "50");

    await waitFor(
      () =>
        expect(fetchMock).toHaveBeenCalledWith(
          expect.stringContaining("/settings"),
          expect.objectContaining({ method: "PATCH" }),
        ),
      { timeout: 2_000 },
    );
  });

  it("renders the import-duty preview when the US profile is active", async () => {
    const user = userEvent.setup();
    const settings = {
      id: "default",
      refreshIntervalHours: 5,
      promptPreferences: null,
      connectorHealthcheckEnabled: true,
      aiTargetBaseUrl: null,
      aiTargetManagementKey: null,
      aiTargetLabel: null,
      aiTargetApiKey: null,
      etsyCostCalculator: null,
    };

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return new Response(JSON.stringify(settings), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyCostCalculatorPage />, {
      route: "/etsy-cost-calculator?ownerKey=berke&productId=prod_1",
    });

    expect(await screen.findByRole("button", { name: /abd hedef profili/i })).toBeInTheDocument();
    expect(screen.getByText(/^Onerilen liste fiyati$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Indirim sonrasi satis fiyati$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Toplam tahsilat: /i)).toBeInTheDocument();
    expect(screen.getByText(/toplam gider ozeti/i)).toBeInTheDocument();
    expect(screen.getByLabelText("İndirim %")).toBeInTheDocument();
    expect(screen.getByLabelText("Alıcıdan alınan kargo (USD)")).toBeInTheDocument();
    expect(screen.getByLabelText("Ekstra tahsilat (USD)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /abd hedef profili/i }));

    expect(screen.getByRole("spinbutton", { name: /manuel ithalat vergisi orani \(%\)/i })).toBeInTheDocument();
    expect(screen.getByText(/^ABD ithalat vergisi onizlemesi$/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^Tahmini ithalat vergisi: \$0\.00$/i).length).toBeGreaterThan(0);
  });
});
