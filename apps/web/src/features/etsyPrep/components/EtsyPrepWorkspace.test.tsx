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

function createPromptPackPayload() {
  return {
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
      prompt: [
        "Role",
        "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
        "",
        "Language Rules",
        "- Output English only except brand names and immutable technical proper nouns.",
        "",
        "Sanitized Product Facts",
        "- Source title: Oversize Hoodie",
        "- Brand: North Apparel",
        "- Materyal: Pamuk",
        "- Renk: Siyah",
        "",
        "Return ONLY the JSON object.",
      ].join("\n"),
      outputContract: { type: "json", fields: ["title", "description", "tags"] },
    },
    imagePromptPack: {
      mainPrompt: "Use the manual reference image as the single source of truth for the product.",
      variations: [
        "Bright studio tabletop scene with a clean front angle and minimal props.",
        "Soft morning window light with a slight top-down camera angle.",
        "Neutral lifestyle shelf setup with shallow depth and tidy styling.",
        "Warm gift-table composition with centered framing and soft shadows.",
        "Editorial catalog shot with crisp side angle and muted backdrop.",
        "Minimal fabric backdrop with close three-quarter framing.",
        "Airy home desk setting with natural light and restrained accessories.",
      ],
      guardrailSummary: ["Do not redesign the product."],
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
        return jsonResponse(createPromptPackPayload());
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
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      1,
      [
        "Role",
        "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
        "",
        "Language Rules",
        "- Output English only except brand names and immutable technical proper nouns.",
        "",
        "Sanitized Product Facts",
        "- Source title: Oversize Hoodie",
        "- Brand: North Apparel",
        "- Materyal: Pamuk",
        "- Renk: Siyah",
        "",
        "Return ONLY the JSON object.",
      ].join("\n"),
    );

    expect(screen.getAllByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /ana promptu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      2,
      "Use the manual reference image as the single source of truth for the product.",
    );

    await user.click(screen.getByRole("button", { name: /7 varyasyonu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      3,
      [
        "1. Bright studio tabletop scene with a clean front angle and minimal props.",
        "2. Soft morning window light with a slight top-down camera angle.",
        "3. Neutral lifestyle shelf setup with shallow depth and tidy styling.",
        "4. Warm gift-table composition with centered framing and soft shadows.",
        "5. Editorial catalog shot with crisp side angle and muted backdrop.",
        "6. Minimal fabric backdrop with close three-quarter framing.",
        "7. Airy home desk setting with natural light and restrained accessories.",
      ].join("\n"),
    );

    expect(screen.getByText("Use the manual reference image as the single source of truth for the product.")).toBeInTheDocument();
    expect(screen.queryByText(/PRODUCT_CONTEXT|https:\/\/cdn\.example\.com/i)).not.toBeInTheDocument();

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
        return jsonResponse(createPromptPackPayload());
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
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      1,
      [
        "Role",
        "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
        "",
        "Language Rules",
        "- Output English only except brand names and immutable technical proper nouns.",
        "",
        "Sanitized Product Facts",
        "- Source title: Oversize Hoodie",
        "- Brand: North Apparel",
        "- Materyal: Pamuk",
        "- Renk: Siyah",
        "",
        "Return ONLY the JSON object.",
      ].join("\n"),
    );

    expect(screen.getAllByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /ana promptu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      2,
      "Use the manual reference image as the single source of truth for the product.",
    );

    await user.click(screen.getByRole("button", { name: /7 varyasyonu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      3,
      [
        "1. Bright studio tabletop scene with a clean front angle and minimal props.",
        "2. Soft morning window light with a slight top-down camera angle.",
        "3. Neutral lifestyle shelf setup with shallow depth and tidy styling.",
        "4. Warm gift-table composition with centered framing and soft shadows.",
        "5. Editorial catalog shot with crisp side angle and muted backdrop.",
        "6. Minimal fabric backdrop with close three-quarter framing.",
        "7. Airy home desk setting with natural light and restrained accessories.",
      ].join("\n"),
    );

    expect(screen.getByText("Use the manual reference image as the single source of truth for the product.")).toBeInTheDocument();
    expect(screen.queryByText(/PRODUCT_CONTEXT|https:\/\/cdn\.example\.com/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ai ile uret/i }));
    expect(await screen.findByText(/aktif openai hesabi bulunamadi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^promptu kopyala$/i })).toBeEnabled();
  });
});
