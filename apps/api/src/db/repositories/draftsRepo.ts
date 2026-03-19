import { aiProfiles, etsyDrafts } from "../schema";
import type { D1Database } from "../../config/bindings";

export function createDraftsRepo(db: D1Database) {
  return {
    db,
    tables: {
      etsyDrafts,
      aiProfiles,
    },
  };
}
