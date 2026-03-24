import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
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
      trendyolUrl: "https://www.trendyol.com/example/l-siyah",
      currentStockState: "IN_STOCK",
      currentPrice: 44990,
      lastSeenAt: Date.parse("2026-03-20T10:00:00.000Z"),
      rawPayload: { stockState: "IN_STOCK", url: "https://www.trendyol.com/example/l-siyah" },
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
      refreshAuditId: "audit_1",
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
      refreshAuditId: "audit_1",
    },
  ],
  changeTimeline: [
    {
      id: "audit_2",
      type: "REFRESH_NO_CHANGE",
      changedAt: Date.parse("2026-03-20T10:00:00.000Z"),
      summary: "Yenileme yapildi, degisiklik bulunamadi",
      details: null,
      before: null,
      after: null,
      variantKey: null,
      refreshSource: "MANUAL",
    },
    {
      id: "price_1",
      type: "PRODUCT_PRICE_CHANGED",
      changedAt: Date.parse("2026-03-20T09:30:00.000Z"),
      summary: "Urun fiyati degisti",
      details: null,
      before: "429.90 TL",
      after: "449.90 TL",
      variantKey: null,
      refreshSource: "MANUAL",
    },
    {
      id: "stock_1",
      type: "VARIANT_STOCK_CHANGED",
      changedAt: Date.parse("2026-03-20T09:30:00.000Z"),
      summary: "L / Siyah varyanti yeniden stokta",
      details: null,
      before: "Stokta degil",
      after: "Stokta",
      variantKey: "L / Siyah",
      refreshSource: "MANUAL",
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

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function ndjsonResponse(events: unknown[]) {
  return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

describe("ProductDetailPage", () => {
  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("shows variant rows and the unified change timeline on the product detail screen", async () => {
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
    expect(await screen.findByText(/degisiklik gecmisi/i)).toBeInTheDocument();
    expect(screen.queryByText(/fiyat geçmişi/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/stok geçmişi/i)).not.toBeInTheDocument();
    expect(await screen.findByText(/yenileme yapildi, degisiklik bulunamadi/i)).toBeInTheDocument();
    expect(await screen.findByRole("link", { name: /trendyol ürün sayfasını yeni sekmede aç: oversize hoodie/i })).toHaveAttribute(
      "href",
      "https://www.trendyol.com/example",
    );
    expect(await screen.findByRole("link", { name: /trendyol ürün sayfasını yeni sekmede aç: oversize hoodie/i })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(await screen.findByRole("link", { name: /trendyol varyasyon sayfasını yeni sekmede aç: l \/ siyah/i })).toHaveAttribute(
      "href",
      "https://www.trendyol.com/example/l-siyah",
    );
    expect(await screen.findByRole("link", { name: /trendyol varyasyon sayfasını yeni sekmede aç: l \/ siyah/i })).toHaveAttribute(
      "target",
      "_blank",
    );
    expect(await screen.findByRole("img", { name: /oversize hoodie ana görsel/i })).toHaveAttribute(
      "src",
      "https://cdn.example.com/hoodie-1.jpg",
    );
    expect(await screen.findByRole("button", { name: /jpg indir/i })).toBeInTheDocument();
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

  it("switches from genel bakis to hazirlik mode inside the same product page", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          product: productDetailPayload.product,
          draft: {
            id: "draft_1",
            productId: "prod_1",
            englishTitle: null,
            shortDescription: null,
            longDescription: null,
            tags: [],
            materials: [],
            attributes: [],
            seoNotes: null,
            policyNotes: null,
            generatedVersion: 0,
            editedVersion: 0,
            lastGeneratedAt: null,
            manualEditsPresent: false,
          },
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([
          { type: "step_started", step: "fetch_listing_signals", field: "general" },
          {
            type: "result_ready",
            result: {
              productId: "prod_1",
              insights: {
                seoNotes: "Lead with hoodie keyword.",
                policyNotes: "Care instructions should be explicit.",
                merchandisingNotes: "Missing lifestyle context.",
              },
            },
          },
        ]);
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetLabel: "Windows",
          aiTargetApiKey: "api_live_123",
        });
      }

      if (url === "https://clip.example.com/v0/management/auth-files") {
        return jsonResponse({
          items: [{ name: "primary.json", label: "OpenAI Workspace", disabled: false }],
        });
      }

      if (url.includes("/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/products/prod_1",
      path: "/products/:productId",
    });

    expect(await screen.findByRole("button", { name: /etsy'e yükle/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /etsy'e yükle/i }));

    expect(await screen.findByRole("heading", { name: /etsy hazırlık çalışma alanı/i })).toBeInTheDocument();
    expect(screen.getByText(/varyasyon matrisi/i)).not.toBeVisible();
    expect(screen.getByRole("button", { name: /genel bakışa dön/i })).toBeInTheDocument();
  });

  it("preserves unsaved prep workspace state when toggling back to genel bakis and returning", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          product: productDetailPayload.product,
          draft: {
            id: "draft_1",
            productId: "prod_1",
            englishTitle: null,
            shortDescription: null,
            longDescription: null,
            tags: [],
            materials: [],
            attributes: [],
            seoNotes: null,
            policyNotes: null,
            generatedVersion: 0,
            editedVersion: 0,
            lastGeneratedAt: null,
            manualEditsPresent: false,
          },
        });
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: "mgmt_live_123",
          aiTargetLabel: "Windows",
          aiTargetApiKey: "api_live_123",
        });
      }

      if (url === "https://clip.example.com/v0/management/auth-files") {
        return jsonResponse({
          items: [{ name: "primary.json", label: "OpenAI Workspace", disabled: false }],
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      if (url.includes("/products/prod_1")) {
        return jsonResponse(productDetailPayload);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<ProductDetailPage />, {
      route: "/products/prod_1",
      path: "/products/:productId",
    });

    await user.click(await screen.findByRole("button", { name: /etsy'e yükle/i }));
    await user.type(await screen.findByLabelText(/title/i), "Unsaved prep title");
    await user.click(screen.getByRole("button", { name: /genel bakışa dön/i }));

    expect(await screen.findByText(/varyasyon matrisi/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /etsy'e yükle/i }));
    expect(await screen.findByLabelText(/title/i)).toHaveValue("Unsaved prep title");
  });
});
