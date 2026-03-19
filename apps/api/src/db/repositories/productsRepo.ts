import type { ParsedProduct, ParsedVariant } from "../../modules/scraping/parseTrendyolProduct";
import type { D1Database } from "../../config/bindings";
import { productCurrentState, products, productVariants } from "../schema";

export function createProductsRepo(db: D1Database) {
  return {
    db,
    tables: {
      products,
      productVariants,
      productCurrentState,
    },
    async getRefreshSnapshot(productId: string) {
      const product = await db
        .prepare(
          `select id, trendyol_url as trendyolUrl, parse_status as parseStatus
           from products
           where id = ?
           limit 1`,
        )
        .bind(productId)
        .first<{ id: string; trendyolUrl: string; parseStatus: string }>();

      if (!product) {
        return null;
      }

      const currentState = await db
        .prepare(
          `select current_price as currentPrice, min_price as minPrice, max_price as maxPrice,
                  last_change_at as lastChangeAt, last_checked_at as lastCheckedAt
           from product_current_state
           where product_id = ?`,
        )
        .bind(productId)
        .first<{
          currentPrice: number | null;
          minPrice: number | null;
          maxPrice: number | null;
          lastChangeAt: number | null;
          lastCheckedAt: number | null;
        }>();

      const variants = (
        await db
          .prepare(
            `select id, variant_key as variantKey, option_1 as option1, option_2 as option2, option_3 as option3,
                    current_stock_state as currentStockState, current_price as currentPrice
             from product_variants
             where product_id = ?
             order by variant_key asc`,
          )
          .bind(productId)
          .all<{
            id: string;
            variantKey: string;
            option1: string | null;
            option2: string | null;
            option3: string | null;
            currentStockState: "IN_STOCK" | "OUT_OF_STOCK";
            currentPrice: number | null;
          }>()
      ).results;

      return {
        ...product,
        currentState: currentState ?? {
          currentPrice: null,
          minPrice: null,
          maxPrice: null,
          lastChangeAt: null,
          lastCheckedAt: null,
        },
        variants,
      };
    },
    async updateProductSnapshot(
      productId: string,
      parsed: ParsedProduct,
      currentState: {
        currentPrice: number;
        minPrice: number;
        maxPrice: number;
        inStockVariantCount: number;
        totalVariantCount: number;
        lastChangeAt: number | null;
        lastCheckedAt: number;
      },
      now: Date,
    ) {
      await db
        .prepare(
          `update products
           set title = ?, brand = ?, category = ?, description_raw = ?, attributes_raw = ?, images_raw = ?,
               parse_status = ?, last_checked_at = ?, updated_at = ?
           where id = ?`,
        )
        .bind(
          parsed.title,
          parsed.brand,
          parsed.category,
          parsed.descriptionRaw,
          JSON.stringify(parsed.attributes),
          JSON.stringify(parsed.images),
          "OK",
          now.getTime(),
          now.getTime(),
          productId,
        )
        .run();

      await db
        .prepare(
          `update product_current_state
           set current_price = ?, min_price = ?, max_price = ?, in_stock_variant_count = ?, total_variant_count = ?,
               last_change_at = ?, last_checked_at = ?
           where product_id = ?`,
        )
        .bind(
          currentState.currentPrice,
          currentState.minPrice,
          currentState.maxPrice,
          currentState.inStockVariantCount,
          currentState.totalVariantCount,
          currentState.lastChangeAt,
          currentState.lastCheckedAt,
          productId,
        )
        .run();
    },
    async upsertVariants(productId: string, variants: ParsedVariant[], now: Date) {
      for (const variant of variants) {
        const existing = await db
          .prepare("select id from product_variants where product_id = ? and variant_key = ? limit 1")
          .bind(productId, variant.variantKey)
          .first<{ id: string }>();

        if (existing) {
          await db
            .prepare(
              `update product_variants
               set option_1 = ?, option_2 = ?, option_3 = ?, current_stock_state = ?, current_price = ?, last_seen_at = ?, raw_payload = ?
               where id = ?`,
            )
            .bind(
              variant.option1,
              variant.option2,
              variant.option3,
              variant.stockState,
              variant.price,
              now.getTime(),
              JSON.stringify(variant.rawPayload),
              existing.id,
            )
            .run();
        } else {
          await db
            .prepare(
              `insert into product_variants (
                id, product_id, variant_key, option_1, option_2, option_3, current_stock_state, current_price, last_seen_at, raw_payload
              ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              crypto.randomUUID(),
              productId,
              variant.variantKey,
              variant.option1,
              variant.option2,
              variant.option3,
              variant.stockState,
              variant.price,
              now.getTime(),
              JSON.stringify(variant.rawPayload),
            )
            .run();
        }
      }
    },
    async markParseFailure(productId: string, parseStatus: string, now: Date) {
      await db
        .prepare(
          `update products
           set parse_status = ?, last_checked_at = ?, updated_at = ?
           where id = ?`,
        )
        .bind(parseStatus, now.getTime(), now.getTime(), productId)
        .run();
    },
  };
}
