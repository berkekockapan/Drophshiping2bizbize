import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/test-utils";
import { ProductTariffPanel } from "./ProductTariffPanel";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ProductTariffPanel", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("auto-runs analysis and allows selecting a recommendation", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/tariff-analysis/run") && init?.method === "POST") {
        return jsonResponse({
          runId: "run_1",
          usedAi: false,
          recommendations: [
            {
              catalogId: "catalog_711790",
              canonicalHs6: "711790",
              title: "Imitation jewelry",
              rationale: "Eslesen urun sinyali bulundu.",
              score: 120,
              usProfileId: "us_711790_2026r4",
              generalDutyRate: 0.11,
              additionalDutyRate: 0,
              combinedDutyRate: 0.11,
              dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
              sourceBadges: ["Kural eslesmesi"],
            },
          ],
        });
      }

      if (url.includes("/tariff-selection") && init?.method === "PUT") {
        return jsonResponse({
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
            dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
            revisionLabel: "USITC HTS 2026 Revision 4",
          },
        });
      }

      if (url.includes("/owners/berke/products/prod_1")) {
        return jsonResponse({});
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(
      <ProductTariffPanel
        ownerKey="berke"
        productId="prod_1"
        analysis={{
          selection: null,
          latestRun: null,
          recommendations: [],
          manualSearchEnabled: true,
          disclaimer: "Planlama amacli",
        }}
      />,
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tariff-analysis/run"), expect.anything()),
    );

    expect(screen.getByRole("heading", { name: /gtip \/ abd vergi analizi/i })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /bu kodu sec/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tariff-selection"),
        expect.objectContaining({ method: "PUT" }),
      ),
    );
    expect(await screen.findByText(/bu urun icin secilen gtip: 711790/i)).toBeInTheDocument();
  });

  it("shows stale badge and candidate success message", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/tariff-knowledge-candidates") && init?.method === "POST") {
        return jsonResponse({ candidateId: "cand_1", status: "pending" }, 201);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(
      <ProductTariffPanel
        ownerKey="berke"
        productId="prod_1"
        analysis={{
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
            analysisRunId: null,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            generalDutyRate: 0.11,
            additionalDutyRate: 0,
            combinedDutyRate: 0.11,
            dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
            revisionLabel: "USITC HTS 2025 Revision 10",
          },
          latestRun: {
            id: "run_1",
            productId: "prod_1",
            ownerKey: "berke",
            status: "completed",
            usedAi: false,
            inputSnapshot: {},
            resultSnapshot: {
              recommendations: [
                {
                  catalogId: "catalog_711790",
                  canonicalHs6: "711790",
                  title: "Imitation jewelry",
                  rationale: "Eslesen urun sinyali bulundu.",
                  score: 120,
                  usProfileId: "us_711790_2026r4",
                  generalDutyRate: 0.11,
                  additionalDutyRate: 0,
                  combinedDutyRate: 0.11,
                  dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
                  sourceBadges: ["Kural eslesmesi"],
                },
              ],
            },
            engineVersion: "tariff-v1",
            createdAt: Date.parse("2026-03-01T00:00:00.000Z"),
            completedAt: Date.parse("2026-03-01T00:00:00.000Z"),
          },
          recommendations: [
            {
              catalogId: "catalog_711790",
              canonicalHs6: "711790",
              title: "Imitation jewelry",
              rationale: "Eslesen urun sinyali bulundu.",
              score: 120,
              usProfileId: "us_711790_2026r4",
              generalDutyRate: 0.11,
              additionalDutyRate: 0,
              combinedDutyRate: 0.11,
              dutySummary: "%11.0 temel vergi + %0.0 ek tarife = toplam %11.0",
              sourceBadges: ["Kural eslesmesi"],
            },
          ],
          manualSearchEnabled: true,
          disclaimer: "Planlama",
        }}
      />,
    );

    expect(screen.getByText(/veri surumu guncel olmayabilir/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ortak bilgiye aday yap/i }));
    expect(await screen.findByText(/aday kuyruguna eklendi/i)).toBeInTheDocument();
  });
});
