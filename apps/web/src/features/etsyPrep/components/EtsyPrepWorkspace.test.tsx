import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("EtsyPrepWorkspace", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("streams analysis steps, writes generated title directly into the field, and saves the workspace", async () => {
    const user = userEvent.setup();

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);

      if (url.includes("/products/prod_1/etsy-prep") && (!init?.method || init.method === "GET")) {
        return jsonResponse({
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
          connectorProfileSnapshot: {
            id: "profile_1",
            label: "Mock Connector",
          },
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

      if (url.includes("127.0.0.1:4317/generate-field") && init?.method === "POST") {
        return jsonResponse({
          field: "title",
          value: "Handmade Oversize Hoodie",
          provider: "mock",
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

        expect(payload.englishTitle).toBe("Handmade Oversize Hoodie");
        expect(payload.generatedFields).toContain("title");

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

    renderWithProviders(<EtsyPrepWorkspace productId="prod_1" />);

    expect(await screen.findByText(/signals/i)).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: /title üret/i }));
    expect(await screen.findByLabelText(/title/i)).toHaveValue("Handmade Oversize Hoodie");
    await user.click(screen.getByRole("button", { name: /kaydet/i }));
    expect(await screen.findByText(/^Kaydedildi$/i)).toBeInTheDocument();
  });
});
