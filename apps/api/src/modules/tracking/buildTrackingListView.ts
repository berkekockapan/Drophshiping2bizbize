import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export interface TrackingFilters {
  status?: string | null;
  parseStatus?: string | null;
  search?: string | null;
}

export async function buildTrackingListView(db: D1Database, filters: TrackingFilters = {}) {
  const productsRepo = createProductsRepo(db);

  return {
    summary: await productsRepo.getTrackingSummary(),
    items: await productsRepo.listTrackingCards(filters),
    filters,
  };
}
