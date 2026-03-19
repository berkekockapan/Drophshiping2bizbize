import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TrackingCenterPage } from "./TrackingCenterPage";
import { renderWithProviders } from "../../../test/test-utils";

const trackingPayload = {
  summary: {
    trackedCount: 186,
    activeCount: 183,
    reviewNeededCount: 3,
  },
  items: [
    {
      id: "prod_1",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      status: "ACTIVE",
      parseStatus: "OK",
      currentPrice: 42990,
      minPrice: 34990,
      maxPrice: 44990,
      inStockVariantCount: 12,
      totalVariantCount: 18,
    },
  ],
  filters: {},
};

describe("TrackingCenterPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders summary cards and product cards from the API response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(trackingPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    renderWithProviders(<TrackingCenterPage />);

    expect(await screen.findByText(/takipte/i)).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
  });
});
