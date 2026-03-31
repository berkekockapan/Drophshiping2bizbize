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
  "You are an Etsy SEO strategist, buyer-intent keyword researcher, and conversion-focused copywriter.",
  "",
  "Research First",
  "- Check Etsy Seller Handbook guidance on listing quality and keyword strategy before drafting.",
  "- Review a meaningful set of live English-language Etsy competitor listings in the same product group before you write.",
  "",
  "Tag Strategy",
  "- Generate 30 candidate Etsy search phrases first, then keep only the strongest 13.",
  "- Use all 13 tags.",
  "- Keep every tag at 20 characters or fewer.",
  "- Every tag must read like a natural Etsy buyer query, not a literal attribute dump or awkward translated phrase.",
  "- At least 8 tags must pair a concrete product anchor with a differentiator.",
  "- No more than 4 tags may use the same main noun root.",
  "- No more than 5 tags may repeat the same adjective root.",
  "- Reject tags that combine a raw measurement with a generic noun unless the phrase sounds like a real Etsy buyer search.",
  "- Treat size tags as optional. Use a size-based tag only when the exact phrase sounds like a natural Etsy buyer search and is stronger than available material, style, recipient, or use-case tags.",
  "- Do not reject a tag only because it is broad.",
  "- Keep broader material or color tags only when they add distinct search intent not already covered by stronger product-type tags.",
  "- Do not let generic fallback nouns such as jewelry or accessory dominate the tag set; keep them only when they add distinct search intent that a more specific product noun cannot express cleanly.",
  "- Use truthful claims such as handmade when they are explicitly supported by product facts and improve buyer clarity.",
  "- Do not call an item vintage unless the product facts explicitly confirm Etsy-vintage eligibility.",
  "- Replace the weakest 3 tags before finalizing.",
  "",
  "Tag Self-Reject",
  "- Reject any tag set where the same product noun dominates too many tags.",
  "- Reject any tag set where color repetition crowds out other buyer intents.",
  "- Reject any tag set where more than 2 tags feel like minor rewrites.",
  "- Reject any tag set with awkward raw-size phrases such as 20 cm bracelet when a more natural buyer phrase is available.",
  "- Reject any tag set where a size-based tag survives even though stronger material, style, recipient, or use-case tags are available.",
  "- Reject a broad tag only when it adds no distinct buyer intent beyond stronger tags already in the set.",
  "- Reject any tag set where more than 2 tags rely on generic fallback nouns such as jewelry or accessory.",
  "- Reject weak generic tags such as everyday jewelry, wrist jewelry, or long stone bracelet when stronger product-led queries are available.",
  "- Reject any output that uses vintage language without explicit proof that the item qualifies as vintage on Etsy.",
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
    rulebookVersion: "etsy-prompt-pack-v6",
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
          rulebookVersion: "etsy-prompt-pack-v6",
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
