import type { SourceProductItem, TrackingItem } from "../../../app/api";

export interface UnifiedDashboardItem {
  key: string;
  title: string;
  brand: string | null;
  thumbnailImage: string | null;
  sourceUrl: string | null;
  platform: string | null;
  categoryLabel: string | null;
  categoryKey: string | null;
  sourceCategoryLabel: string | null;
  trackingCategoryLabel: string | null;
  etsyLinks: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  assignedShops: Array<{
    id: string;
    name: string;
  }>;
  sourceProduct: SourceProductItem | null;
  trackedProduct: TrackingItem | null;
}

function normalizeCategoryKey(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function extractSourceProductId(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  try {
    const pathname = new URL(rawUrl).pathname;
    const match = pathname.match(/-p-(\d+)/i);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function normalizeUrl(rawUrl: string | null | undefined) {
  if (!rawUrl) {
    return null;
  }

  try {
    const url = new URL(rawUrl);
    url.search = "";
    url.hash = "";
    url.protocol = url.protocol.toLowerCase();
    url.hostname = url.hostname.toLowerCase();
    if (url.pathname !== "/") {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return rawUrl.trim() || null;
  }
}

function getDisplayCategory(sourceProduct: SourceProductItem | null, trackedProduct: TrackingItem | null) {
  const trackingCategoryLabel = trackedProduct?.userCategory?.name ?? sourceProduct?.userCategory?.name ?? null;
  const label = trackingCategoryLabel ?? sourceProduct?.sourceCategory?.name ?? null;
  return {
    label,
    key: label ? normalizeCategoryKey(label) : null,
  };
}

function mergeEtsyLinks(sourceProduct: SourceProductItem | null, trackedProduct: TrackingItem | null) {
  const links = [...(sourceProduct?.linkedEtsyItems ?? []), ...(trackedProduct?.etsyLinks ?? [])];
  const seen = new Set<string>();

  return links.filter((link) => {
    const listingId = link.url.match(/\/listing\/(\d+)/i)?.[1];
    const key = listingId ? `listing:${listingId}` : link.url.trim().toLocaleLowerCase("tr-TR");
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function createUnifiedItem(sourceProduct: SourceProductItem | null, trackedProduct: TrackingItem | null): UnifiedDashboardItem {
  const category = getDisplayCategory(sourceProduct, trackedProduct);

  return {
    key: sourceProduct?.id ?? trackedProduct?.id ?? crypto.randomUUID(),
    title: sourceProduct?.title ?? trackedProduct?.title ?? "Başlıksız ürün",
    brand: trackedProduct?.brand ?? null,
    thumbnailImage: trackedProduct?.thumbnailImage ?? null,
    sourceUrl: sourceProduct?.sourceUrl ?? trackedProduct?.trendyolUrl ?? null,
    platform: sourceProduct?.platform ?? null,
    categoryLabel: category.label,
    categoryKey: category.key,
    sourceCategoryLabel: sourceProduct?.sourceCategory?.name ?? null,
    trackingCategoryLabel: trackedProduct?.userCategory?.name ?? sourceProduct?.userCategory?.name ?? null,
    etsyLinks: mergeEtsyLinks(sourceProduct, trackedProduct),
    assignedShops: (trackedProduct?.shops ?? sourceProduct?.shops ?? []).map((shop) => ({ id: shop.id, name: shop.name })),
    sourceProduct,
    trackedProduct,
  };
}

export function buildUnifiedDashboardItems(sourceProducts: SourceProductItem[], trackedProducts: TrackingItem[]) {
  const itemsBySourceProductId = new Map<string, UnifiedDashboardItem>();
  const itemsByNormalizedUrl = new Map<string, UnifiedDashboardItem>();
  const mergedItems: UnifiedDashboardItem[] = [];

  for (const sourceProduct of sourceProducts) {
    const item = createUnifiedItem(sourceProduct, null);
    const sourceProductId = extractSourceProductId(sourceProduct.sourceUrl);
    const normalizedUrl = normalizeUrl(sourceProduct.sourceUrl);

    if (sourceProductId) {
      itemsBySourceProductId.set(sourceProductId, item);
    }

    if (normalizedUrl) {
      itemsByNormalizedUrl.set(normalizedUrl, item);
    }

    mergedItems.push(item);
  }

  for (const trackedProduct of trackedProducts) {
    const matchedItem =
      (trackedProduct.sourceProductId ? itemsBySourceProductId.get(trackedProduct.sourceProductId) : undefined) ??
      (trackedProduct.trendyolUrl ? itemsByNormalizedUrl.get(normalizeUrl(trackedProduct.trendyolUrl) ?? "") : undefined);

    if (matchedItem) {
      matchedItem.trackedProduct = trackedProduct;
      matchedItem.title = matchedItem.sourceProduct?.title ?? trackedProduct.title ?? matchedItem.title;
      matchedItem.brand = trackedProduct.brand ?? matchedItem.brand;
      matchedItem.thumbnailImage = trackedProduct.thumbnailImage ?? matchedItem.thumbnailImage;
      matchedItem.sourceUrl = matchedItem.sourceProduct?.sourceUrl ?? trackedProduct.trendyolUrl ?? matchedItem.sourceUrl;
      const category = getDisplayCategory(matchedItem.sourceProduct, trackedProduct);
      matchedItem.categoryLabel = category.label;
      matchedItem.categoryKey = category.key;
      matchedItem.trackingCategoryLabel = trackedProduct.userCategory?.name ?? matchedItem.sourceProduct?.userCategory?.name ?? null;
      matchedItem.etsyLinks = mergeEtsyLinks(matchedItem.sourceProduct, trackedProduct);
      matchedItem.assignedShops = (trackedProduct.shops ?? matchedItem.sourceProduct?.shops ?? []).map((shop) => ({
        id: shop.id,
        name: shop.name,
      }));
      continue;
    }

    mergedItems.push(createUnifiedItem(null, trackedProduct));
  }

  return mergedItems.sort((left, right) => {
    if (left.categoryKey === null && right.categoryKey !== null) {
      return 1;
    }

    if (left.categoryKey !== null && right.categoryKey === null) {
      return -1;
    }

    const categoryCompare = (left.categoryLabel ?? "").localeCompare(right.categoryLabel ?? "", "tr");
    if (categoryCompare !== 0) {
      return categoryCompare;
    }

    return left.title.localeCompare(right.title, "tr");
  });
}
