import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";

export interface SourceProductCategoryRecord {
  id: string;
  ownerKey: OwnerKey;
  name: string;
}

export function createSourceProductCategoriesRepo(db: D1Database) {
  const repo = {
    db,
    async normalizeUncategorizedOrder(ownerKey: OwnerKey, now: Date) {
      const rows = (
        await db
          .prepare(
            `select id
             from source_products
             where owner_key = ?
               and deleted_at is null
               and source_category_id is null
             order by sort_order asc, created_at asc, id asc`,
          )
          .bind(ownerKey)
          .all<{ id: string }>()
      ).results;

      await db.batch!(
        rows.map((row, index) =>
          db
            .prepare(
              `update source_products
               set sort_order = ?, updated_at = ?
               where id = ?
                 and owner_key = ?
                 and deleted_at is null`,
            )
            .bind(index, now.getTime(), row.id, ownerKey),
        ),
      );
    },
    async list(ownerKey: OwnerKey) {
      const result = await db
        .prepare(
          `select id, owner_key as ownerKey, name
           from source_product_categories
           where owner_key = ?
           order by lower(trim(name)) asc, created_at asc`,
        )
        .bind(ownerKey)
        .all<SourceProductCategoryRecord>();

      return result.results;
    },
    async get(ownerKey: OwnerKey, categoryId: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from source_product_categories
           where owner_key = ?
             and id = ?
           limit 1`,
        )
        .bind(ownerKey, categoryId)
        .first<SourceProductCategoryRecord>();
    },
    async findByNormalizedName(ownerKey: OwnerKey, normalizedName: string) {
      return db
        .prepare(
          `select id, owner_key as ownerKey, name
           from source_product_categories
           where owner_key = ?
             and lower(trim(name)) = ?
           limit 1`,
        )
        .bind(ownerKey, normalizedName)
        .first<SourceProductCategoryRecord>();
    },
    async create(ownerKey: OwnerKey, name: string, now: Date) {
      const id = crypto.randomUUID();
      await db
        .prepare(
          `insert into source_product_categories (id, owner_key, name, created_at, updated_at)
           values (?, ?, ?, ?, ?)`,
        )
        .bind(id, ownerKey, name, now.getTime(), now.getTime())
        .run();

      return { id, ownerKey, name };
    },
    async rename(ownerKey: OwnerKey, categoryId: string, name: string, now: Date) {
      await db
        .prepare(
          `update source_product_categories
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
            `update source_products
             set source_category_id = null,
                 sort_order = null,
                 updated_at = ?
             where owner_key = ?
               and source_category_id = ?`,
          )
          .bind(now.getTime(), ownerKey, categoryId),
        db
          .prepare(
            `delete from source_product_categories
             where owner_key = ?
               and id = ?`,
          )
          .bind(ownerKey, categoryId),
      ]);

      await repo.normalizeUncategorizedOrder(ownerKey, now);

      return true;
    },
  };

  return repo;
}
