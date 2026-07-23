import type { D1Database } from "../../config/bindings";
import type { OwnerKey } from "../../contracts/owners";
import { runWithWriteRetry } from "../runWithWriteRetry";

export interface ProductLinkedVariantRecord {
  id: string;
  parentProductId: string;
  ownerKey: OwnerKey;
  trendyolUrl: string;
  trendyolUrlNormalized: string;
  sourceProductId: string | null;
  title: string;
  brand: string | null;
  descriptionRaw: string | null;
  attributesRaw: string;
  imagesRaw: string;
  currentPrice: number | null;
  currentStockState: "IN_STOCK" | "OUT_OF_STOCK";
  lastCheckedAt: number;
  createdAt: number;
  updatedAt: number;
}

export function createProductLinkedVariantsRepo(db: D1Database) {
  async function ensureSchema() {
    await runWithWriteRetry(async () => {
      await db
        .prepare(
          `create table if not exists product_linked_variants (
             id text primary key,
             parent_product_id text not null,
             owner_key text not null check (owner_key in ('berke', 'kaan')),
             trendyol_url text not null,
             trendyol_url_normalized text not null,
             source_product_id text,
             title text not null,
             brand text,
             description_raw text,
             attributes_raw text,
             images_raw text,
             current_price integer,
             current_stock_state text not null,
             last_checked_at integer not null,
             created_at integer not null default (unixepoch() * 1000),
             updated_at integer not null default (unixepoch() * 1000)
           )`,
        )
        .run();

      await db
        .prepare(
          `create unique index if not exists product_linked_variants_owner_url_unique
             on product_linked_variants (owner_key, trendyol_url_normalized)`,
        )
        .run();

      await db
        .prepare(
          `create index if not exists product_linked_variants_parent_created_idx
             on product_linked_variants (parent_product_id, created_at desc)`,
        )
        .run();

      await db
        .prepare(
          `create index if not exists product_linked_variants_owner_parent_idx
             on product_linked_variants (owner_key, parent_product_id)`,
        )
        .run();
    });
  }

  return {
    async getParent(ownerKey: OwnerKey, productId: string) {
      await ensureSchema();
      return db
        .prepare(
          `select id, trendyol_url as trendyolUrl
           from products
           where id = ? and owner_key = ? and deleted_at is null
           limit 1`,
        )
        .bind(productId, ownerKey)
        .first<{ id: string; trendyolUrl: string }>();
    },

    async findByNormalizedUrl(ownerKey: OwnerKey, trendyolUrlNormalized: string) {
      await ensureSchema();
      return db
        .prepare(
          `select id, parent_product_id as parentProductId
           from product_linked_variants
           where owner_key = ? and trendyol_url_normalized = ?
           limit 1`,
        )
        .bind(ownerKey, trendyolUrlNormalized)
        .first<{ id: string; parentProductId: string }>();
    },

    async create(input: ProductLinkedVariantRecord) {
      await ensureSchema();
      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into product_linked_variants (
              id, parent_product_id, owner_key, trendyol_url, trendyol_url_normalized, source_product_id,
              title, brand, description_raw, attributes_raw, images_raw, current_price, current_stock_state,
              last_checked_at, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.id,
            input.parentProductId,
            input.ownerKey,
            input.trendyolUrl,
            input.trendyolUrlNormalized,
            input.sourceProductId,
            input.title,
            input.brand,
            input.descriptionRaw,
            input.attributesRaw,
            input.imagesRaw,
            input.currentPrice,
            input.currentStockState,
            input.lastCheckedAt,
            input.createdAt,
            input.updatedAt,
          )
          .run();
      });

      return input;
    },

    async listByParent(ownerKey: OwnerKey, parentProductId: string) {
      await ensureSchema();
      const rows = await db
        .prepare(
          `select v.id, v.parent_product_id as parentProductId, v.owner_key as ownerKey,
                  v.trendyol_url as trendyolUrl, v.trendyol_url_normalized as trendyolUrlNormalized,
                  v.source_product_id as sourceProductId, v.title, v.brand, v.description_raw as descriptionRaw,
                  v.attributes_raw as attributesRaw, v.images_raw as imagesRaw, v.current_price as currentPrice,
                  v.current_stock_state as currentStockState, v.last_checked_at as lastCheckedAt,
                  v.created_at as createdAt, v.updated_at as updatedAt
           from product_linked_variants v
           join products p on p.id = v.parent_product_id and p.owner_key = v.owner_key
           where v.owner_key = ? and v.parent_product_id = ? and p.deleted_at is null
           order by v.created_at desc`,
        )
        .bind(ownerKey, parentProductId)
        .all<ProductLinkedVariantRecord>();

      return rows.results;
    },

    async delete(ownerKey: OwnerKey, parentProductId: string, linkedVariantId: string) {
      await ensureSchema();
      const existing = await db
        .prepare(
          `select id
           from product_linked_variants
           where id = ? and parent_product_id = ? and owner_key = ?
           limit 1`,
        )
        .bind(linkedVariantId, parentProductId, ownerKey)
        .first<{ id: string }>();

      if (!existing) {
        return false;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `delete from product_linked_variants
             where id = ? and parent_product_id = ? and owner_key = ?`,
          )
          .bind(linkedVariantId, parentProductId, ownerKey)
          .run();
      });

      return true;
    },
  };
}
