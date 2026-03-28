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

    await user.click(screen.getByRole("button", { name: /preset/i }));
    expect(screen.getByText(/preset araci/i)).toBeInTheDocument();

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
});
