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

  it("loads selected GTIP context from the linked product", async () => {
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

      if (url.includes("/owners/berke/products/prod_1")) {
        return new Response(
          JSON.stringify({
            product: {
              id: "prod_1",
              ownerKey: "berke",
              trendyolUrl: "https://www.trendyol.com/example",
              sourceProductId: "123",
              title: "Deri bileklik",
              brand: "North Apparel",
              category: "Aksesuar",
              userCategory: null,
              descriptionRaw: "El yapimi urun",
              attributes: [],
              images: [],
              status: "ACTIVE",
              parseStatus: "OK",
              lastCheckedAt: Date.now(),
            },
            currentState: {
              currentPrice: 44990,
              minPrice: 34990,
              maxPrice: 44990,
              inStockVariantCount: 2,
              totalVariantCount: 3,
              lastChangeAt: Date.now(),
              lastCheckedAt: Date.now(),
            },
            variants: [],
            priceHistory: [],
            stockHistory: [],
            changeTimeline: [],
            notifications: [],
            tariffAnalysis: {
              selection: {
                productId: "prod_1",
                ownerKey: "berke",
                catalogId: "catalog_711790",
                canonicalHs6: "711790",
                title: "Imitation jewelry",
                usProfileId: "us_711790_2026r4",
                selectionSource: "recommended",
                selectedBy: "berke",
                selectedAt: Date.now(),
                analysisRunId: "run_1",
                createdAt: Date.now(),
                updatedAt: Date.now(),
                generalDutyRate: 0.11,
                additionalDutyRate: 0,
                combinedDutyRate: 0.11,
                dutySummary: "%11 temel vergi + %0 ek tarife = toplam %11",
                revisionLabel: "USITC HTS 2026 Revision 4",
              },
              latestRun: null,
              recommendations: [],
              manualSearchEnabled: true,
              disclaimer: "Planlama",
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyCostCalculatorPage />, {
      route: "/etsy-cost-calculator?ownerKey=berke&productId=prod_1",
    });

    expect(await screen.findByRole("heading", { name: /abd ithalat vergisi/i })).toBeInTheDocument();
    expect(screen.getByText(/gtip 711790/i)).toBeInTheDocument();
  });
});
