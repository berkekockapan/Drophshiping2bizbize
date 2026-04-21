import type { OwnerKey } from "../../contracts/owners";

import type { D1Database } from "../../config/bindings";
import { createEtsyShopsRepo } from "../../db/repositories/etsyShopsRepo";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductVariantCostOverridesRepo } from "../../db/repositories/productVariantCostOverridesRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createRefreshAuditRepo } from "../../db/repositories/refreshAuditRepo";
import { createTariffAnalysisRepo } from "../../db/repositories/tariffAnalysisRepo";
import { createTariffCatalogRepo, type TariffUsProfileRow } from "../../db/repositories/tariffCatalogRepo";
import { createTariffSelectionRepo } from "../../db/repositories/tariffSelectionRepo";
import type { TariffAnalysisRunResultSnapshot, TariffAnalysisRunRow } from "../../db/repositories/tariffAnalysisRepo";
import {
  buildProductChangeTimeline,
  type ContentHistoryRow,
  type PriceHistoryRow,
  type RefreshAuditRow,
  type StockHistoryRow,
} from "./buildProductChangeTimeline";
import { buildProductCostContext, type ProductCostContextProfile } from "./buildProductCostContext";

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

function toProductCostProfile(catalogProfile: TariffUsProfileRow | null): ProductCostContextProfile | null {
  if (!catalogProfile) {
    return null;
  }

  return {
    catalogId: catalogProfile.catalogId,
    profileName: catalogProfile.profileName ?? null,
    canonicalHs6: catalogProfile.canonicalHs6,
    htsCode10: catalogProfile.masterEntry?.htsCode10 ?? catalogProfile.htsusCode ?? null,
    combinedDutyRate: catalogProfile.combinedDutyRate,
    dutySummary: catalogProfile.summaryText,
    defaultShipentegraUsd: catalogProfile.defaultShipentegraUsd ?? null,
  };
}

type LatestTariffRun = TariffAnalysisRunRow<unknown, TariffAnalysisRunResultSnapshot> | null;

function getTariffRecommendations(latestRun: LatestTariffRun) {
  if (!latestRun?.resultSnapshot) {
    return [];
  }

  return Array.isArray(latestRun.resultSnapshot.recommendations) ? latestRun.resultSnapshot.recommendations : [];
}

export async function buildProductDetailView(db: D1Database, ownerKey: OwnerKey, productId: string) {
  const productsRepo = createProductsRepo(db);
  const etsyShopsRepo = createEtsyShopsRepo(db);
  const historyRepo = createHistoryRepo(db);
  const notificationsRepo = createNotificationsRepo(db);
  const refreshAuditRepo = createRefreshAuditRepo(db);
  const tariffAnalysisRepo = createTariffAnalysisRepo(db);
  const tariffSelectionRepo = createTariffSelectionRepo(db);
  const overridesRepo = createProductVariantCostOverridesRepo(db);
  const tariffCatalogRepo = createTariffCatalogRepo(db);
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
  const latestTariffRun: LatestTariffRun = await tariffAnalysisRepo.getLatestRun<unknown, TariffAnalysisRunResultSnapshot>(
    productId,
  );
  const tariffSelection = await tariffSelectionRepo.getSelection(productId);
  const overrides = await overridesRepo.listByProductId(productId);
  const productShops = await etsyShopsRepo.listProductShops(ownerKey, productId);
  const { userCategoryId, userCategoryName, ...product } = detail.product;
  const attributes = safeParseJson(detail.product.attributesRaw) ?? [];
  const images = safeParseJson(detail.product.imagesRaw);
  const manualSelectionProfile = tariffSelection
    ? toProductCostProfile(await tariffCatalogRepo.getUsProfileByCatalogId(tariffSelection.catalogId))
    : null;
  const costContext = await buildProductCostContext({
    product: {
      title: detail.product.title,
      category: detail.product.category,
      attributes: Array.isArray(attributes) ? attributes : [],
    },
    variants: detail.variants,
    overrides,
    latestRun: latestTariffRun?.resultSnapshot
      ? {
          confidenceState: latestTariffRun.resultSnapshot.confidenceState,
          selectedProfile: latestTariffRun.resultSnapshot.selectedProfile,
          lockedReason: latestTariffRun.resultSnapshot.lockedReason,
        }
      : null,
    manualSelection: manualSelectionProfile,
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
      shops: productShops.map((shop) => ({
        id: shop.id,
        name: shop.name,
        etsyShopUrl: shop.etsyShopUrl,
        description: shop.description,
        assignedAt: shop.assignedAt,
      })),
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
    tariffAnalysis: {
      selection: tariffSelection,
      latestRun: latestTariffRun,
      recommendations: getTariffRecommendations(latestTariffRun),
      manualSearchEnabled: true,
      disclaimer: "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.",
    },
    costContext,
  };
}
