import type { Env, RefreshJob } from "../../config/bindings";
import { createHistoryRepo } from "../../db/repositories/historyRepo";
import { createNotificationsRepo } from "../../db/repositories/notificationsRepo";
import { createProductsRepo } from "../../db/repositories/productsRepo";
import { fetchTrendyolHtml } from "../scraping/fetchTrendyolHtml";
import { ParseError } from "../scraping/parseErrors";
import { parseTrendyolProduct } from "../scraping/parseTrendyolProduct";
import { diffProductState, toIncomingSnapshot } from "./diffProductState";

export interface ProcessRefreshJobOptions {
  fetchImpl?: typeof fetch;
  fetchTimeoutMs?: number;
  now?: Date;
}

function stringify(value: unknown) {
  return JSON.stringify(value);
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
  const product = await productsRepo.getRefreshSnapshot(job.productId);

  if (!product) {
    throw new Error(`Product ${job.productId} not found`);
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
        currentState: product.currentState,
        variants: product.variants,
      },
      toIncomingSnapshot(product.id, parsed, now.getTime()),
    );

    await productsRepo.updateProductSnapshot(product.id, parsed, diff.currentState, now);
    await productsRepo.upsertVariants(product.id, parsed.variants, now);
    await historyRepo.insertPriceHistory(product.id, diff.priceHistory);
    await historyRepo.insertStockHistory(product.id, diff.stockHistory);
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
    if (!(error instanceof ParseError)) {
      throw error;
    }

    const notification = {
      type: "PARSE_ERROR" as const,
      severity: "warning" as const,
      title: "Parse error",
      body: `${error.code}: ${error.message}`,
    };

    await productsRepo.markParseFailure(product.id, "REVIEW_NEEDED", now);
    await notificationsRepo.insertNotifications(product.id, [notification], now);

    return {
      product: {
        id: product.id,
        parseStatus: "REVIEW_NEEDED" as const,
      },
      notifications: [notification],
    };
  }
}
