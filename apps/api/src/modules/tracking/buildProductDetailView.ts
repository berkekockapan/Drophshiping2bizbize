import type { D1Database } from "../../config/bindings";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createRefreshAuditRepo } from "../../db/repositories/refreshAuditRepo";
import {
  buildProductChangeTimeline,
  type ContentHistoryRow,
  type PriceHistoryRow,
  type RefreshAuditRow,
  type StockHistoryRow,
} from "./buildProductChangeTimeline";

function safeParseJson(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeTrendyolUrl(value: unknown, baseUrl: string) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return new URL(value.trim(), baseUrl).toString();
  } catch {
    return null;
  }
}

function resolveVariantTrendyolUrl(rawPayload: unknown, productUrl: string, fallbackUrl: string | null) {
  if (isRecord(rawPayload)) {
    const resolved = normalizeTrendyolUrl(rawPayload.url, productUrl);
    if (resolved) {
      return resolved;
    }
  }

  return fallbackUrl ? normalizeTrendyolUrl(fallbackUrl, productUrl) ?? fallbackUrl : null;
}

export async function buildProductDetailView(db: D1Database, productId: string) {
  const productsRepo = createProductsRepo(db);
  const historyRepo = createHistoryRepo(db);
  const notificationsRepo = createNotificationsRepo(db);
  const refreshAuditRepo = createRefreshAuditRepo(db);
  const detail = await productsRepo.getProductDetail(productId);

  if (!detail) {
    return null;
  }

  const variants = detail.variants.map((variant) => {
    const rawPayload = safeParseJson(variant.rawPayload);
    const fallbackUrl = detail.variants.length === 1 ? detail.product.trendyolUrl : null;

    return {
      ...variant,
      trendyolUrl: resolveVariantTrendyolUrl(rawPayload, detail.product.trendyolUrl, fallbackUrl),
      rawPayload,
    };
  });
  const audits = (await refreshAuditRepo.listRefreshAudits(productId)) as unknown as RefreshAuditRow[];
  const contentHistory = (await refreshAuditRepo.listContentHistory(productId)) as unknown as ContentHistoryRow[];
  const priceHistory = (await historyRepo.listPriceHistory(productId)) as unknown as PriceHistoryRow[];
  const stockHistory = (await historyRepo.listStockHistory(productId)) as unknown as StockHistoryRow[];

  return {
    product: {
      ...detail.product,
      attributes: safeParseJson(detail.product.attributesRaw),
      images: safeParseJson(detail.product.imagesRaw),
    },
    currentState: detail.currentState,
    variants,
    priceHistory,
    stockHistory,
    changeTimeline: buildProductChangeTimeline({
      audits,
      contentHistory,
      priceHistory,
      stockHistory,
      variants: detail.variants,
    }),
    notifications: await notificationsRepo.listNotifications(productId),
  };
}
