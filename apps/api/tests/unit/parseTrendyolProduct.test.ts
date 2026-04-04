import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ParseError } from "../../src/modules/scraping/parseErrors";
import { parseTrendyolProduct } from "../../src/modules/scraping/parseTrendyolProduct";

function readFixture(name: string) {
  return readFileSync(new URL(`../fixtures/trendyol/${name}`, import.meta.url), "utf8");
}

describe("parseTrendyolProduct", () => {
  it("extracts variant-aware product data from a fixture", () => {
    const parsed = parseTrendyolProduct(readFixture("product-with-variants.html"));

    expect(parsed.title).toBe("Oversize Hoodie");
    expect(parsed.variants[0]).toEqual(
      expect.objectContaining({
        variantKey: "S-Siyah",
        option1: "S",
        option2: "Siyah",
        stockState: "IN_STOCK",
        price: 42990,
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/north-apparel/oversize-hoodie-s-siyah-p-123",
        }),
      })
    );
    expect(parsed.images).toHaveLength(2);
  });

  it("falls back to JSON-LD product payloads when fixture selectors are absent", () => {
    const parsed = parseTrendyolProduct(`
      <!doctype html>
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              "name": "JSON-LD Cup",
              "description": "Sample product description",
              "manufacturer": "Brand A",
              "image": { "contentUrl": ["https://cdn.example.com/img-1.jpg"] },
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
                  "availability": "https://schema.org/OutOfStock",
                  "url": "/brand-a/json-ld-cup-siyah-p-1",
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
    `);

    expect(parsed.title).toBe("JSON-LD Cup");
    expect(parsed.brand).toBe("Brand A");
    expect(parsed.price).toBe(3499);
    expect(parsed.images).toEqual(["https://cdn.example.com/img-1.jpg"]);
    expect(parsed.variants[0]).toEqual(
      expect.objectContaining({
        variantKey: "sku-1",
        option1: "Siyah",
        stockState: "OUT_OF_STOCK",
        price: 3350,
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/brand-a/json-ld-cup-siyah-p-1",
        }),
      })
    );
  });

  it("prefers Trendyol PDP state over JSON-LD fallback prices", () => {
    const parsed = parseTrendyolProduct(`
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
                "attributes": [
                  {
                    "key": { "name": "Materyal" },
                    "value": { "name": "Cam" }
                  }
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
              "description": "Sample product description",
              "manufacturer": "Brand A",
              "image": { "contentUrl": ["https://cdn.example.com/jsonld-image.jpg"] },
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
                  "url": "https://www.trendyol.com/brand-a/glass-cup-jsonld-p-555",
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
    `);

    expect(parsed.title).toBe("Brand A Glass Cup");
    expect(parsed.brand).toBe("Brand A");
    expect(parsed.category).toBe("Bardak");
    expect(parsed.descriptionRaw).toBe("Sample product description");
    expect(parsed.attributes).toEqual([{ key: "Materyal", value: "Cam" }]);
    expect(parsed.images).toEqual(["https://cdn.example.com/cup-1.jpg"]);
    expect(parsed.price).toBe(8900);
    expect(parsed.variants).toEqual([
      expect.objectContaining({
        variantKey: "976599742",
        option1: null,
        stockState: "IN_STOCK",
        price: 8900,
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/brand-a/glass-cup-clear-p-555",
        }),
      }),
    ]);
  });

  it("falls back to envoy root product price when variant price is absent", () => {
    const parsed = parseTrendyolProduct(`
      <!doctype html>
      <html>
        <head>
          <script>
            window["__envoy__PROPS"] = {
              "product": {
                "name": "Stone Mug",
                "brand": { "name": "Brand B" },
                "category": { "name": "Mug" },
                "price": {
                  "currency": "TRY",
                  "discountedPrice": {
                    "value": 129.99,
                    "text": "129,99 TL"
                  },
                  "sellingPrice": {
                    "value": 129.99,
                    "text": "129,99 TL"
                  }
                },
                "variants": [
                  {
                    "itemNumber": 554433221,
                    "attributeBeautifiedValue": "Bej",
                    "url": "/brand-b/stone-mug-bej-p-777",
                    "inStock": true,
                    "isSelected": true
                  }
                ]
              }
            };
          </script>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              "name": "Brand B Stone Mug",
              "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "price": 34.99,
                "priceCurrency": "TRY"
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `);

    expect(parsed.title).toBe("Brand B Stone Mug");
    expect(parsed.price).toBe(12999);
    expect(parsed.variants).toEqual([
      expect.objectContaining({
        variantKey: "554433221",
        option1: "Bej",
        price: 12999,
        rawPayload: expect.objectContaining({
          url: "https://www.trendyol.com/brand-b/stone-mug-bej-p-777",
        }),
      }),
    ]);
  });

  it("prefers merchant winner basket price over mismatched product variant price", () => {
    const parsed = parseTrendyolProduct(`
      <!doctype html>
      <html>
        <head>
          <script>
            window["__envoy__PROPS"] = {
              "product": {
                "name": "Boğumlu Kahve Bardağı, Borosilikat Sunum Bardağı, Isı Dayanıklı Bardak (350 ML) Bubblecup",
                "brand": { "name": "ERKUGO" },
                "category": { "name": "Bardak" },
                "images": [
                  "https://cdn.dsmcdn.com/ty1827/prod/QC_ENRICHMENT/20260219/13/c4141ef6-e97e-3c27-a6b1-36ef19abc2d5/1_org_zoom.jpg",
                  "https://cdn.dsmcdn.com/web/production/product-placeholder-v2.jpeg"
                ],
                "merchantListing": {
                  "promotions": [
                    {
                      "name": "Ev Ürünlerinde %5 İndirim",
                      "promotionDiscountType": "DiscountOnBasket",
                      "isApplied": true
                    }
                  ],
                  "winnerVariant": {
                    "itemNumber": 1163720857,
                    "listingId": "9ad1cca345ca741498097c8c78d66d7f",
                    "barcode": "EKG-Bubblecup",
                    "price": {
                      "currency": "TRY",
                      "discountedPrice": { "value": 47.4, "text": "47,40 TL" },
                      "sellingPrice": { "value": 49.9, "text": "49,90 TL" },
                      "originalPrice": { "value": 49.9, "text": "49,90 TL" },
                      "couponApplicablePrice": { "value": 47.4, "text": "47,40 TL" },
                      "tyPlusCouponApplicablePrice": { "value": 46.8, "text": "46,80 TL" }
                    },
                    "inStock": true
                  },
                  "variants": [
                    {
                      "itemNumber": 1163720857,
                      "listingId": "9ad1cca345ca741498097c8c78d66d7f",
                      "barcode": "EKG-Bubblecup",
                      "isSelected": true,
                      "inStock": true
                    }
                  ]
                },
                "variants": [
                  {
                    "itemNumber": 1163720857,
                    "barcode": "EKG-Bubblecup",
                    "isSelected": true,
                    "inStock": true,
                    "price": {
                      "value": 123.4,
                      "text": "123,40 TL"
                    }
                  }
                ]
              }
            };
          </script>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              "name": "ERKUGO Bubblecup",
              "offers": {
                "@type": "Offer",
                "availability": "https://schema.org/InStock",
                "price": 34.99,
                "priceCurrency": "TRY"
              }
            }
          </script>
        </head>
        <body></body>
      </html>
    `);

    expect(parsed.title).toBe("ERKUGO Boğumlu Kahve Bardağı, Borosilikat Sunum Bardağı, Isı Dayanıklı Bardak (350 ML) Bubblecup");
    expect(parsed.price).toBe(4680);
    expect(parsed.variants).toEqual([
      expect.objectContaining({
        variantKey: "1163720857",
        price: 4680,
      }),
    ]);
  });

  it("throws a typed parse error for unavailable products", () => {
    expect(() => parseTrendyolProduct(readFixture("product-unavailable.html"))).toThrowError(ParseError);
  });
});
