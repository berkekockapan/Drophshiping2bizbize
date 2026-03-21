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
    async getTrackingSummary() {
      const tracked = await db.prepare("select count(*) as count from products").first<{ count: number }>();
      const reviewNeeded = await db
        .prepare("select count(*) as count from products where parse_status = ?")
        .bind("REVIEW_NEEDED")
        .first<{ count: number }>();
      const active = await db
        .prepare("select count(*) as count from products where status = ?")
        .bind("ACTIVE")
        .first<{ count: number }>();

      return {
        trackedCount: tracked?.count ?? 0,
        activeCount: active?.count ?? 0,
        reviewNeededCount: reviewNeeded?.count ?? 0,
      };
    },
    async listTrackingCards(
      filters: { status?: string | null; parseStatus?: string | null; search?: string | null; favorite?: boolean | null } = {},
    ) {
      const clauses: string[] = [];
      const values: unknown[] = [];

      if (filters.status) {
        clauses.push("p.status = ?");
        values.push(filters.status);
      }

      if (filters.parseStatus) {
        clauses.push("p.parse_status = ?");
        values.push(filters.parseStatus);
      }

      if (filters.search) {
        clauses.push("(p.title like ? or p.brand like ?)");
        values.push(`%${filters.search}%`, `%${filters.search}%`);
      }

      if (filters.favorite !== undefined && filters.favorite !== null) {
        clauses.push("p.is_favorite = ?");
        values.push(filters.favorite);
      }

      const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
      const result = await db
        .prepare(
          `select p.id, p.trendyol_url as trendyolUrl, p.title, p.brand, p.status, p.parse_status as parseStatus,
                  p.images_raw as imagesRaw, p.is_favorite as isFavorite,
                  pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
                  pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
                  pcs.last_checked_at as lastCheckedAt
           from products p
           left join product_current_state pcs on pcs.product_id = p.id
           ${where}
           order by coalesce(pcs.last_checked_at, p.updated_at) desc, p.created_at desc`,
        )
        .bind(...values)
        .all<{
          id: string;
          trendyolUrl: string;
          title: string | null;
          brand: string | null;
          status: string;
          parseStatus: string;
          imagesRaw: string | null;
          isFavorite: number | boolean;
          currentPrice: number | null;
          minPrice: number | null;
          maxPrice: number | null;
          inStockVariantCount: number | null;
          totalVariantCount: number | null;
          lastCheckedAt: number | null;
        }>();

      return result.results;
    },
    async getTrackedProduct(productId: string) {
      return db
        .prepare(
          `select id, is_favorite as isFavorite
           from products
           where id = ?
           limit 1`,
        )
        .bind(productId)
        .first<{ id: string; isFavorite: number | boolean }>();
    },
    async setTrackedProductFavorite(productId: string, isFavorite: boolean, now: Date) {
      await db
        .prepare(
          `update products
           set is_favorite = ?, updated_at = ?
           where id = ?`,
        )
        .bind(isFavorite, now.getTime(), productId)
        .run();
    },
    async deleteTrackedProduct(productId: string) {
      await db.prepare("delete from product_variants where product_id = ?").bind(productId).run();
      await db.prepare("delete from product_current_state where product_id = ?").bind(productId).run();
      await db.prepare("delete from price_history where product_id = ?").bind(productId).run();
      await db.prepare("delete from stock_history where product_id = ?").bind(productId).run();
      await db.prepare("delete from notifications where product_id = ?").bind(productId).run();
      await db.prepare("delete from etsy_drafts where product_id = ?").bind(productId).run();
      await db.prepare("delete from products where id = ?").bind(productId).run();
    },
    async getProductDetail(productId: string) {
      const product = await db
        .prepare(
          `select p.id, p.trendyol_url as trendyolUrl, p.source_product_id as sourceProductId, p.title, p.brand, p.category,
                  p.description_raw as descriptionRaw, p.attributes_raw as attributesRaw, p.images_raw as imagesRaw,
                  p.status, p.parse_status as parseStatus, p.last_checked_at as lastCheckedAt,
                  pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
                  pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
                  pcs.last_change_at as lastChangeAt
           from products p
           left join product_current_state pcs on pcs.product_id = p.id
           where p.id = ?
           limit 1`,
        )
        .bind(productId)
        .first<{
          id: string;
          trendyolUrl: string;
          sourceProductId: string | null;
          title: string | null;
          brand: string | null;
          category: string | null;
          descriptionRaw: string | null;
          attributesRaw: string | null;
          imagesRaw: string | null;
          status: string;
          parseStatus: string;
          lastCheckedAt: number | null;
          currentPrice: number | null;
          minPrice: number | null;
          maxPrice: number | null;
          inStockVariantCount: number | null;
          totalVariantCount: number | null;
          lastChangeAt: number | null;
        }>();

      if (!product) {
        return null;
      }

      const variants = (
        await db
          .prepare(
            `select id, variant_key as variantKey, option_1 as option1, option_2 as option2, option_3 as option3,
                    current_stock_state as currentStockState, current_price as currentPrice, last_seen_at as lastSeenAt,
                    raw_payload as rawPayload
             from product_variants
             where product_id = ?
             order by option_1 asc, option_2 asc, option_3 asc, variant_key asc`,
          )
          .bind(productId)
          .all<{
            id: string;
            variantKey: string;
            option1: string | null;
            option2: string | null;
            option3: string | null;
            currentStockState: string;
            currentPrice: number | null;
            lastSeenAt: number | null;
            rawPayload: string | null;
          }>()
      ).results;

      return {
        product,
        currentState: {
          currentPrice: product.currentPrice,
          minPrice: product.minPrice,
          maxPrice: product.maxPrice,
          inStockVariantCount: product.inStockVariantCount ?? 0,
          totalVariantCount: product.totalVariantCount ?? 0,
          lastChangeAt: product.lastChangeAt,
          lastCheckedAt: product.lastCheckedAt,
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
