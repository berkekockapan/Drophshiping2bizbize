import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/index";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const envoyProductHtml = `
  <!doctype html>
  <html>
    <head>
      <script>
        window["__envoy__PROPS"] = {
          "product": {
            "name": "Glass Cup",
            "brand": { "name": "Brand A" },
            "category": { "name": "Bardak" },
            "images": [
              "https://cdn.example.com/cup-1.jpg",
              "https://cdn.example.com/product-placeholder-v2.jpeg"
            ],
            "variants": [
              {
                "itemNumber": 976599742,
                "value": "",
                "beautifiedValue": "",
                "url": "/brand-a/glass-cup-clear-p-555",
                "inStock": true,
                "isSelected": true,
                "price": {
                  "value": 89,
                  "text": "89 TL"
                }
              }
            ],
            "merchantListing": {
              "winnerVariant": {
                "itemNumber": 976599742,
                "inStock": true,
                "price": {
                  "currency": "TRY",
                  "discountedPrice": {
                    "value": 89,
                    "text": "89 TL"
                  },
                  "sellingPrice": {
                    "value": 89,
                    "text": "89 TL"
                  }
                }
              }
            }
          }
        };
      </script>
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ProductGroup",
          "name": "Brand A Glass Cup",
          "manufacturer": "Brand A",
          "offers": {
            "@type": "Offer",
            "availability": "https://schema.org/InStock",
            "price": 34.99,
            "priceCurrency": "TRY"
          },
          "hasVariant": [
            {
              "@type": "Product",
              "sku": "sku-1",
              "color": "Siyah",
              "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "price": 33.5,
                "priceCurrency": "TRY"
              }
            }
          ]
        }
      </script>
    </head>
    <body></body>
  </html>
`;

describe("POST /owners/:ownerKey/products", () => {
  it("creates a tracked product and rejects a duplicate normalized URL", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp({
      fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
    });

    const first = await app.request("http://localhost/owners/berke/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" }),
    }, env);

    const second = await app.request("http://localhost/owners/berke/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=999" }),
    }, env);

    expect(first.status).toBe(201);
    expect(second.status).toBe(409);

    const products = sqlite.prepare(
      "select trendyol_url as trendyolUrl, source_product_id as sourceProductId, title, is_favorite as isFavorite from products",
    ).all() as Array<{ trendyolUrl: string; sourceProductId: string; title: string; isFavorite: number }>;
    const variants = sqlite.prepare("select count(*) as count from product_variants").get() as { count: number };
    const currentState = sqlite.prepare("select current_price as currentPrice, in_stock_variant_count as inStockVariantCount from product_current_state").get() as { currentPrice: number; inStockVariantCount: number };

    expect(products).toEqual([
      {
        trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123",
        sourceProductId: "123",
        title: "Oversize Hoodie",
        isFavorite: 0,
      },
    ]);
    expect(variants.count).toBe(1);
    expect(currentState).toEqual({ currentPrice: 42990, inStockVariantCount: 1 });
  });

  it("persists PDP price from envoy props instead of JSON-LD fallback price", async () => {
    const { env, sqlite } = createTestEnv();
    const app = createApp({
      fetchImpl: async () => new Response(envoyProductHtml, { status: 200 }),
    });

    const response = await app.request(
      "http://localhost/owners/berke/products",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ trendyolUrl: "https://www.trendyol.com/brand-a/glass-cup-p-555" }),
      },
      env,
    );

    expect(response.status).toBe(201);

    const currentState = sqlite.prepare("select current_price as currentPrice from product_current_state").get() as { currentPrice: number };
    const variants = sqlite.prepare("select variant_key as variantKey, current_price as currentPrice, raw_payload as rawPayload from product_variants").all() as Array<{
      variantKey: string;
      currentPrice: number;
      rawPayload: string;
    }>;

    expect(currentState).toEqual({ currentPrice: 8900 });
    expect(variants).toEqual([
      {
        variantKey: "976599742",
        currentPrice: 8900,
        rawPayload: expect.stringContaining('"url":"https://www.trendyol.com/brand-a/glass-cup-clear-p-555"'),
      },
    ]);
  });
});
