import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import type { ParsedProduct, ParsedVariant } from "../../modules/scraping/parseTrendyolProduct";
import { runWithWriteRetry } from "../runWithWriteRetry";
import { productCurrentState, products, productVariants } from "../schema";

function withOptionalOwnerClause(base: string, ownerKey?: OwnerKey) {
  if (!ownerKey) {
    return { query: base, values: [] as unknown[] };
  }

  return {
    query: `${base} and owner_key = ?`,
    values: [ownerKey] as unknown[],
  };
}

export function createProductsRepo(db: D1Database) {
  return {
    db,
    tables: {
      products,
      productVariants,
      productCurrentState,
    },
    async getTrackedProduct(productId: string, ownerKey?: OwnerKey) {
      const base = `select id, owner_key as ownerKey
        from products
        where id = ?
          and deleted_at is null`;
      const withOwner = withOptionalOwnerClause(base, ownerKey);

      return db
        .prepare(`${withOwner.query} limit 1`)
        .bind(productId, ...withOwner.values)
        .first<{ id: string; ownerKey: OwnerKey }>();
    },
    async getRefreshSnapshot(productId: string, ownerKey?: OwnerKey) {
      const base = `select id, owner_key as ownerKey, trendyol_url as trendyolUrl, parse_status as parseStatus,
              title, description_raw as descriptionRaw, images_raw as imagesRaw
       from products
       where id = ?
         and deleted_at is null`;
      const withOwner = withOptionalOwnerClause(base, ownerKey);

      const product = await db
        .prepare(`${withOwner.query} limit 1`)
        .bind(productId, ...withOwner.values)
        .first<{
          id: string;
          ownerKey: OwnerKey;
          trendyolUrl: string;
          parseStatus: string;
          title: string | null;
          descriptionRaw: string | null;
          imagesRaw: string | null;
        }>();

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
    async getTrackingSummary(ownerKey: OwnerKey) {
      const tracked = await db
        .prepare("select count(*) as count from products where owner_key = ? and deleted_at is null")
        .bind(ownerKey)
        .first<{ count: number }>();
      const reviewNeeded = await db
        .prepare("select count(*) as count from products where owner_key = ? and deleted_at is null and parse_status = ?")
        .bind(ownerKey, "REVIEW_NEEDED")
        .first<{ count: number }>();
      const active = await db
        .prepare("select count(*) as count from products where owner_key = ? and deleted_at is null and status = ?")
        .bind(ownerKey, "ACTIVE")
        .first<{ count: number }>();

      return {
        trackedCount: tracked?.count ?? 0,
        activeCount: active?.count ?? 0,
        reviewNeededCount: reviewNeeded?.count ?? 0,
      };
    },
    async listTrackedProductIds(ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select id
           from products
           where owner_key = ? and deleted_at is null
           order by created_at asc`,
        )
        .bind(ownerKey)
        .all<{ id: string }>();

      return result.results.map((item) => item.id);
    },
    async listTrackedProductIdsForScheduler() {
      const result = await db
        .prepare(
          `select id
           from products
           where deleted_at is null and status = 'ACTIVE'
           order by created_at asc`,
        )
        .all<{ id: string }>();

      return result.results.map((item) => item.id);
    },
    async listFailedRunProductIds(runId: string, ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select items.product_id as productId
           from manual_refresh_run_items items
           join manual_refresh_runs runs on runs.id = items.run_id
           where items.run_id = ?
             and runs.owner_key = ?
             and items.status = 'FAILED'
           order by items.created_at asc`,
        )
        .bind(runId, ownerKey)
        .all<{ productId: string }>();

      return result.results.map((item) => item.productId);
    },
    async getProductImageSnapshot(ownerKey: OwnerKey, productId: string) {
      const product = await db
        .prepare(
          `select title, images_raw as imagesRaw
           from products
           where id = ?
             and owner_key = ?
             and deleted_at is null
           limit 1`,
        )
        .bind(productId, ownerKey)
        .first<{
          title: string | null;
          imagesRaw: string | null;
        }>();

      if (!product) {
        return null;
      }

      return product;
    },
    async listTrackingCards(
      ownerKey: OwnerKey,
      filters: {
        status?: string | null;
        parseStatus?: string | null;
        search?: string | null;
        favorite?: boolean;
        categoryId?: string | "uncategorized" | null;
      } = {},
    ) {
      const clauses: string[] = ["p.owner_key = ?", "p.deleted_at is null"];
      const values: unknown[] = [ownerKey];

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

      if (filters.favorite !== undefined) {
        clauses.push("p.is_favorite = ?");
        values.push(filters.favorite ? 1 : 0);
      }

      if (filters.categoryId === "uncategorized") {
        clauses.push("p.user_category_id is null");
      } else if (filters.categoryId) {
        clauses.push("p.user_category_id = ?");
        values.push(filters.categoryId);
      }

      const where = clauses.length > 0 ? `where ${clauses.join(" and ")}` : "";
      const result = await db
        .prepare(
          `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.title, p.brand, p.status, p.parse_status as parseStatus,
                  p.images_raw as imagesRaw, p.is_favorite as isFavorite, p.deleted_at as deletedAt,
                  p.user_category_id as userCategoryId, pc.name as userCategoryName,
                  pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
                  pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
                  pcs.last_checked_at as lastCheckedAt
           from products p
           left join product_current_state pcs on pcs.product_id = p.id
           left join product_categories pc on pc.id = p.user_category_id and pc.owner_key = p.owner_key
           ${where}
           order by coalesce(pcs.last_checked_at, p.updated_at) desc, p.created_at desc`,
        )
        .bind(...values)
        .all<{
          id: string;
          ownerKey: OwnerKey;
          trendyolUrl: string;
          title: string | null;
          brand: string | null;
          status: string;
          parseStatus: string;
          imagesRaw: string | null;
          isFavorite: number | boolean | null;
          deletedAt: number | null;
          userCategoryId: string | null;
          userCategoryName: string | null;
          currentPrice: number | null;
          minPrice: number | null;
          maxPrice: number | null;
          inStockVariantCount: number | null;
          totalVariantCount: number | null;
          lastCheckedAt: number | null;
        }>();

      return result.results.map((item) => ({
        ...item,
        isFavorite: Boolean(item.isFavorite),
        userCategory:
          item.userCategoryId && item.userCategoryName
            ? {
                id: item.userCategoryId,
                name: item.userCategoryName,
              }
            : null,
      }));
    },
    async listTrashCards(ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select id, owner_key as ownerKey, trendyol_url as trendyolUrl, title, brand, status, parse_status as parseStatus,
                  images_raw as imagesRaw, is_favorite as isFavorite, deleted_at as deletedAt,
                  null as currentPrice, null as minPrice, null as maxPrice,
                  null as inStockVariantCount, null as totalVariantCount, null as lastCheckedAt
           from products
           where owner_key = ?
             and deleted_at is not null
           order by deleted_at desc, created_at desc`,
        )
        .bind(ownerKey)
        .all<{
          id: string;
          ownerKey: OwnerKey;
          trendyolUrl: string;
          title: string | null;
          brand: string | null;
          status: string;
          parseStatus: string;
          imagesRaw: string | null;
          isFavorite: number | boolean | null;
          deletedAt: number;
          currentPrice: null;
          minPrice: null;
          maxPrice: null;
          inStockVariantCount: null;
          totalVariantCount: null;
          lastCheckedAt: null;
        }>();

      return result.results.map((item) => ({
        ...item,
        isFavorite: Boolean(item.isFavorite),
      }));
    },
    async setFavorite(ownerKey: OwnerKey, productId: string, isFavorite: boolean, now: Date) {
      return runWithWriteRetry(async () => {
        const existing = await db
          .prepare("select id from products where id = ? and owner_key = ? and deleted_at is null limit 1")
          .bind(productId, ownerKey)
          .first<{ id: string }>();

        if (!existing) {
          return null;
        }

        await db
          .prepare("update products set is_favorite = ?, updated_at = ? where id = ?")
          .bind(isFavorite ? 1 : 0, now.getTime(), productId)
          .run();

        return {
          productId,
          isFavorite,
        };
      });
    },
    async getProductDetail(ownerKey: OwnerKey, productId: string) {
      const product = await db
        .prepare(
          `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.source_product_id as sourceProductId, p.title, p.brand, p.category,
                  p.description_raw as descriptionRaw, p.attributes_raw as attributesRaw, p.images_raw as imagesRaw,
                  p.user_category_id as userCategoryId, pc.name as userCategoryName,
                  p.status, p.parse_status as parseStatus, p.last_checked_at as lastCheckedAt,
                  pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
                  pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
                  pcs.last_change_at as lastChangeAt
           from products p
           left join product_current_state pcs on pcs.product_id = p.id
           left join product_categories pc on pc.id = p.user_category_id and pc.owner_key = p.owner_key
           where p.id = ?
             and p.owner_key = ?
             and p.deleted_at is null
           limit 1`,
        )
        .bind(productId, ownerKey)
        .first<{
          id: string;
          ownerKey: OwnerKey;
          trendyolUrl: string;
          sourceProductId: string | null;
          title: string | null;
          brand: string | null;
          category: string | null;
          descriptionRaw: string | null;
          attributesRaw: string | null;
          imagesRaw: string | null;
          userCategoryId: string | null;
          userCategoryName: string | null;
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
    async setUserCategory(ownerKey: OwnerKey, productId: string, categoryId: string | null, now: Date) {
      return runWithWriteRetry(async () => {
        const product = await db
          .prepare(
            `select id
             from products
             where id = ?
               and owner_key = ?
               and deleted_at is null
             limit 1`,
          )
          .bind(productId, ownerKey)
          .first<{ id: string }>();

        if (!product) {
          return null;
        }

        let category: { id: string; name: string } | null = null;
        if (categoryId !== null) {
          category = await db
            .prepare(
              `select id, name
               from product_categories
               where owner_key = ?
                 and id = ?
               limit 1`,
            )
            .bind(ownerKey, categoryId)
            .first<{ id: string; name: string }>();

          if (!category) {
            return null;
          }
        }

        await db
          .prepare(
            `update products
             set user_category_id = ?, updated_at = ?
             where id = ?
               and owner_key = ?
               and deleted_at is null`,
          )
          .bind(categoryId, now.getTime(), productId, ownerKey)
          .run();

        return {
          productId,
          userCategory: category,
        };
      });
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
      ownerKey?: OwnerKey,
    ) {
      await runWithWriteRetry(async () => {
        const productStatement = ownerKey
          ? db
              .prepare(
                `update products
                 set title = ?, brand = ?, category = ?, description_raw = ?, attributes_raw = ?, images_raw = ?,
                     parse_status = ?, last_checked_at = ?, updated_at = ?
                 where id = ? and owner_key = ? and deleted_at is null`,
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
                ownerKey,
              )
          : db
              .prepare(
                `update products
                 set title = ?, brand = ?, category = ?, description_raw = ?, attributes_raw = ?, images_raw = ?,
                     parse_status = ?, last_checked_at = ?, updated_at = ?
                 where id = ? and deleted_at is null`,
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
              );

        const currentStateStatement = db
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
          );

        const statements = [productStatement, currentStateStatement];

        for (const statement of statements) {
          await statement.run();
        }
      });
    },
    async upsertVariants(productId: string, variants: ParsedVariant[], now: Date) {
      for (const variant of variants) {
        await runWithWriteRetry(async () => {
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
            return;
          }

          await db
            .prepare(
              `insert into product_variants (
                id, product_id, variant_key, option_1, option_2, option_3, current_stock_state, current_price, last_seen_at, raw_payload
              )
              select ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
              where exists (select 1 from products where id = ? and deleted_at is null)`,
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
              productId,
            )
            .run();
        });
      }
    },
    async markParseFailure(productId: string, parseStatus: string, now: Date, ownerKey?: OwnerKey) {
      await runWithWriteRetry(async () => {
        if (ownerKey) {
          await db
            .prepare(
              `update products
               set parse_status = ?, last_checked_at = ?, updated_at = ?
               where id = ? and owner_key = ? and deleted_at is null`,
            )
            .bind(parseStatus, now.getTime(), now.getTime(), productId, ownerKey)
            .run();
          return;
        }

        await db
          .prepare(
            `update products
             set parse_status = ?, last_checked_at = ?, updated_at = ?
             where id = ? and deleted_at is null`,
          )
          .bind(parseStatus, now.getTime(), now.getTime(), productId)
          .run();
      });
    },
  };
}
