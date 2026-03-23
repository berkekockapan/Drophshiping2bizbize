import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen, waitFor } from "@testing-library/react";
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
      trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
      status: "ACTIVE",
      parseStatus: "OK",
      thumbnailImage: "https://cdn.example.com/hoodie-1.jpg",
      currentPrice: 42990,
      minPrice: 34990,
      maxPrice: 44990,
      inStockVariantCount: 12,
      totalVariantCount: 18,
      isFavorite: false,
    },
    {
      id: "prod_2",
      title: "Favorite Hoodie",
      brand: "North Apparel",
      trendyolUrl: "https://www.trendyol.com/north-apparel/favorite-hoodie-p-456",
      status: "ACTIVE",
      parseStatus: "OK",
      thumbnailImage: "https://cdn.example.com/hoodie-2.jpg",
      currentPrice: 45990,
      minPrice: 35990,
      maxPrice: 46990,
      inStockVariantCount: 8,
      totalVariantCount: 9,
      isFavorite: true,
    },
  ],
  filters: {},
};

describe("TrackingCenterPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders summary cards and product cards from the API response", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/tracking/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify(trackingPayload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    renderWithProviders(<TrackingCenterPage />);

    expect(await screen.findByText(/takipte/i)).toBeInTheDocument();
    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument();
  });

  it("switches to the favorites tab and wires favorite/delete mutations", async () => {
    const user = userEvent.setup();
    const items = structuredClone(trackingPayload.items);
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/tracking/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products/prod_1/favorite") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}")) as { isFavorite?: boolean };
        items[0].isFavorite = Boolean(body.isFavorite);

        return new Response(JSON.stringify({ productId: "prod_1", isFavorite: items[0].isFavorite }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products/prod_1") && method === "DELETE") {
        items.splice(
          items.findIndex((item) => item.id === "prod_1"),
          1,
        );

        return new Response(null, { status: 204 });
      }

      if (url.includes("favorite=true")) {
        return new Response(
          JSON.stringify({
            summary: trackingPayload.summary,
            items: items.filter((item) => item.isFavorite),
            filters: { favorite: true },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          summary: trackingPayload.summary,
          items,
          filters: {},
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    });

    renderWithProviders(<TrackingCenterPage />);

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /favoriye ekle|favoriden çıkar/i })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tracking/products/prod_1/favorite"),
        expect.objectContaining({ method: "POST" }),
      ),
    );

    await user.click(screen.getAllByRole("button", { name: /^sil$/i })[0]);
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/tracking/products/prod_1"),
        expect.objectContaining({ method: "DELETE" }),
      ),
    );
    expect(confirmSpy).toHaveBeenCalled();

    await user.click(await screen.findByRole("button", { name: /favoriler/i }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tracking/products?favorite=true"), expect.anything()),
    );
    expect(await screen.findByText(/favorite hoodie/i)).toBeInTheDocument();
    expect(screen.queryByText(/oversize hoodie/i)).not.toBeInTheDocument();
  });

  it("keeps the refresh progress visible until refreshed product data is fetched back into the page", async () => {
    const user = userEvent.setup();
    const refreshedPayload = {
      ...trackingPayload,
      items: [
        {
          ...trackingPayload.items[0],
          title: "Oversize Hoodie Refresh",
          thumbnailImage: "https://cdn.example.com/hoodie-refresh.jpg",
          currentPrice: 51990,
          minPrice: 34990,
          maxPrice: 51990,
        },
        trackingPayload.items[1],
      ],
    };
    const runningRun = {
      id: "run_1",
      status: "RUNNING",
      totalCount: 2,
      pendingCount: 1,
      runningCount: 1,
      successCount: 0,
      failedCount: 0,
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
      successCount: 2,
      failedCount: 0,
      finishedAt: 1760000015000,
    };

    let trackingRequestCount = 0;
    let resolveRefreshedTracking: ((response: Response) => void) | undefined;
    const refreshedTrackingPromise = new Promise<Response>((resolve) => {
      resolveRefreshedTracking = resolve;
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      if (url.includes("/tracking/products/refresh-runs/active")) {
        return new Response(JSON.stringify({ run: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products/refresh-runs") && method === "POST" && !url.includes("retry-failed")) {
        return new Response(JSON.stringify({ run: runningRun }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products/refresh-runs/run_1") && method === "GET") {
        return new Response(JSON.stringify({ run: completedRun }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (url.includes("/tracking/products") && method === "GET") {
        trackingRequestCount += 1;

        if (trackingRequestCount === 1) {
          return new Response(JSON.stringify(trackingPayload), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return refreshedTrackingPromise;
      }

      throw new Error(`Unhandled request: ${method} ${url}`);
    });

    renderWithProviders(<TrackingCenterPage />);

    expect(await screen.findByText(/oversize hoodie/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /tüm ürünleri yenile/i }));

    expect(await screen.findByText(/ürün verileri yenileniyor|güncel veriler ekrana alınıyor/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/tracking/products/refresh-runs/run_1"), expect.anything()),
    );

    expect(screen.getByText(/güncel veriler ekrana alınıyor/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /tüm ürünleri yenile/i })).not.toBeInTheDocument();

    if (resolveRefreshedTracking) {
      resolveRefreshedTracking(
        new Response(JSON.stringify(refreshedPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }

    expect(await screen.findByText(/oversize hoodie refresh/i)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /tüm ürünleri yenile/i })).toBeInTheDocument(),
    );
    expect(screen.queryByText(/güncel veriler ekrana alınıyor/i)).not.toBeInTheDocument();
  });
});
