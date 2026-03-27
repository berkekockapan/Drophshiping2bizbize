import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export interface TrackingFilters {
  status?: string | null;
  parseStatus?: string | null;
  search?: string | null;
  favorite?: boolean;
  categoryId?: string | "uncategorized" | null;
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

function toCardView(
  items: Array<{
    imagesRaw: string | null;
    userCategoryId?: string | null;
    userCategoryName?: string | null;
    [key: string]: unknown;
  }>,
) {
  return items.map(({ imagesRaw, userCategoryId, userCategoryName, ...item }) => ({
    ...item,
    userCategory:
      userCategoryId && userCategoryName
        ? {
            id: userCategoryId,
            name: userCategoryName,
          }
        : null,
    thumbnailImage: getThumbnailImage(imagesRaw),
  }));
}

export async function buildTrackingListView(db: D1Database, ownerKey: OwnerKey, filters: TrackingFilters = {}) {
  const productsRepo = createProductsRepo(db);
  const items = await productsRepo.listTrackingCards(ownerKey, filters);

  return {
    summary: await productsRepo.getTrackingSummary(ownerKey),
    items: toCardView(items),
    filters,
  };
}

export async function buildTrashListView(db: D1Database, ownerKey: OwnerKey) {
  const items = await createProductsRepo(db).listTrashCards(ownerKey);

  return {
    items: toCardView(items),
    total: items.length,
  };
}
