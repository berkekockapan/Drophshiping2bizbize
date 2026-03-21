import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export interface TrackingFilters {
  status?: string | null;
  parseStatus?: string | null;
  search?: string | null;
  favorite?: boolean;
}

function getThumbnailImage(imagesRaw: string | null): string | null {
  if (!imagesRaw) {
    return null;
  }

  try {
    const parsed = JSON.parse(imagesRaw);
    if (!Array.isArray(parsed)) {
      return null;
    }

    const firstImage = parsed.find((value): value is string => typeof value === "string" && value.trim().length > 0);
    return firstImage ?? null;
  } catch {
    return null;
  }
}

export async function buildTrackingListView(db: D1Database, filters: TrackingFilters = {}) {
  const productsRepo = createProductsRepo(db);
  const items = await productsRepo.listTrackingCards(filters);

  return {
    summary: await productsRepo.getTrackingSummary(),
    items: items.map(({ imagesRaw, ...item }) => ({
      ...item,
      thumbnailImage: getThumbnailImage(imagesRaw),
    })),
    filters,
  };
}
