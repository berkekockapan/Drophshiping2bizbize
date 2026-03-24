import type { Env, RefreshJob } from "../../config/bindings";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { createRefreshAuditRepo } from "../../db/repositories/refreshAuditRepo";
import { fetchTrendyolHtml } from "../scraping/fetchTrendyolHtml";
import { ParseError } from "../scraping/parseErrors";
import { parseTrendyolProduct } from "../scraping/parseTrendyolProduct";
import { diffProductState, toIncomingSnapshot } from "./diffProductState";

export interface ProcessRefreshJobOptions {
  fetchImpl?: typeof fetch;
  fetchTimeoutMs?: number;
  now?: Date;
  source?: "MANUAL" | "SCHEDULED";
  manualRefreshRunId?: string;
}

export class RefreshProductNotFoundError extends Error {
  constructor(public readonly productId: string) {
    super(`Product ${productId} not found`);
    this.name = "RefreshProductNotFoundError";
  }
}

export async function processRefreshJob(
  env: Pick<Env, "DB">,
  job: RefreshJob,
  options: ProcessRefreshJobOptions = {},
) {
  const now = options.now ?? new Date();
  const productsRepo = createProductsRepo(env.DB);
  const historyRepo = createHistoryRepo(env.DB);
  const notificationsRepo = createNotificationsRepo(env.DB);
  const refreshAuditRepo = createRefreshAuditRepo(env.DB);
  const product = await productsRepo.getRefreshSnapshot(job.productId);

  if (!product) {
    throw new RefreshProductNotFoundError(job.productId);
  }

  try {
    const html = await fetchTrendyolHtml(product.trendyolUrl, {
      fetchImpl: options.fetchImpl,
      timeoutMs: options.fetchTimeoutMs,
    });
    const parsed = parseTrendyolProduct(html);
    const diff = diffProductState(
      {
        productId: product.id,
        title: product.title,
        descriptionRaw: product.descriptionRaw,
        imagesRaw: product.imagesRaw,
        currentState: product.currentState,
        variants: product.variants,
      },
      toIncomingSnapshot(product.id, parsed, now.getTime()),
    );
    const stillTracked = await productsRepo.getTrackedProduct(product.id);

    if (!stillTracked) {
      throw new RefreshProductNotFoundError(product.id);
    }

    await productsRepo.updateProductSnapshot(product.id, parsed, diff.currentState, now);
    await productsRepo.upsertVariants(product.id, parsed.variants, now);
    const audit = await refreshAuditRepo.insertAudit({
      productId: product.id,
      source: options.source ?? "MANUAL",
      manualRefreshRunId: options.manualRefreshRunId ?? null,
      status: diff.changedFields.length > 0 ? "SUCCESS" : "NO_CHANGE",
      changeCount: diff.changedFields.length,
      changedFields: diff.changedFields,
      errorMessage: null,
      checkedAt: now.getTime(),
    });
    await refreshAuditRepo.insertContentHistory(product.id, audit.id, diff.contentHistory);
    await historyRepo.insertPriceHistory(product.id, audit.id, diff.priceHistory);
    await historyRepo.insertStockHistory(product.id, audit.id, diff.stockHistory);
    await notificationsRepo.insertNotifications(product.id, diff.notifications, now);

    return {
      product: {
        id: product.id,
        parseStatus: "OK",
        currentPrice: diff.currentState.currentPrice,
      },
      notifications: diff.notifications,
    };
  } catch (error) {
    if (error instanceof ParseError) {
      const notification = {
        type: "PARSE_ERROR" as const,
        severity: "warning" as const,
        title: "Parse error",
        body: `${error.code}: ${error.message}`,
      };

      await productsRepo.markParseFailure(product.id, "REVIEW_NEEDED", now);
      await refreshAuditRepo.insertAudit({
        productId: product.id,
        source: options.source ?? "MANUAL",
        manualRefreshRunId: options.manualRefreshRunId ?? null,
        status: "PARSE_ERROR",
        changeCount: 0,
        changedFields: [],
        errorMessage: notification.body,
        checkedAt: now.getTime(),
      });
      await notificationsRepo.insertNotifications(product.id, [notification], now);

      return {
        product: {
          id: product.id,
          parseStatus: "REVIEW_NEEDED" as const,
        },
        notifications: [notification],
      };
    }

    await refreshAuditRepo.insertAudit({
      productId: product.id,
      source: options.source ?? "MANUAL",
      manualRefreshRunId: options.manualRefreshRunId ?? null,
      status: "FETCH_ERROR",
      changeCount: 0,
      changedFields: [],
      errorMessage: error instanceof Error ? error.message : String(error),
      checkedAt: now.getTime(),
    });

    throw error;
  }
}
