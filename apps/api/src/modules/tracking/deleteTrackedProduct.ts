import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";

export async function deleteTrackedProduct(
  db: D1Database,
  ownerKey: OwnerKey,
  productId: string,
  now = new Date(),
) {
  const existing = await db
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();

  if (!existing) {
    return false;
  }

  await db
    .prepare("update products set deleted_at = ?, deleted_reason = ?, updated_at = ? where id = ?")
    .bind(now.getTime(), "user_deleted", now.getTime(), productId)
    .run();

  return true;
}
