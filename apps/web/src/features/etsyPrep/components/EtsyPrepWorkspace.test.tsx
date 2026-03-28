import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { installMockLocalStorage } from "../../../test/mockLocalStorage";
import { renderWithProviders } from "../../../test/test-utils";
import { EtsyPrepWorkspace } from "./EtsyPrepWorkspace";

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ndjsonResponse(events: unknown[]) {
  return new Response(`${events.map((event) => JSON.stringify(event)).join("\n")}\n`, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson" },
  });
}

function createBootstrapPayload() {
  return {
    product: {
      id: "prod_1",
      trendyolUrl: "https://www.trendyol.com/example",
      sourceProductId: "123",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      category: "Sweatshirt",
      descriptionRaw: "Yumusak dokulu oversize hoodie.",
      attributes: [{ key: "Renk", value: "Siyah" }],
      images: ["https://cdn.example.com/hoodie-1.jpg"],
      status: "ACTIVE",
      parseStatus: "OK",
      lastCheckedAt: Date.parse("2026-03-20T10:00:00.000Z"),
    },
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
  };
}

describe("EtsyPrepWorkspace", () => {
  beforeEach(() => {
    installMockLocalStorage();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("copies the listing prompt and fills title, description, tags with one AI action", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse(createBootstrapPayload());
      }

      if (url.includes("/products/prod_1/etsy-prep/prompt-pack") && init?.method === "POST") {
        return jsonResponse({
          rulebookVersion: "etsy-prompt-pack-v1",
          generatedAt: Date.parse("2026-03-29T09:00:00.000Z"),
          productSnapshot: {
            productId: "prod_1",
            title: "Oversize Hoodie",
            brand: "North Apparel",
            category: "Sweatshirt",
            attributeCount: 2,
            variantCount: 1,
            imageCount: 1,
          },
          listingPromptPack: {
            prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
            outputContract: { type: "json", fields: ["title", "description", "tags"] },
          },
          imagePromptPack: {
            mainPrompt: "Use the reference image as truth.",
            variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
            guardrailSummary: ["Urun formunu degistirme"],
          },
        });
      }

      if (url.endsWith("/ai-profiles/health")) {
        return jsonResponse({
          status: "online",
          provider: "openai-oauth",
          activeProfile: {
            id: "profile_main",
            label: "OpenAI Workspace",
            emailMasked: "wo***@company.com",
            provider: "openai-oauth",
            status: "connected",
            lastValidatedAt: Date.now(),
            lastError: null,
          },
          connectionAttempt: null,
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/generate-listing-pack") && init?.method === "POST") {
        return jsonResponse({
          provider: "openai-oauth",
          rulebookVersion: "etsy-prompt-pack-v1",
          result: {
            title: "Handmade Oversize Hoodie",
            description: "Soft cotton hoodie for everyday wear.",
            tags: "oversize hoodie, streetwear gift",
          },
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: null,
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyPrepWorkspace ownerKey="berke" productId="prod_1" onBack={() => undefined} />);

    await user.click(await screen.findByRole("button", { name: /^promptu kopyala$/i }));
    expect(clipboardWrite).toHaveBeenCalledWith(expect.stringContaining("Non-Negotiable Rules"));

    await user.click(screen.getByRole("button", { name: /ai ile uret/i }));
    expect(await screen.findByLabelText(/title/i)).toHaveValue("Handmade Oversize Hoodie");
    expect(screen.getByLabelText(/description/i)).toHaveValue("Soft cotton hoodie for everyday wear.");
    expect(screen.getByLabelText(/tags/i)).toHaveValue("oversize hoodie, streetwear gift");
  });

  it("keeps copy actions available when automatic generation fails", async () => {
    const user = userEvent.setup();
    const clipboardWrite = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWrite },
      configurable: true,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse(createBootstrapPayload());
      }

      if (url.includes("/products/prod_1/etsy-prep/prompt-pack") && init?.method === "POST") {
        return jsonResponse({
          rulebookVersion: "etsy-prompt-pack-v1",
          generatedAt: Date.parse("2026-03-29T09:00:00.000Z"),
          productSnapshot: {
            productId: "prod_1",
            title: "Oversize Hoodie",
            brand: "North Apparel",
            category: "Sweatshirt",
            attributeCount: 2,
            variantCount: 1,
            imageCount: 1,
          },
          listingPromptPack: {
            prompt: "Non-Negotiable Rules\nReturn ONLY valid JSON.",
            outputContract: { type: "json", fields: ["title", "description", "tags"] },
          },
          imagePromptPack: {
            mainPrompt: "Use the reference image as truth.",
            variations: ["v1", "v2", "v3", "v4", "v5", "v6", "v7"],
            guardrailSummary: ["Urun formunu degistirme"],
          },
        });
      }

      if (url.endsWith("/ai-profiles/health")) {
        return jsonResponse({
          status: "online",
          provider: "openai-oauth",
          activeProfile: {
            id: "profile_main",
            label: "OpenAI Workspace",
            emailMasked: "wo***@company.com",
            provider: "openai-oauth",
            status: "connected",
            lastValidatedAt: Date.now(),
            lastError: null,
          },
          connectionAttempt: null,
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/generate-listing-pack") && init?.method === "POST") {
        return jsonResponse(
          {
            error: {
              code: "NO_ACTIVE_PROFILE",
              message: "Aktif OpenAI hesabi bulunamadi.",
            },
          },
          409,
        );
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      if (url.endsWith("/settings")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: null,
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyPrepWorkspace ownerKey="berke" productId="prod_1" onBack={() => undefined} />);

    await user.click(await screen.findByRole("button", { name: /^promptu kopyala$/i }));
    expect(clipboardWrite).toHaveBeenCalledWith(expect.stringContaining("Non-Negotiable Rules"));

    await user.click(screen.getByRole("button", { name: /ai ile uret/i }));
    expect(await screen.findByText(/aktif openai hesabi bulunamadi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^promptu kopyala$/i })).toBeEnabled();
  });
});
