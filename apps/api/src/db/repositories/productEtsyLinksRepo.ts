import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

export interface ProductEtsyLinkRecord {
  id: string;
  productId: string;
  ownerKey: OwnerKey;
  etsyUrl: string;
  etsyUrlNormalized: string;
  etsyListingId: string | null;
  createdAt: number;
}

export function createProductEtsyLinksRepo(db: D1Database) {
  return {
    async findByNormalizedUrl(ownerKey: OwnerKey, etsyUrlNormalized: string) {
      return db
        .prepare(
          `select id, product_id as productId
           from product_etsy_links
           where owner_key = ? and etsy_url_normalized = ?
           limit 1`,
        )
        .bind(ownerKey, etsyUrlNormalized)
        .first<{ id: string; productId: string }>();
    },

    async create(input: ProductEtsyLinkRecord) {
      const product = await db
        .prepare(
          `select id
           from products
           where id = ? and owner_key = ? and deleted_at is null
           limit 1`,
        )
        .bind(input.productId, input.ownerKey)
        .first<{ id: string }>();

      if (!product) {
        return null;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into product_etsy_links (
              id, product_id, owner_key, etsy_url, etsy_url_normalized, etsy_listing_id, created_at
            ) values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.id,
            input.productId,
            input.ownerKey,
            input.etsyUrl,
            input.etsyUrlNormalized,
            input.etsyListingId,
            input.createdAt,
          )
          .run();
      });

      return input;
    },

    async listForProducts(ownerKey: OwnerKey, productIds: string[]) {
      const linksByProductId = new Map<string, ProductEtsyLinkRecord[]>();
      if (productIds.length === 0) {
        return linksByProductId;
      }

      const placeholders = productIds.map(() => "?").join(", ");
      const rows = await db
        .prepare(
          `select l.id, l.product_id as productId, l.owner_key as ownerKey, l.etsy_url as etsyUrl,
                  l.etsy_url_normalized as etsyUrlNormalized, l.etsy_listing_id as etsyListingId,
                  l.created_at as createdAt
           from product_etsy_links l
           join products p on p.id = l.product_id and p.owner_key = l.owner_key
           where l.owner_key = ? and p.deleted_at is null and l.product_id in (${placeholders})
           order by l.created_at desc`,
        )
        .bind(ownerKey, ...productIds)
        .all<ProductEtsyLinkRecord>();

      for (const row of rows.results) {
        const links = linksByProductId.get(row.productId) ?? [];
        links.push(row);
        linksByProductId.set(row.productId, links);
      }

      return linksByProductId;
    },

    async delete(ownerKey: OwnerKey, productId: string, etsyLinkId: string) {
      const existing = await db
        .prepare(
          `select id
           from product_etsy_links
           where owner_key = ? and product_id = ? and id = ?
           limit 1`,
        )
        .bind(ownerKey, productId, etsyLinkId)
        .first<{ id: string }>();

      if (!existing) {
        return false;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare("delete from product_etsy_links where owner_key = ? and product_id = ? and id = ?")
          .bind(ownerKey, productId, etsyLinkId)
          .run();
      });

      return true;
    },
  };
}
