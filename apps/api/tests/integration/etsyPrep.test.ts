import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

describe("etsy prep", () => {
  it("returns Etsy prep bootstrap data and persists saved workspace fields", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();

    const bootstrap = await app.request(`http://localhost/products/${seeded.product.id}/etsy-prep`, undefined, env);
    expect(bootstrap.status).toBe(200);
    expect(await bootstrap.json()).toEqual(
      expect.objectContaining({
        product: expect.objectContaining({ id: seeded.product.id, title: expect.any(String) }),
        draft: expect.objectContaining({ productId: seeded.product.id }),
      }),
    );

    const save = await app.request(
      `http://localhost/products/${seeded.product.id}/etsy-prep/save`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          englishTitle: "Handmade Oversize Hoodie for Etsy",
          longDescription: "Detailed Etsy description",
          tags: ["oversize hoodie", "streetwear gift"],
          seoNotes: "Lead with hoodie + material intent.",
          policyNotes: "Missing care instructions.",
          generatedFields: ["title", "description", "tags"],
          editedFields: ["title"],
        }),
      },
      env,
    );

    expect(save.status).toBe(200);
    const savedJson = await save.json();
    expect(savedJson.englishTitle).toBe("Handmade Oversize Hoodie for Etsy");
    expect(savedJson.longDescription).toBe("Detailed Etsy description");
    expect(savedJson.tags).toEqual(["oversize hoodie", "streetwear gift"]);
    expect(savedJson.manualEditsPresent).toBe(true);
  });

  it("returns 400 for invalid prep save payloads", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();

    const response = await app.request(
      `http://localhost/products/${seeded.product.id}/etsy-prep/save`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(["not", "a", "valid", "payload"]),
      },
      env,
    );

    expect(response.status).toBe(400);
  });

  it("preserves existing manual edit state when prep save has generated fields only", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();

    const manualEdit = await app.request(
      `http://localhost/drafts/${seeded.product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishTitle: "Manually edited title" }),
      },
      env,
    );
    expect(manualEdit.status).toBe(200);

    const save = await app.request(
      `http://localhost/products/${seeded.product.id}/etsy-prep/save`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          englishTitle: "Generated Etsy Title",
          longDescription: "Generated Etsy description",
          tags: ["hoodie"],
          seoNotes: "SEO notes",
          policyNotes: "Policy notes",
          generatedFields: ["title", "description", "tags"],
          editedFields: [],
        }),
      },
      env,
    );

    expect(save.status).toBe(200);
    const savedJson = await save.json();
    expect(savedJson.manualEditsPresent).toBe(true);
  });

  it("streams Etsy prep analysis steps as ndjson", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();

    const response = await app.request(
      `http://localhost/products/${seeded.product.id}/etsy-prep/analyze`,
      { method: "POST" },
      env,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");

    const lines = (await response.text())
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    expect(lines.map((line) => line.type)).toEqual([
      "step_started",
      "step_completed",
      "research_summary",
      "result_ready",
    ]);
    expect(lines.at(-1)?.result.insights.seoNotes).toContain("keyword");
  });

  it("streams a title prompt package instead of trying to call the local connector from the API", async () => {
    const { env } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-23T09:00:00.000Z"),
      },
    );

    const app = createApp();

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      throw new Error(`Unexpected fetch call during Etsy prep packaging: ${String(input)}`);
    };

    try {
      const response = await app.request(
        `http://localhost/products/${seeded.product.id}/etsy-prep/generate-title`,
        { method: "POST" },
        env,
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/x-ndjson");

      const lines = (await response.text())
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      expect(lines.at(-1)).toEqual(
        expect.objectContaining({
          type: "prompt_ready",
          field: "title",
          prompt: expect.stringContaining("Return ONLY valid JSON"),
        }),
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
