import type { D1Database } from "../../config/bindings";

const deleteStatements = [
  ["product_variants", "product_id"],
  ["product_current_state", "product_id"],
  ["price_history", "product_id"],
  ["stock_history", "product_id"],
  ["notifications", "product_id"],
  ["etsy_drafts", "product_id"],
] as const;

export async function deleteTrackedProduct(db: D1Database, productId: string) {
  const existing = await db
    .prepare("select id from products where id = ? limit 1")
    .bind(productId)
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
