import "@testing-library/jest-dom/vitest";

import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";

import { ProductCostPanel } from "./ProductCostPanel";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ProductCostPanel
        ownerKey="berke"
        productId="prod_1"
        costContext={{
          selectedVariantId: "var_1",
          variants: [
            {
              variantId: "var_1",
              label: "L / Siyah",
              autoProductCost: { amount: 449.9, currency: "TRY" },
              manualProductCost: null,
              autoShippingEstimate: { amount: 7.5, currency: "USD", sourceType: "profile_default" },
              manualShippingCost: null,
            },
            {
              variantId: "var_2",
              label: "M / Siyah",
              autoProductCost: { amount: 429.9, currency: "TRY" },
              manualProductCost: null,
              autoShippingEstimate: { amount: 7.5, currency: "USD", sourceType: "profile_default" },
              manualShippingCost: null,
            },
          ],
          usState: {
            status: "locked",
            label: "hesap kilitli",
            lockedReason: "Sistem ABD profilinden yeterince emin degil.",
            profile: null,
          },
        }}
      />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

it("renders product cost cards, keeps US result locked, and saves overrides for the selected variant", async () => {
  const user = userEvent.setup();
  const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);

    if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
      return jsonResponse({
        id: "default",
        refreshIntervalHours: 5,
        promptPreferences: null,
        connectorHealthcheckEnabled: true,
        aiTargetBaseUrl: null,
        aiTargetManagementKey: null,
        aiTargetLabel: null,
        aiTargetApiKey: null,
        etsyCostCalculator: null,
      });
    }

    if (url.includes("/owners/berke/products/prod_1/variants/var_2/cost-overrides") && init?.method === "PUT") {
      return jsonResponse({ override: { variantId: "var_2" } });
    }

    if (url.includes("/owners/berke/products/prod_1")) {
      return jsonResponse({});
    }

    throw new Error(`Unhandled request: ${url}`);
  });

  renderPanel();

  expect(await screen.findByRole("heading", { name: /urun maliyet gorunumu/i })).toBeInTheDocument();
  expect(screen.getByText(/diger toplam maliyet/i)).toBeInTheDocument();
  expect(screen.getByText(/abd toplam maliyet/i)).toBeInTheDocument();
  expect(screen.getByText(/hesap kilitli/i)).toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText(/secili varyant/i), "var_2");
  await user.clear(screen.getByLabelText(/urun maliyeti override/i));
  await user.type(screen.getByLabelText(/urun maliyeti override/i), "399");

  await waitFor(() =>
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/owners/berke/products/prod_1/variants/var_2/cost-overrides"),
      expect.objectContaining({ method: "PUT" }),
    ),
  );
});
