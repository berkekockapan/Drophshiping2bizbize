import type { ParsedProduct, ParsedVariant } from "../scraping/parseTrendyolProduct";

export interface PreviousVariantSnapshot {
  id: string;
  variantKey: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  currentStockState: "IN_STOCK" | "OUT_OF_STOCK";
  currentPrice: number | null;
}

export interface PreviousProductSnapshot {
  productId: string;
  title: string | null;
  descriptionRaw: string | null;
  imagesRaw: string | null;
  currentState: {
    currentPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    lastChangeAt: number | null;
    lastCheckedAt: number | null;
  };
  variants: PreviousVariantSnapshot[];
}

export interface IncomingProductSnapshot {
  productId: string;
  title: string;
  descriptionRaw: string | null;
  imagesRaw: string;
  price: number;
  checkedAt: number;
  variants: ParsedVariant[];
}

export interface ContentHistoryChange {
  fieldKey: "TITLE" | "DESCRIPTION" | "IMAGES";
  previousValueRaw: string | null;
  newValueRaw: string | null;
  changedAt: number;
}

export interface PriceHistoryChange {
  variantId: string | null;
  previousPrice: number | null;
  newPrice: number | null;
  changedAt: number;
  changeReason: "PRODUCT_PRICE_CHANGED" | "VARIANT_PRICE_CHANGED";
}

export interface StockHistoryChange {
  variantId: string;
  previousStockState: "IN_STOCK" | "OUT_OF_STOCK";
  newStockState: "IN_STOCK" | "OUT_OF_STOCK";
  changedAt: number;
}

export interface SyncNotification {
  type: "PRICE_INCREASED" | "PRICE_DECREASED" | "OUT_OF_STOCK" | "BACK_IN_STOCK" | "PARSE_ERROR";
  severity: "info" | "warning";
  title: string;
  body: string;
}

export interface ProductStateDiff {
  currentState: {
    currentPrice: number;
    minPrice: number;
    maxPrice: number;
    inStockVariantCount: number;
    totalVariantCount: number;
    lastChangeAt: number | null;
    lastCheckedAt: number;
  };
  contentHistory: ContentHistoryChange[];
  priceHistory: PriceHistoryChange[];
  stockHistory: StockHistoryChange[];
  changedFields: string[];
  notifications: SyncNotification[];
}

function buildPriceNotification(previousPrice: number, nextPrice: number): SyncNotification {
  const increased = nextPrice > previousPrice;
  return {
    type: increased ? "PRICE_INCREASED" : "PRICE_DECREASED",
    severity: "info",
    title: increased ? "Price increased" : "Price decreased",
    body: `Product price moved from ${previousPrice} to ${nextPrice}.`,
  };
}

function buildStockNotification(variant: ParsedVariant): SyncNotification {
  const outOfStock = variant.stockState === "OUT_OF_STOCK";
  return {
    type: outOfStock ? "OUT_OF_STOCK" : "BACK_IN_STOCK",
    severity: outOfStock ? "warning" : "info",
    title: outOfStock ? "Variant out of stock" : "Variant back in stock",
    body: `Variant ${variant.variantKey} is now ${outOfStock ? "out of stock" : "available again"}.`,
  };
}

function normalizeText(value: string | null) {
  return value?.trim().replace(/\s+/g, " ") ?? null;
}

function normalizeJson(value: string | null) {
  if (value == null) {
    return null;
  }

  try {
    return JSON.stringify(JSON.parse(value));
  } catch {
    const normalized = value.trim();
    return normalized ? normalized : null;
  }
}

export function diffProductState(previous: PreviousProductSnapshot, incoming: IncomingProductSnapshot): ProductStateDiff {
  const notifications: SyncNotification[] = [];
  const contentHistory: ContentHistoryChange[] = [];
  const priceHistory: PriceHistoryChange[] = [];
  const stockHistory: StockHistoryChange[] = [];
  const changedFields = new Set<string>();
  const previousVariants = new Map(previous.variants.map((variant) => [variant.variantKey, variant] as const));

  if (normalizeText(previous.title) !== normalizeText(incoming.title)) {
    contentHistory.push({
      fieldKey: "TITLE",
      previousValueRaw: previous.title,
      newValueRaw: incoming.title,
      changedAt: incoming.checkedAt,
    });
    changedFields.add("TITLE");
  }

  if (normalizeText(previous.descriptionRaw) !== normalizeText(incoming.descriptionRaw)) {
    contentHistory.push({
      fieldKey: "DESCRIPTION",
      previousValueRaw: previous.descriptionRaw,
      newValueRaw: incoming.descriptionRaw,
      changedAt: incoming.checkedAt,
    });
    changedFields.add("DESCRIPTION");
  }

  if (normalizeJson(previous.imagesRaw) !== normalizeJson(incoming.imagesRaw)) {
    contentHistory.push({
      fieldKey: "IMAGES",
      previousValueRaw: previous.imagesRaw,
      newValueRaw: incoming.imagesRaw,
      changedAt: incoming.checkedAt,
    });
    changedFields.add("IMAGES");
  }

  if (previous.currentState.currentPrice !== incoming.price) {
    priceHistory.push({
      variantId: null,
      previousPrice: previous.currentState.currentPrice,
      newPrice: incoming.price,
      changedAt: incoming.checkedAt,
      changeReason: "PRODUCT_PRICE_CHANGED",
    });
    changedFields.add("PRODUCT_PRICE");

    if (previous.currentState.currentPrice !== null) {
      notifications.push(buildPriceNotification(previous.currentState.currentPrice, incoming.price));
    }
  }

  for (const variant of incoming.variants) {
    const previousVariant = previousVariants.get(variant.variantKey);
    if (!previousVariant) {
      continue;
    }

    if (previousVariant.currentPrice !== variant.price) {
      priceHistory.push({
        variantId: previousVariant.id,
        previousPrice: previousVariant.currentPrice,
        newPrice: variant.price,
        changedAt: incoming.checkedAt,
        changeReason: "VARIANT_PRICE_CHANGED",
      });
      changedFields.add("VARIANT_PRICE");
    }

    if (previousVariant.currentStockState !== variant.stockState) {
      stockHistory.push({
        variantId: previousVariant.id,
        previousStockState: previousVariant.currentStockState,
        newStockState: variant.stockState,
        changedAt: incoming.checkedAt,
      });
      changedFields.add("VARIANT_STOCK");
      notifications.push(buildStockNotification(variant));
    }
  }

  const currentMin = previous.currentState.minPrice ?? previous.currentState.currentPrice ?? incoming.price;
  const currentMax = previous.currentState.maxPrice ?? previous.currentState.currentPrice ?? incoming.price;
  const hasChanges = changedFields.size > 0;

  return {
    currentState: {
      currentPrice: incoming.price,
      minPrice: Math.min(currentMin, incoming.price),
      maxPrice: Math.max(currentMax, incoming.price),
      inStockVariantCount: incoming.variants.filter((variant) => variant.stockState === "IN_STOCK").length,
      totalVariantCount: incoming.variants.length,
      lastChangeAt: hasChanges ? incoming.checkedAt : previous.currentState.lastChangeAt,
      lastCheckedAt: incoming.checkedAt,
    },
    contentHistory,
    priceHistory,
    stockHistory,
    changedFields: [...changedFields],
    notifications,
  };
}

export function toIncomingSnapshot(productId: string, parsed: ParsedProduct, checkedAt: number): IncomingProductSnapshot {
  return {
    productId,
    title: parsed.title,
    descriptionRaw: parsed.descriptionRaw,
    imagesRaw: JSON.stringify(parsed.images),
    price: parsed.price,
    checkedAt,
    variants: parsed.variants,
  };
}
