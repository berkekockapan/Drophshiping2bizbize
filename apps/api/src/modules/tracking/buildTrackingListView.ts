import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createEtsyShopsRepo } from "../../db/repositories/etsyShopsRepo";
import { createProductEtsyLinksRepo } from "../../db/repositories/productEtsyLinksRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";

export interface TrackingFilters {
  status?: string | null;
  parseStatus?: string | null;
  search?: string | null;
  favorite?: boolean;
  categoryId?: string | "uncategorized" | null;
  shopId?: string | null;
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

function toCardView<
  T extends {
    id: string;
    imagesRaw: string | null;
    userCategoryId?: string | null;
    userCategoryName?: string | null;
  },
>(items: T[]) {
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
  const etsyShopsRepo = createEtsyShopsRepo(db);
  const productEtsyLinksRepo = createProductEtsyLinksRepo(db);
  const items = await productsRepo.listTrackingCards(ownerKey, filters);
  const cards = toCardView(items);
  const productIds = cards.map((item) => item.id);
  const [shopsByProductId, etsyLinksByProductId] = await Promise.all([
    etsyShopsRepo.listProductShopsForProducts(ownerKey, productIds),
    productEtsyLinksRepo.listForProducts(ownerKey, productIds),
  ]);
  const cardsWithShops = cards.map((item) => ({
    ...item,
    shops: (shopsByProductId.get(item.id) ?? []).map((shop) => ({
      id: shop.id,
      name: shop.name,
      etsyShopUrl: shop.etsyShopUrl,
      description: shop.description,
      assignedAt: shop.assignedAt,
    })),
    etsyLinks: (etsyLinksByProductId.get(item.id) ?? []).map((link) => ({
      id: link.id,
      title: link.etsyListingId ?? link.etsyUrl,
      url: link.etsyUrl,
    })),
  }));

  return {
    summary: await productsRepo.getTrackingSummary(ownerKey),
    items: cardsWithShops,
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
