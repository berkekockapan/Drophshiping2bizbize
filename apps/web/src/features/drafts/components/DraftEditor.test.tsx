import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DraftEditor } from "./DraftEditor";
import { SeoEditorPage } from "../routes/SeoEditorPage";
import { renderWithProviders } from "../../../test/test-utils";

describe("DraftEditor", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("marks fields as manually edited and disables silent overwrite", async () => {
    renderWithProviders(<DraftEditor />);

    await userEvent.type(screen.getByLabelText(/english title/i), "Custom title");

    expect(screen.getByText(/manuel düzenleme var/i)).toBeInTheDocument();
  });

  it("runs draft generation through the cloud AI endpoint and saves the result via the API", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const pathname = new URL(url, "http://localhost").pathname;
      const method = init?.method ?? "GET";

      if (pathname === "/owners/berke/products/prod_1" && method === "GET") {
        return new Response(
          JSON.stringify({
            product: {
              id: "prod_1",
              trendyolUrl: "https://www.trendyol.com/example",
              sourceProductId: "123",
              title: "Oversize Hoodie",
              brand: "North Apparel",
              category: "Sweatshirt",
              descriptionRaw: "Yumuşak dokulu oversize hoodie.",
              attributes: [{ key: "Kumaş", value: "Pamuk" }],
              images: [],
              status: "ACTIVE",
              parseStatus: "OK",
              lastCheckedAt: Date.now(),
            },
            currentState: {
              currentPrice: 44990,
              minPrice: 34990,
              maxPrice: 44990,
              inStockVariantCount: 2,
              totalVariantCount: 3,
              lastChangeAt: Date.now(),
              lastCheckedAt: Date.now(),
            },
            variants: [],
            priceHistory: [],
            stockHistory: [],
            notifications: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (pathname === "/owners/berke/products/prod_1/draft" && method === "GET") {
        return new Response(
          JSON.stringify({
            draft: {
              id: "draft_1",
              productId: "prod_1",
              englishTitle: "",
              shortDescription: "",
              longDescription: "",
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
            prompt: {
              instructions: "Use 13 tags",
              source: {
                productId: "prod_1",
                productTitle: "Oversize Hoodie",
                brand: "North Apparel",
                category: "Sweatshirt",
                description: "Yumuşak dokulu oversize hoodie.",
                attributes: [{ key: "Kumaş", value: "Pamuk" }],
                variants: [],
              },
              constraints: { locale: "en", maxTitleLength: 140, requiredTagCount: 13 },
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (pathname === "/ai-profiles/generate" && method === "POST") {
        return new Response(
          JSON.stringify({
            englishTitle: "Handmade Hoodie for Etsy",
            shortDescription: "Handmade short",
            longDescription: "Handmade long",
            tags: ["handmade", "hoodie"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "seo",
            policyNotes: "policy",
            model: "mock-v1",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (pathname === "/owners/berke/products/prod_1/draft/generate" && method === "POST") {
        return new Response(
          JSON.stringify({
            id: "draft_1",
            productId: "prod_1",
            englishTitle: "Handmade Hoodie for Etsy",
            shortDescription: "Handmade short",
            longDescription: "Handmade long",
            tags: ["handmade", "hoodie"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "seo",
            policyNotes: "policy",
            generatedVersion: 1,
            editedVersion: 0,
            lastGeneratedAt: Date.now(),
            manualEditsPresent: false,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SeoEditorPage />, {
      route: "/owners/berke/products/prod_1/seo",
      path: "/owners/:ownerKey/products/:productId/seo",
    });

    await userEvent.click(await screen.findByRole("button", { name: /başlık üret/i }));
    expect(await screen.findByDisplayValue(/handmade hoodie/i)).toBeInTheDocument();
  });

  it("saves manual draft edits through PATCH /drafts/:productId", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const pathname = new URL(url, "http://localhost").pathname;
      const method = init?.method ?? "GET";

      if (pathname === "/owners/berke/products/prod_1" && method === "GET") {
        return new Response(
          JSON.stringify({
            product: {
              id: "prod_1",
              trendyolUrl: "https://www.trendyol.com/example",
              sourceProductId: "123",
              title: "Oversize Hoodie",
              brand: "North Apparel",
              category: "Sweatshirt",
              descriptionRaw: "Yumuşak dokulu oversize hoodie.",
              attributes: [{ key: "Kumaş", value: "Pamuk" }],
              images: [],
              status: "ACTIVE",
              parseStatus: "OK",
              lastCheckedAt: Date.now(),
            },
            currentState: {
              currentPrice: 44990,
              minPrice: 34990,
              maxPrice: 44990,
              inStockVariantCount: 2,
              totalVariantCount: 3,
              lastChangeAt: Date.now(),
              lastCheckedAt: Date.now(),
            },
            variants: [],
            priceHistory: [],
            stockHistory: [],
            notifications: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (pathname === "/owners/berke/products/prod_1/draft" && method === "GET") {
        return new Response(
          JSON.stringify({
            draft: {
              id: "draft_1",
              productId: "prod_1",
              englishTitle: "Initial",
              shortDescription: "",
              longDescription: "",
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
            prompt: null,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (pathname === "/owners/berke/products/prod_1/draft" && method === "PATCH") {
        return new Response(
          JSON.stringify({
            id: "draft_1",
            productId: "prod_1",
            englishTitle: "Saved Title",
            shortDescription: "",
            longDescription: "",
            tags: [],
            materials: [],
            attributes: [],
            seoNotes: null,
            policyNotes: null,
            generatedVersion: 0,
            editedVersion: 1,
            lastGeneratedAt: null,
            manualEditsPresent: true,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    renderWithProviders(<SeoEditorPage />, {
      route: "/owners/berke/products/prod_1/seo",
      path: "/owners/:ownerKey/products/:productId/seo",
    });

    await userEvent.clear(await screen.findByLabelText(/english title/i));
    await userEvent.type(screen.getByLabelText(/english title/i), "Saved Title");
    await userEvent.click(screen.getByRole("button", { name: /taslağı kaydet/i }));

    expect(
      fetchSpy.mock.calls.some(([input, init]) => String(input).includes("/owners/berke/products/prod_1/draft") && init?.method === "PATCH"),
    ).toBe(true);
  });
});
