import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";

export interface ProductCategoryRecord {
  id: string;
  ownerKey: OwnerKey;
  name: string;
}

export function createProductCategoriesRepo(db: D1Database) {
  const repo = {
    db,
    async list(ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
           order by lower(trim(name)) asc, created_at asc`,
        )
        .bind(ownerKey)
        .all<ProductCategoryRecord>();

      return result.results;
    },
    async get(ownerKey: OwnerKey, categoryId: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
             and id = ?
           limit 1`,
        )
        .bind(ownerKey, categoryId)
        .first<ProductCategoryRecord>();
    },
    async findByNormalizedName(ownerKey: OwnerKey, normalizedName: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from product_categories
           where owner_key = ?
             and lower(trim(name)) = ?
           limit 1`,
        )
        .bind(ownerKey, normalizedName)
        .first<ProductCategoryRecord>();
    },
    async create(ownerKey: OwnerKey, name: string, now: Date) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `insert into product_categories (id, owner_key, name, created_at, updated_at)
           values (?, ?, ?, ?, ?)`,
        )
        .bind(id, ownerKey, name, now.getTime(), now.getTime())
        .run();

      return { id, ownerKey, name };
    },
    async rename(ownerKey: OwnerKey, categoryId: string, name: string, now: Date) {
      await db
        .prepare(
          `update product_categories
           set name = ?, updated_at = ?
           where owner_key = ?
             and id = ?`,
        )
        .bind(name, now.getTime(), ownerKey, categoryId)
        .run();

      return repo.get(ownerKey, categoryId);
    },
    async delete(ownerKey: OwnerKey, categoryId: string, now: Date) {
      const existing = await repo.get(ownerKey, categoryId);
      if (!existing) {
        return false;
      }

      await db.batch!([
        db
          .prepare(
            `update products
             set user_category_id = null,
                 updated_at = ?
             where owner_key = ?
               and user_category_id = ?`,
          )
          .bind(now.getTime(), ownerKey, categoryId),
        db
          .prepare(
            `update source_products
             set user_category_id = null,
                 updated_at = ?
             where owner_key = ?
               and user_category_id = ?`,
          )
          .bind(now.getTime(), ownerKey, categoryId),
        db
          .prepare(
            `delete from product_categories
             where owner_key = ?
               and id = ?`,
          )
          .bind(ownerKey, categoryId),
      ]);

      return true;
    },
  };

  return repo;
}
