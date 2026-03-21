import { notifications } from "../schema";
import type { D1Database } from "../../config/bindings";
import type { SyncNotification } from "../../modules/sync/diffProductState";

export function createNotificationsRepo(db: D1Database) {
  return {
    db,
    tables: {
      notifications,
    },
    async insertNotifications(productId: string, entries: SyncNotification[], now: Date) {
      for (const entry of entries) {
        await db
          .prepare(
            `insert into notifications (
              id, product_id, type, severity, title, body, created_at
            )
            select ?, ?, ?, ?, ?, ?, ?
            where exists (select 1 from products where id = ?)`,
          )
          .bind(
            crypto.randomUUID(),
            productId,
            entry.type,
            entry.severity,
            entry.title,
            entry.body,
            now.getTime(),
            productId,
          )
          .run();
      }
    },
    async listNotifications(productId: string | null) {
      const query = productId
        ? `select id, product_id as productId, type, severity, title, body, read_at as readAt, created_at as createdAt
           from notifications where product_id = ? order by created_at desc`
        : `select id, product_id as productId, type, severity, title, body, read_at as readAt, created_at as createdAt
           from notifications order by created_at desc`;

      const statement = db.prepare(query);
      const result = productId
        ? await statement.bind(productId).all()
        : await statement.all();

      return result.results;
    },
  };
}
