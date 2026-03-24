import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { RefreshProductNotFoundError, processRefreshJob } from "../../src/modules/sync/applyProductRefresh";
import { createTrackedProduct } from "../../src/modules/tracking/createTrackedProduct";
import { deleteTrackedProduct } from "../../src/modules/tracking/deleteTrackedProduct";
import { createTestEnv } from "../support/sqlite";

const basicProductHtml = readFileSync(new URL("../fixtures/trendyol/basic-product.html", import.meta.url), "utf8");
const unavailableProductHtml = readFileSync(new URL("../fixtures/trendyol/product-unavailable.html", import.meta.url), "utf8");
const changedContentHtml = basicProductHtml
  .replace("Oversize Hoodie", "Oversize Hoodie Renewed")
  .replace("Soft brushed cotton hoodie with relaxed fit.", "Soft brushed cotton hoodie with relaxed fit. Yeni sezon kumasi.")
  .replace("hoodie-1.jpg", "hoodie-3.jpg");
const envoyRootPriceHtml = `
  <!doctype html>
  <html>
    <head>
      <script>
        window["__envoy__PROPS"] = {
          "product": {
            "name": "Stone Mug",
            "brand": { "name": "Brand B" },
            "category": { "name": "Mug" },
            "images": ["https://cdn.example.com/mug-1.jpg"],
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
`;
const envoyWinnerPriceHtml = `
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
                  "couponApplicablePrice": { "value": 47.4, "text": "47,40 TL" }
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
`;
const envoyWinnerPriceRaisedHtml = envoyWinnerPriceHtml
  .replaceAll('"value": 49.9', '"value": 59.9')
  .replaceAll('"text": "49,90 TL"', '"text": "59,90 TL"');

describe("processRefreshJob", () => {
  it("writes a NO_CHANGE audit without content rows when tracked fields stay the same", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        source: "MANUAL",
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const audit = sqlite
      .prepare(
        `select source, status, change_count as changeCount
         from product_refresh_audits
         where product_id = ?
         order by created_at desc
         limit 1`,
      )
      .get(seeded.product.id) as { source: string; status: string; changeCount: number } | undefined;
    const contentRows = sqlite
      .prepare("select count(*) as count from product_content_history where product_id = ?")
      .get(seeded.product.id) as { count: number };

    expect(audit).toEqual({ source: "MANUAL", status: "NO_CHANGE", changeCount: 0 });
    expect(contentRows.count).toBe(0);
  });

  it("writes TITLE, DESCRIPTION, and IMAGES history rows only for changed content", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        source: "MANUAL",
        fetchImpl: async () => new Response(changedContentHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const rows = sqlite
      .prepare(
        `select field_key as fieldKey, previous_value_raw as previousValueRaw, new_value_raw as newValueRaw
         from product_content_history
         where product_id = ?
         order by field_key asc`,
      )
      .all(seeded.product.id) as Array<{ fieldKey: string; previousValueRaw: string | null; newValueRaw: string | null }>;

    expect(rows).toEqual([
      {
        fieldKey: "DESCRIPTION",
        previousValueRaw: "Soft brushed cotton hoodie with relaxed fit.",
        newValueRaw: "Soft brushed cotton hoodie with relaxed fit. Yeni sezon kumasi.",
      },
      {
        fieldKey: "IMAGES",
        previousValueRaw: JSON.stringify([
          "https://cdn.example.com/hoodie-1.jpg",
          "https://cdn.example.com/hoodie-2.jpg",
        ]),
        newValueRaw: JSON.stringify([
          "https://cdn.example.com/hoodie-3.jpg",
          "https://cdn.example.com/hoodie-2.jpg",
        ]),
      },
      {
        fieldKey: "TITLE",
        previousValueRaw: "Oversize Hoodie",
        newValueRaw: "Oversize Hoodie Renewed",
      },
    ]);
  });

  it("marks parse failures without deleting the product", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const response = await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () => new Response(unavailableProductHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const product = sqlite
      .prepare("select id, parse_status as parseStatus from products where id = ?")
      .get(seeded.product.id) as { id: string; parseStatus: string };
    const notifications = sqlite
      .prepare("select type, severity from notifications where product_id = ? order by created_at asc")
      .all(seeded.product.id) as Array<{ type: string; severity: string }>;

    expect(product).toEqual({ id: seeded.product.id, parseStatus: "REVIEW_NEEDED" });
    expect(response.product.parseStatus).toBe("REVIEW_NEEDED");
    expect(response.notifications[0].type).toBe("PARSE_ERROR");
    expect(notifications).toEqual([{ type: "PARSE_ERROR", severity: "warning" }]);

    const stillExists = sqlite.prepare("select count(*) as count from products where id = ?").get(seeded.product.id) as { count: number };
    expect(stillExists.count).toBe(1);
  });

  it("updates current price from envoy root product price during refresh", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-123?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const response = await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () => new Response(envoyRootPriceHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const currentState = sqlite
      .prepare("select current_price as currentPrice from product_current_state where product_id = ?")
      .get(seeded.product.id) as { currentPrice: number };
    const product = sqlite
      .prepare("select title, images_raw as imagesRaw from products where id = ?")
      .get(seeded.product.id) as { title: string; imagesRaw: string };

    expect(response.product.parseStatus).toBe("OK");
    expect(response.product.currentPrice).toBe(12999);
    expect(currentState).toEqual({ currentPrice: 12999 });
    expect(product.title).toBe("Brand B Stone Mug");
    expect(product.imagesRaw).toContain("mug-1.jpg");
  });

  it("prefers winner selling price over mismatched product variant price during refresh", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/erkugo/bogumlu-kahve-bardagi-borosilikat-sunum-bardagi-isi-dayanikli-bardak-350-ml-bubblecup-p-859521469" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    const response = await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        fetchImpl: async () => new Response(envoyWinnerPriceHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const currentState = sqlite
      .prepare("select current_price as currentPrice from product_current_state where product_id = ?")
      .get(seeded.product.id) as { currentPrice: number };
    const variant = sqlite
      .prepare("select current_price as currentPrice from product_variants where product_id = ? and variant_key = ? limit 1")
      .get(seeded.product.id, "1163720857") as { currentPrice: number };

    expect(response.product.parseStatus).toBe("OK");
    expect(response.product.currentPrice).toBe(4990);
    expect(currentState).toEqual({ currentPrice: 4990 });
    expect(variant).toEqual({ currentPrice: 4990 });
  });

  it("writes variant price history rows with refresh audit links when a variant price changes", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/erkugo/bogumlu-kahve-bardagi-borosilikat-sunum-bardagi-isi-dayanikli-bardak-350-ml-bubblecup-p-859521469" },
      {
        fetchImpl: async () => new Response(envoyWinnerPriceHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await processRefreshJob(
      env,
      { productId: seeded.product.id },
      {
        source: "MANUAL",
        fetchImpl: async () => new Response(envoyWinnerPriceRaisedHtml, { status: 200 }),
        now: new Date("2026-03-20T01:00:00.000Z"),
      },
    );

    const rows = sqlite
      .prepare(
        `select variant_id as variantId, previous_price as previousPrice, new_price as newPrice, refresh_audit_id as refreshAuditId
         from price_history
         where product_id = ?
         order by changed_at desc`,
      )
      .all(seeded.product.id) as Array<{
      variantId: string | null;
      previousPrice: number | null;
      newPrice: number | null;
      refreshAuditId: string | null;
    }>;

    expect(rows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          variantId: expect.any(String),
          previousPrice: 4990,
          newPrice: 5990,
          refreshAuditId: expect.any(String),
        }),
      ]),
    );
  });

  it("does not recreate child rows when the product is deleted during refresh", async () => {
    const { env, sqlite } = createTestEnv();
    const seeded = await createTrackedProduct(
      env,
      { trendyolUrl: "https://www.trendyol.com/north-apparel/oversize-hoodie-p-456?merchantId=1" },
      {
        fetchImpl: async () => new Response(basicProductHtml, { status: 200 }),
        now: new Date("2026-03-20T00:00:00.000Z"),
      },
    );

    await expect(
      processRefreshJob(
        env,
        { productId: seeded.product.id },
        {
          fetchImpl: async () => {
            await deleteTrackedProduct(env.DB, seeded.product.id);
            return new Response(basicProductHtml, { status: 200 });
          },
          now: new Date("2026-03-20T01:00:00.000Z"),
        },
      ),
    ).rejects.toBeInstanceOf(RefreshProductNotFoundError);

    const counts = {
      products: sqlite.prepare("select count(*) as count from products where id = ?").get(seeded.product.id),
      variants: sqlite.prepare("select count(*) as count from product_variants where product_id = ?").get(seeded.product.id),
      currentState: sqlite.prepare("select count(*) as count from product_current_state where product_id = ?").get(seeded.product.id),
      priceHistory: sqlite.prepare("select count(*) as count from price_history where product_id = ?").get(seeded.product.id),
      stockHistory: sqlite.prepare("select count(*) as count from stock_history where product_id = ?").get(seeded.product.id),
      notifications: sqlite.prepare("select count(*) as count from notifications where product_id = ?").get(seeded.product.id),
    };

    expect(counts).toEqual({
      products: { count: 0 },
      variants: { count: 0 },
      currentState: { count: 0 },
      priceHistory: { count: 0 },
      stockHistory: { count: 0 },
      notifications: { count: 0 },
    });
  });
});
