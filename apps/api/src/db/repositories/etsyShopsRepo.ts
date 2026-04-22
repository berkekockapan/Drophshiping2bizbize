import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";
import { etsyShops, productEtsyShops } from "../schema";

export interface EtsyShopRow {
  id: string;
  ownerKey: OwnerKey;
  name: string;
  etsyShopUrl: string;
  description: string | null;
  createdAt: number;
  updatedAt: number;
}

export function createEtsyShopsRepo(db: D1Database) {
  async function ensureSchema() {
    await runWithWriteRetry(async () => {
      await db
        .prepare(
          `create table if not exists etsy_shops (
             id text primary key,
             owner_key text not null check (owner_key in ('berke', 'kaan')),
             name text not null check (length(trim(name)) > 0),
             etsy_shop_url text not null check (length(trim(etsy_shop_url)) > 0),
             description text,
             created_at integer not null,
             updated_at integer not null
           )`,
        )
        .run();

      await db
        .prepare(
          `create unique index if not exists etsy_shops_owner_name_unique
             on etsy_shops(owner_key, lower(trim(name)))`,
        )
        .run();

      await db
        .prepare(
          `create index if not exists etsy_shops_owner_created_idx
             on etsy_shops(owner_key, created_at desc)`,
        )
        .run();

      await db
        .prepare(
          `create table if not exists product_etsy_shops (
             product_id text not null,
             shop_id text not null,
             owner_key text not null check (owner_key in ('berke', 'kaan')),
             created_at integer not null,
             primary key (product_id, shop_id)
           )`,
        )
        .run();

      await db
        .prepare(
          `create index if not exists product_etsy_shops_shop_created_idx
             on product_etsy_shops(shop_id, created_at desc)`,
        )
        .run();

      await db
        .prepare(
          `create index if not exists product_etsy_shops_owner_product_idx
             on product_etsy_shops(owner_key, product_id)`,
        )
        .run();
    });
  }

  return {
    db,
    tables: {
      etsyShops,
      productEtsyShops,
    },
    async listShops(ownerKey: OwnerKey) {
      await ensureSchema();
      const result = await db
        .prepare(
          `select s.id, s.owner_key as ownerKey, s.name, s.etsy_shop_url as etsyShopUrl, s.description,
                  s.created_at as createdAt, s.updated_at as updatedAt,
                  count(p.id) as productCount
           from etsy_shops s
           left join product_etsy_shops ps on ps.shop_id = s.id and ps.owner_key = s.owner_key
           left join products p on p.id = ps.product_id and p.owner_key = s.owner_key
           where s.owner_key = ?
           group by s.id
           order by s.created_at desc, s.name asc`,
        )
        .bind(ownerKey)
        .all<EtsyShopRow & { productCount: number }>();

      return result.results;
    },
    async getShop(ownerKey: OwnerKey, shopId: string) {
      await ensureSchema();
      return db
        .prepare(
          `select id, owner_key as ownerKey, name, etsy_shop_url as etsyShopUrl, description,
                  created_at as createdAt, updated_at as updatedAt
           from etsy_shops
           where id = ?
             and owner_key = ?
           limit 1`,
        )
        .bind(shopId, ownerKey)
        .first<EtsyShopRow>();
    },
    async createShop(
      ownerKey: OwnerKey,
      input: {
        name: string;
        etsyShopUrl: string;
        description: string | null;
      },
      now: Date,
    ) {
      await ensureSchema();
      const id = crypto.randomUUID();
      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into etsy_shops (
              id, owner_key, name, etsy_shop_url, description, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(id, ownerKey, input.name, input.etsyShopUrl, input.description, now.getTime(), now.getTime())
          .run();
      });

      return this.getShop(ownerKey, id);
    },
    async listProductShops(ownerKey: OwnerKey, productId: string) {
      await ensureSchema();
      const result = await db
        .prepare(
          `select s.id, s.owner_key as ownerKey, s.name, s.etsy_shop_url as etsyShopUrl, s.description,
                  s.created_at as createdAt, s.updated_at as updatedAt,
                  ps.created_at as assignedAt
           from product_etsy_shops ps
           join etsy_shops s on s.id = ps.shop_id and s.owner_key = ps.owner_key
           join products p on p.id = ps.product_id and p.owner_key = ps.owner_key
           where ps.owner_key = ?
             and ps.product_id = ?
             and p.deleted_at is null
           order by ps.created_at asc, s.name asc`,
        )
        .bind(ownerKey, productId)
        .all<(EtsyShopRow & { assignedAt: number })>();

      return result.results;
    },
    async listShopIdsForProduct(ownerKey: OwnerKey, productId: string) {
      await ensureSchema();
      const result = await db
        .prepare(
          `select shop_id as shopId
           from product_etsy_shops
           where owner_key = ?
             and product_id = ?
           order by created_at asc`,
        )
        .bind(ownerKey, productId)
        .all<{ shopId: string }>();

      return result.results.map((item) => item.shopId);
    },
    async listTrackingCardsForShop(ownerKey: OwnerKey, shopId: string) {
      await ensureSchema();
      const result = await db
        .prepare(
          `select p.id, p.owner_key as ownerKey, p.trendyol_url as trendyolUrl, p.source_product_id as sourceProductId,
                  p.title, p.brand, p.status, p.parse_status as parseStatus,
                  p.images_raw as imagesRaw, p.is_favorite as isFavorite, p.deleted_at as deletedAt,
                  p.user_category_id as userCategoryId, pc.name as userCategoryName,
                  pcs.current_price as currentPrice, pcs.min_price as minPrice, pcs.max_price as maxPrice,
                  pcs.in_stock_variant_count as inStockVariantCount, pcs.total_variant_count as totalVariantCount,
                  pcs.last_checked_at as lastCheckedAt
           from product_etsy_shops ps
           join products p on p.id = ps.product_id and p.owner_key = ps.owner_key
           left join product_current_state pcs on pcs.product_id = p.id
           left join product_categories pc on pc.id = p.user_category_id and pc.owner_key = p.owner_key
           where ps.owner_key = ?
             and ps.shop_id = ?
             and p.deleted_at is null
           order by coalesce(pcs.last_checked_at, p.updated_at) desc, p.created_at desc`,
        )
        .bind(ownerKey, shopId)
        .all<{
          id: string;
          ownerKey: OwnerKey;
          trendyolUrl: string;
          sourceProductId: string | null;
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
      }));
    },
    async validateShopIds(ownerKey: OwnerKey, shopIds: string[]) {
      await ensureSchema();
      if (shopIds.length === 0) {
        return [];
      }

      const placeholders = shopIds.map(() => "?").join(", ");
      const result = await db
        .prepare(
          `select id, owner_key as ownerKey, name, etsy_shop_url as etsyShopUrl, description,
                  created_at as createdAt, updated_at as updatedAt
           from etsy_shops
           where owner_key = ?
             and id in (${placeholders})`,
        )
        .bind(ownerKey, ...shopIds)
        .all<EtsyShopRow>();

      return result.results;
    },
    async setProductShops(ownerKey: OwnerKey, productId: string, shopIds: string[], now: Date) {
      await ensureSchema();
      const normalizedShopIds = [...new Set(shopIds)];
      const existingProduct = await db
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

      if (!existingProduct) {
        return null;
      }

      const shops = await this.validateShopIds(ownerKey, normalizedShopIds);
      if (shops.length !== normalizedShopIds.length) {
        return null;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `delete from product_etsy_shops
             where owner_key = ?
               and product_id = ?
               ${normalizedShopIds.length > 0 ? `and shop_id not in (${normalizedShopIds.map(() => "?").join(", ")})` : ""}`,
          )
          .bind(ownerKey, productId, ...normalizedShopIds)
          .run();

        if (normalizedShopIds.length === 0) {
          return;
        }

        for (const shopId of normalizedShopIds) {
          await db
            .prepare(
              `insert or ignore into product_etsy_shops (
                product_id, shop_id, owner_key, created_at
              ) values (?, ?, ?, ?)`,
            )
            .bind(productId, shopId, ownerKey, now.getTime())
            .run();
        }
      });

      return this.listProductShops(ownerKey, productId);
    },
  };
}

