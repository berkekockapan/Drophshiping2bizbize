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
  return {
    async getParent(ownerKey: OwnerKey, productId: string) {
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
