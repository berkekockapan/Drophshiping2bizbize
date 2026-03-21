import "@testing-library/jest-dom/vitest";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NotificationsPage } from "../../notifications/routes/NotificationsPage";
import { renderWithProviders } from "../../../test/test-utils";
import { ProductDetailPage } from "./ProductDetailPage";

const productDetailPayload = {
  product: {
    id: "prod_1",
    trendyolUrl: "https://www.trendyol.com/example",
    sourceProductId: "123",
    title: "Oversize Hoodie",
    brand: "North Apparel",
    category: "Sweatshirt",
    descriptionRaw: "Yumuşak dokulu oversize hoodie.",
    attributes: [{ key: "Renk", value: "Siyah" }],
    images: ["https://cdn.example.com/hoodie-1.jpg", "https://cdn.example.com/hoodie-2.jpg"],
    status: "ACTIVE",
    parseStatus: "OK",
    lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
  },
  currentState: {
    currentPrice: 44990,
    minPrice: 34990,
    maxPrice: 44990,
    inStockVariantCount: 2,
    totalVariantCount: 3,
    lastChangeAt: Date.parse("2026-03-20T09:30:00.000Z"),
    lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
  },
  variants: [
    {
      id: "var_1",
      variantKey: "L-Siyah",
      option1: "L",
      option2: "Siyah",
      option3: null,
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: Date.parse("2026-03-20T10:00:00.000Z"),
      rawPayload: { stockState: "IN_STOCK" },
    },
  ],
  priceHistory: [
    {
      id: "price_1",
      productId: "prod_1",
      variantId: null,
      previousPrice: 42990,
      newPrice: 44990,
      changedAt: Date.parse("2026-03-20T09:30:00.000Z"),
      changeReason: "PRODUCT_PRICE_CHANGED",
    },
  ],
  stockHistory: [
    {
      id: "stock_1",
      productId: "prod_1",
      variantId: "var_1",
      previousStockState: "OUT_OF_STOCK",
      newStockState: "IN_STOCK",
      changedAt: Date.parse("2026-03-20T09:30:00.000Z"),
    },
  ],
  notifications: [],
};

const notificationsPayload = {
  items: [
    {
      id: "notification_1",
      productId: "prod_1",
      type: "PARSE_ERROR",
      severity: "warning",
      title: "Parse hatası",
      body: "Ürün sayfasında beklenen alanlar bulunamadı.",
      readAt: null,
      createdAt: Date.parse("2026-03-20T10:00:00.000Z"),
    },
  ],
};

describe("ProductDetailPage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows variant rows and price history on the product detail screen", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/products/prod_1")) {
        return new Response(JSON.stringify(productDetailPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/products/prod_1",
      path: "/products/:productId",
    });

    expect(await screen.findByText(/varyasyon matrisi/i)).toBeInTheDocument();
    expect(await screen.findByText(/en düşük/i)).toBeInTheDocument();
    expect(await screen.findByText(/fiyat geçmişi/i)).toBeInTheDocument();
    expect(await screen.findByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );
  });

  it("renders unread notifications grouped by severity", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.includes("/notifications")) {
        return new Response(JSON.stringify(notificationsPayload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<NotificationsPage />, { route: "/notifications" });

    expect(await screen.findByText(/parse hatası/i)).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: /uyarılar/i })).toBeInTheDocument();
  });
});
