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

const imageVariations = [
  "Same exact product from the reference image. Etsy hero clean product shot. Centered composition with the product dominant in frame and strong thumbnail readability.",
  "Same exact product from the reference image. Etsy hero clean product shot. Close three-quarter framing that keeps the full silhouette readable.",
  "Same exact product from the reference image. Etsy hero clean product shot. Front-biased tabletop angle with generous breathing room around the product.",
  "Same exact product from the reference image. Etsy hero clean product shot. Tight but complete framing that highlights the main silhouette and key surface detail.",
  "Same exact product from the reference image. Lifestyle scene. Natural in-context framing with the product still dominant in frame.",
  "Same exact product from the reference image. Lifestyle scene. Shelf or surface setup with balanced negative space and a readable silhouette.",
  "Same exact product from the reference image. Lifestyle scene. Medium framing that shows the product clearly before any surrounding context.",
  "Same exact product from the reference image. Lifestyle scene. Readable contextual composition with the product still owning the center of attention.",
  "Same exact product from the reference image. Editorial attention-grabber. Refined product-first composition with stronger visual hierarchy.",
  "Same exact product from the reference image. Editorial attention-grabber. Sophisticated close framing that keeps defining details obvious.",
];

const researchPromptLines = [
  "Role",
  "You are an Etsy SEO strategist, Etsy buyer-intent keyword researcher, and conversion-focused listing copywriter for English-language Etsy listings.",
  "",
  "Keyword Evidence Priority",
  "- Prioritize Etsy Marketplace Insights data supplied by the user when available.",
  "- Never claim that a keyword is the most searched, highest volume, or best keyword unless direct Etsy Marketplace Insights or Shop Stats data supports it.",
  "",
  "Research First",
  "- If web access is available, check current Etsy Seller Handbook or Etsy Help guidance on titles, tags, descriptions, attributes, and listing quality before drafting.",
  "- If web access is available, review 10-20 live English-language Etsy listings in the same product group before drafting.",
  "",
  "Description Rules",
  "- Each paragraph must be 80-115 words.",
  "- Total description length must be 250-340 words.",
  "- Use 1-3 mild emojis total inside the description.",
  "",
  "Tag Rules",
  "- Internally generate at least 40 candidate Etsy search phrases before selecting the final 13 tags.",
  "- The final 13 tags must be exactly 13 unique English tags, 20 characters or fewer each, and sound like natural Etsy buyer searches.",
  "- Replace the weakest 3 tags unless they are clearly supported by strong buyer intent or supplied Etsy data.",
  "",
  "Output",
  "1. Title",
  "2. Description",
  "3. Tags",
];

function createPromptPackPayload() {
  const researchPrompt = researchPromptLines.join("\n");

  const systemPrompt = [
    "Role",
    "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
    "",
    "Output Contract",
    '- Return only valid JSON with title, description, tags.',
  ].join("\n");

  return {
    rulebookVersion: "etsy-prompt-pack-v7",
    generatedAt: Date.parse("2026-03-31T09:00:00.000Z"),
    productSnapshot: {
      productId: "prod_1",
      title: "Oversize Hoodie",
      brand: "North Apparel",
      category: "Sweatshirt",
      attributeCount: 2,
      variantCount: 1,
      imageCount: 1,
    },
    systemListingPromptPack: {
      prompt: systemPrompt,
      outputContract: { type: "json", fields: ["title", "description", "tags"] },
    },
    chatGptResearchPromptPack: {
      prompt: researchPrompt,
      outputFormat: "sectioned-text",
      researchMode: "required",
      expectedSections: ["title", "description", "tags"],
    },
    imagePromptPack: {
      mainPrompt: [
        "Reference Truth",
        "- The manual reference image is the single source of truth for the exact product.",
        "",
        "Etsy Visual Objective",
        "- Make the product readable even at thumbnail size.",
      ].join("\n"),
      variations: imageVariations,
      guardrailSummary: ["Do not redesign, reinterpret, embellish, or reconstruct the product."],
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
          rulebookVersion: "etsy-prompt-pack-v7",
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

    expect(await screen.findByText(/ChatGPT Research Mode/i)).toBeInTheDocument();
    expect(screen.getByText(/System Generate Mode/i)).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: /chatgpt arastirma promptunu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      1,
      researchPromptLines.join("\n"),
    );

    await user.click(screen.getByRole("button", { name: /sistem promptunu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      2,
      [
        "Role",
        "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
        "",
        "Output Contract",
        '- Return only valid JSON with title, description, tags.',
      ].join("\n"),
    );

    expect(screen.getAllByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /ana promptu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      3,
      [
        "Reference Truth",
        "- The manual reference image is the single source of truth for the exact product.",
        "",
        "Etsy Visual Objective",
        "- Make the product readable even at thumbnail size.",
      ].join("\n"),
    );

    await user.click(screen.getByRole("button", { name: /10 varyasyonu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      4,
      imageVariations.map((variation, index) => `${index + 1}. ${variation}`).join("\n"),
    );

    expect(screen.getByText(/reference truth/i)).toBeInTheDocument();
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

    await user.click(await screen.findByRole("button", { name: /chatgpt arastirma promptunu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      1,
      researchPromptLines.join("\n"),
    );

    await user.click(screen.getByRole("button", { name: /sistem promptunu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      2,
      [
        "Role",
        "You are an Etsy listing strategist, Etsy copywriter, and policy-aware SEO assistant.",
        "",
        "Output Contract",
        '- Return only valid JSON with title, description, tags.',
      ].join("\n"),
    );

    expect(screen.getAllByText(/2 özellik .* 1 varyant .* 1 referans görsel/i)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: /ana promptu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      3,
      [
        "Reference Truth",
        "- The manual reference image is the single source of truth for the exact product.",
        "",
        "Etsy Visual Objective",
        "- Make the product readable even at thumbnail size.",
      ].join("\n"),
    );

    await user.click(screen.getByRole("button", { name: /10 varyasyonu kopyala/i }));
    expect(clipboardWrite).toHaveBeenNthCalledWith(
      4,
      imageVariations.map((variation, index) => `${index + 1}. ${variation}`).join("\n"),
    );

    expect(screen.getByText(/reference truth/i)).toBeInTheDocument();
    expect(screen.queryByText(/PRODUCT_CONTEXT|https:\/\/cdn\.example\.com/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ai ile uret/i }));
    expect(await screen.findByText(/aktif openai hesabi bulunamadi/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chatgpt arastirma promptunu kopyala/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /sistem promptunu kopyala/i })).toBeEnabled();
  });
});
