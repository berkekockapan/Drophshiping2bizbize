import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { createTestEnv } from "../support/sqlite";
const productWithVariantsHtml = readFileSync(
  new URL("../fixtures/trendyol/product-with-variants.html", import.meta.url),
  "utf8",
);

function createEnv() {
  const { sqlite, env } = createTestEnv();

  return { env, sqlite };
}

describe("draft flows", () => {
  it("persists manual edits and protects fields from silent overwrite", async () => {
    const { env } = createEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(productWithVariantsHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const app = createApp();

    const draftResponse = await app.request(`http://localhost/drafts/${seeded.product.id}`, undefined, env);
    expect(draftResponse.status).toBe(200);

    const editResponse = await app.request(
      `http://localhost/drafts/${seeded.product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ englishTitle: "Custom title", shortDescription: "Custom short" }),
      },
      env,
    );

    expect(editResponse.status).toBe(200);

    const clearResponse = await app.request(
      `http://localhost/drafts/${seeded.product.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortDescription: null }),
      },
      env,
    );

    expect(clearResponse.status).toBe(200);
    const clearJson = await clearResponse.json();
    expect(clearJson.shortDescription).toBeNull();

    const generateNoOverwrite = await app.request(
      `http://localhost/drafts/${seeded.product.id}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overwrite: false,
          generated: {
            englishTitle: "Generated title",
            shortDescription: "Generated short",
            longDescription: "Generated long",
            tags: ["etsy", "gift"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "generated seo",
            policyNotes: "generated policy",
          },
        }),
      },
      env,
    );

    const noOverwriteJson = await generateNoOverwrite.json();
    expect(noOverwriteJson.englishTitle).toBe("Custom title");

    const generateOverwrite = await app.request(
      `http://localhost/drafts/${seeded.product.id}/generate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overwrite: true,
          generated: {
            englishTitle: "Generated title",
            shortDescription: "Generated short",
            longDescription: "Generated long",
            tags: ["etsy", "gift"],
            materials: ["cotton"],
            attributes: [{ key: "Fit", value: "Oversize" }],
            seoNotes: "generated seo",
            policyNotes: "generated policy",
          },
        }),
      },
      env,
    );

    const overwriteJson = await generateOverwrite.json();
    expect(overwriteJson.englishTitle).toBe("Generated title");
  });

  it("syncs connector profile metadata into API storage", async () => {
    const { env } = createEnv();
    const app = createApp();

    const syncResponse = await app.request(
      "http://localhost/ai-profiles/sync",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectorStatus: {
            status: "online",
            provider: "chatgpt-web",
          },
          profiles: [
            {
              id: "profile_primary",
              label: "ChatGPT Workspace",
              emailMasked: "wo***@company.com",
              provider: "chatgpt-web",
              isActive: true,
            },
          ],
        }),
      },
      env,
    );

    expect(syncResponse.status).toBe(200);
    const syncJson = await syncResponse.json();
    expect(syncJson.items).toHaveLength(1);
    expect(syncJson.items[0]).toEqual(
      expect.objectContaining({
        id: "profile_primary",
        isActive: true,
      }),
    );
  });
});
