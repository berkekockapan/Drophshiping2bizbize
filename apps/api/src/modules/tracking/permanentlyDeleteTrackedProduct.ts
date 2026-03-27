import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";

const deleteStatements = [
  ["product_variants", "product_id"],
  ["product_current_state", "product_id"],
  ["price_history", "product_id"],
  ["stock_history", "product_id"],
  ["product_refresh_audits", "product_id"],
  ["product_content_history", "product_id"],
  ["notifications", "product_id"],
  ["etsy_drafts", "product_id"],
  ["manual_refresh_run_items", "product_id"],
] as const;

export async function permanentlyDeleteTrackedProduct(db: D1Database, ownerKey: OwnerKey, productId: string) {
  const existing = await db
    .prepare("select id from products where id = ? and owner_key = ? and deleted_at is not null limit 1")
    .bind(productId, ownerKey)
    .first<{ id: string }>();

  if (!existing) {
    return false;
  }

  const statements = [
    ...deleteStatements.map(([table, column]) => db.prepare(`delete from ${table} where ${column} = ?`).bind(productId)),
    db.prepare("delete from products where id = ?").bind(productId),
  ];

  if (db.batch) {
    await db.batch(statements);
    return true;
  }

  for (const statement of statements) {
    await statement.run();
  }

  return true;
}
