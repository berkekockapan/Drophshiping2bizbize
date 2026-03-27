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
      descriptionRaw: "Yumuşak dokulu oversize hoodie.",
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

  it("streams analysis steps, uses the local connector generate-field endpoint, persists risk notes, and resets generation metadata after save", async () => {
    const user = userEvent.setup();
    const savePayloads: Array<{
      englishTitle: string | null;
      longDescription: string | null;
      tags: string[];
      seoNotes: string | null;
      policyNotes: string | null;
      generatedFields: string[];
      editedFields: string[];
    }> = [];

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse(createBootstrapPayload());
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        });
      }

      if (url === "https://clip.example.com/health") {
        return jsonResponse({
          status: "online",
          provider: "chatgpt-web",
          activeProfile: {
            id: "profile_main",
            label: "OpenAI Workspace",
            emailMasked: "wo***@company.com",
            provider: "chatgpt-web",
            status: "connected",
            lastValidatedAt: Date.now(),
            lastError: null,
          },
          connectionAttempt: null,
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([
          { type: "step_started", step: "fetch_listing_signals", field: "general" },
          {
            type: "step_completed",
            step: "fetch_listing_signals",
            field: "general",
            signals: { keywordAngles: ["hoodie", "oversize", "streetwear"] },
          },
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

      if (url.includes("/products/prod_1/etsy-prep/generate-title") && init?.method === "POST") {
        return ndjsonResponse([
          { type: "step_started", step: "build_prompt_package", field: "title" },
          { type: "prompt_ready", field: "title", prompt: "Return ONLY valid JSON", context: { productId: "prod_1" } },
        ]);
      }

      if (url === "https://clip.example.com/generate-field" && init?.method === "POST") {
        return jsonResponse({
          field: "title",
          value: "Handmade Oversize Hoodie",
          provider: "chatgpt-web",
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/save") && init?.method === "PUT") {
        const payload = JSON.parse(String(init.body)) as {
          englishTitle: string | null;
          longDescription: string | null;
          tags: string[];
          seoNotes: string | null;
          policyNotes: string | null;
          generatedFields: string[];
          editedFields: string[];
        };
        savePayloads.push(payload);

        return jsonResponse({
          id: "draft_1",
          productId: "prod_1",
          englishTitle: payload.englishTitle,
          shortDescription: null,
          longDescription: payload.longDescription,
          tags: payload.tags,
          materials: [],
          attributes: [],
          seoNotes: payload.seoNotes,
          policyNotes: payload.policyNotes,
          generatedVersion: 1,
          editedVersion: 0,
          lastGeneratedAt: Date.parse("2026-03-24T09:00:00.000Z"),
          manualEditsPresent: false,
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyPrepWorkspace ownerKey="berke" productId="prod_1" onBack={() => undefined} />);

    expect(await screen.findByText(/signals/i)).toBeInTheDocument();
    expect(await screen.findByText(/bağlantı durumu: wo\*\*\*@company.com/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /title üret/i }));
    expect(await screen.findByLabelText(/title/i)).toHaveValue("Handmade Oversize Hoodie");
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://clip.example.com/generate-field",
      expect.objectContaining({ method: "POST" }),
    );
    expect(screen.getByText(/Lead with hoodie keyword\./i)).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /seo notları/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /kaydet/i }));
    expect(await screen.findByText(/^Kaydedildi$/i)).toBeInTheDocument();

    expect(savePayloads).toHaveLength(1);
    expect(savePayloads[0]?.englishTitle).toBe("Handmade Oversize Hoodie");
    expect(savePayloads[0]?.generatedFields).toContain("title");
    expect(savePayloads[0]?.policyNotes).toContain("Care instructions should be explicit.");
    expect(savePayloads[0]?.policyNotes).toContain("Missing lifestyle context.");

    await user.clear(screen.getByLabelText(/title/i));
    await user.type(screen.getByLabelText(/title/i), "Handmade Oversize Hoodie Updated");
    await user.click(screen.getByRole("button", { name: /kaydet/i }));

    expect(await screen.findByText(/^Kaydedildi$/i)).toBeInTheDocument();
    expect(savePayloads).toHaveLength(2);
    expect(savePayloads[1]?.generatedFields).toEqual([]);
  });

  it("blocks field generation with a product-language message when no active connector profile exists", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse(createBootstrapPayload());
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        });
      }

      if (url === "https://clip.example.com/health") {
        return jsonResponse({
          status: "online",
          provider: "chatgpt-web",
          activeProfile: null,
          connectionAttempt: null,
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyPrepWorkspace ownerKey="berke" productId="prod_1" onBack={() => undefined} />);

    expect(await screen.findByRole("link", { name: /ai bağlantıları/i })).toHaveAttribute("href", "/connections");
    expect((await screen.findAllByText(/openai bağlantısı gerekli/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /title üret/i })).toBeDisabled();
  });

  it("blocks generation when the connector profile needs reauth", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse(createBootstrapPayload());
      }

      if (url.endsWith("/settings") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
          id: "default",
          refreshIntervalHours: 5,
          promptPreferences: null,
          connectorHealthcheckEnabled: true,
          aiTargetBaseUrl: "https://clip.example.com",
          aiTargetManagementKey: null,
          aiTargetLabel: null,
          aiTargetApiKey: null,
        });
      }

      if (url === "https://clip.example.com/health") {
        return jsonResponse({
          status: "online",
          provider: "chatgpt-web",
          activeProfile: {
            id: "profile_main",
            label: "OpenAI Workspace",
            emailMasked: "wo***@company.com",
            provider: "chatgpt-web",
            status: "needs_reauth",
            lastValidatedAt: Date.now(),
            lastError: "Session expired",
          },
          connectionAttempt: null,
        });
      }

      if (url.includes("/products/prod_1/etsy-prep/analyze") && init?.method === "POST") {
        return ndjsonResponse([{ type: "step_started", step: "fetch_listing_signals", field: "general" }]);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<EtsyPrepWorkspace ownerKey="berke" productId="prod_1" onBack={() => undefined} />);

    expect(await screen.findByRole("link", { name: /ai bağlantıları/i })).toHaveAttribute("href", "/connections");
    expect((await screen.findAllByText(/bağlantı yeniden doğrulanmalı/i)).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /title üret/i })).toBeDisabled();
  });
});

