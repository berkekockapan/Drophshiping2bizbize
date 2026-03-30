import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductVariantCostOverridesRepo } from "../../db/repositories/productVariantCostOverridesRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createRefreshAuditRepo } from "../../db/repositories/refreshAuditRepo";
import { createTariffAnalysisRepo } from "../../db/repositories/tariffAnalysisRepo";
import { createTariffSelectionRepo } from "../../db/repositories/tariffSelectionRepo";
import type { AutoSelectedTariffProfile } from "../tariff/analysis/buildTariffRecommendations";
import { buildProductCostContext } from "./buildProductCostContext";
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

function parseAutoSelectedProfile(value: unknown): AutoSelectedTariffProfile | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    catalogId: typeof value.catalogId === "string" ? value.catalogId : "",
    profileName: typeof value.profileName === "string" ? value.profileName : "",
    canonicalHs6: typeof value.canonicalHs6 === "string" ? value.canonicalHs6 : "",
    htsCode10: typeof value.htsCode10 === "string" ? value.htsCode10 : null,
    combinedDutyRate: typeof value.combinedDutyRate === "number" ? value.combinedDutyRate : 0,
    dutySummary: typeof value.dutySummary === "string" ? value.dutySummary : "",
    defaultShipentegraUsd: typeof value.defaultShipentegraUsd === "number" ? value.defaultShipentegraUsd : null,
  };
}

function parseTariffRunSnapshot(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    confidenceState:
      value.confidenceState === "high_confidence" || value.confidenceState === "low_confidence"
        ? value.confidenceState
        : undefined,
    selectedProfile: parseAutoSelectedProfile(value.selectedProfile),
    lockedReason: typeof value.lockedReason === "string" ? value.lockedReason : null,
    recommendations: Array.isArray(value.recommendations) ? value.recommendations : [],
  };
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

export async function buildProductDetailView(db: D1Database, ownerKey: OwnerKey, productId: string) {
  const productsRepo = createProductsRepo(db);
  const historyRepo = createHistoryRepo(db);
  const notificationsRepo = createNotificationsRepo(db);
  const refreshAuditRepo = createRefreshAuditRepo(db);
  const tariffAnalysisRepo = createTariffAnalysisRepo(db);
  const tariffSelectionRepo = createTariffSelectionRepo(db);
  const costOverridesRepo = createProductVariantCostOverridesRepo(db);
  const detail = await productsRepo.getProductDetail(ownerKey, productId);

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
  const latestTariffRun = await tariffAnalysisRepo.getLatestRun(productId);
  const latestTariffSnapshot = parseTariffRunSnapshot(latestTariffRun?.resultSnapshot);
  const tariffSelection = await tariffSelectionRepo.getSelection(productId);
  const overrides = await costOverridesRepo.listByProductId(productId);
  const { userCategoryId, userCategoryName, ...product } = detail.product;
  const attributes = safeParseJson(detail.product.attributesRaw);
  const images = safeParseJson(detail.product.imagesRaw);
  const costContext = await buildProductCostContext({
    product: {
      title: detail.product.title,
      category: detail.product.category,
      attributes: Array.isArray(attributes) ? attributes : [],
    },
    variants: detail.variants,
    overrides,
    latestRun: latestTariffSnapshot
      ? {
          confidenceState: latestTariffSnapshot.confidenceState,
          selectedProfile: latestTariffSnapshot.selectedProfile,
          lockedReason: latestTariffSnapshot.lockedReason,
        }
      : null,
    manualSelection: tariffSelection,
  });

  return {
    product: {
      ...product,
      attributes,
      images,
      userCategory:
        userCategoryId && userCategoryName
          ? {
              id: userCategoryId,
              name: userCategoryName,
            }
          : null,
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
    notifications: await notificationsRepo.listNotifications(ownerKey, productId),
    costContext,
    tariffAnalysis: {
      selection: tariffSelection,
      latestRun: latestTariffRun,
      recommendations: latestTariffSnapshot?.recommendations ?? [],
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    },
  };
}
