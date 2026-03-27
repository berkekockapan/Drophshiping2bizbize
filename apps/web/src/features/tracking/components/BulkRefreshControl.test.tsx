import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { BulkRefreshControl } from "./BulkRefreshControl";
import { renderWithProviders } from "../../../test/test-utils";

const runningRun = {
  id: "run_1",
  ownerKey: "berke",
  status: "RUNNING",
  totalCount: 40,
  pendingCount: 24,
  runningCount: 4,
  successCount: 9,
  failedCount: 3,
  startedAt: 1760000000000,
  finishedAt: null,
  scope: "ALL",
  sourceRunId: null,
};

const completedRun = {
  ...runningRun,
  status: "COMPLETED",
  pendingCount: 0,
  runningCount: 0,
  successCount: 37,
  failedCount: 3,
  finishedAt: 1760000015000,
};

describe("BulkRefreshControl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows live progress, completion summary, and retry-failed action", async () => {
    const user = userEvent.setup();
    let statusRequestCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/owners/berke/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/refresh-runs") && method === "POST" && !url.includes("retry-failed")) {
        return new Response(JSON.stringify({ run: runningRun }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/owners/berke/products/refresh-runs/run_1") && method === "GET") {
        statusRequestCount += 1;

        return new Response(JSON.stringify({ run: statusRequestCount === 1 ? runningRun : completedRun }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    renderWithProviders(<BulkRefreshControl ownerKey="berke" />);

    await user.click(screen.getByRole("button", { name: /tüm ürünleri yenile/i }));

    expect(await screen.findByText(/ürün verileri yenileniyor/i)).toBeInTheDocument();
    expect(await screen.findByText(/12 \/ 40/i)).toBeInTheDocument();
    expect(await screen.findByText(/37 ürün güncellendi, 3 ürün hata verdi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hatalıları tekrar dene/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument();
  });
});
