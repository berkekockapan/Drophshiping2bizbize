import { appSettings } from "../schema";
import type { D1Database } from "../../config/bindings";

export function createSettingsRepo(db: D1Database) {
  return {
    db,
    tables: {
      appSettings,
    },
  };
}
