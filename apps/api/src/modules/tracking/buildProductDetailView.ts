import type { D1Database } from "../../config/bindings";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";

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

export async function buildProductDetailView(db: D1Database, productId: string) {
  const productsRepo = createProductsRepo(db);
  const historyRepo = createHistoryRepo(db);
  const notificationsRepo = createNotificationsRepo(db);
  const detail = await productsRepo.getProductDetail(productId);

  if (!detail) {
    return null;
  }

  return {
    product: {
      ...detail.product,
      attributes: safeParseJson(detail.product.attributesRaw),
      images: safeParseJson(detail.product.imagesRaw),
    },
    currentState: detail.currentState,
    variants: detail.variants.map((variant) => ({
      ...variant,
      rawPayload: safeParseJson(variant.rawPayload),
    })),
    priceHistory: await historyRepo.listPriceHistory(productId),
    stockHistory: await historyRepo.listStockHistory(productId),
    notifications: await notificationsRepo.listNotifications(productId),
  };
}
