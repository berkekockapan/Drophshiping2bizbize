import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import type { SyncNotification } from "../../modules/sync/diffProductState";
import { runWithWriteRetry } from "../runWithWriteRetry";
import { notifications } from "../schema";

export function createNotificationsRepo(db: D1Database) {
  return {
    db,
    tables: {
      notifications,
    },
    async insertNotifications(ownerKey: OwnerKey, productId: string, entries: SyncNotification[], now: Date) {
      await runWithWriteRetry(async () => {
        const statements = entries.map((entry) =>
          db
            .prepare(
              `insert into notifications (
                id, product_id, owner_key, type, severity, title, body, created_at
              )
              select ?, ?, ?, ?, ?, ?, ?, ?
              where exists (select 1 from products where id = ? and owner_key = ?)`,
            )
            .bind(
              crypto.randomUUID(),
              productId,
              ownerKey,
              entry.type,
              entry.severity,
              entry.title,
              entry.body,
              now.getTime(),
              productId,
              ownerKey,
            ),
        );

        for (const statement of statements) {
          await statement.run();
        }
      });
    },
    async listNotifications(ownerKey: OwnerKey, productId: string | null = null) {
      const query = productId
        ? `select id, product_id as productId, type, severity, title, body, read_at as readAt, created_at as createdAt
           from notifications
           where owner_key = ? and product_id = ?
           order by created_at desc`
        : `select id, product_id as productId, type, severity, title, body, read_at as readAt, created_at as createdAt
           from notifications
           where owner_key = ?
           order by created_at desc`;

      const statement = db.prepare(query);
      const result = productId
        ? await statement.bind(ownerKey, productId).all()
        : await statement.bind(ownerKey).all();

      return result.results;
    },
  };
}
