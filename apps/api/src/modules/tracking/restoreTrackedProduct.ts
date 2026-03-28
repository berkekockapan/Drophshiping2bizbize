import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../../db/runWithWriteRetry";

export async function restoreTrackedProduct(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  now = new Date(),
) {
  return runWithWriteRetry(async () => {
    const existing = await db
      .prepare("select id from products where id = ? and owner_key = ? and deleted_at is not null limit 1")
      .bind(productId, ownerKey)
      .first<{ id: string }>();

    if (!existing) {
      return false;
    }

    const activeDuplicate = await db
      .prepare(
        `select id
         from products
         where owner_key = ?
           and deleted_at is null
           and trendyol_url = (select trendyol_url from products where id = ?)
           and id != ?
         limit 1`,
      )
      .bind(ownerKey, productId, productId)
      .first<{ id: string }>();

    if (activeDuplicate) {
      return false;
    }

    await db
      .prepare("update products set deleted_at = null, deleted_reason = null, updated_at = ? where id = ?")
      .bind(now.getTime(), productId)
      .run();

    return true;
  });
}
