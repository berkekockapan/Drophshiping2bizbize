import { notifications } from "../schema";
import type { D1Database } from "../../config/bindings";

export function createNotificationsRepo(db: D1Database) {
  return {
    db,
    tables: {
      notifications,
    },
  };
}
