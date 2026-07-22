import type { Env } from "../../config/bindings";
import type { OwnerKey } from "../../contracts/owners";
import { createProductLinkedVariantsRepo } from "../../db/repositories/productLinkedVariantsRepo";
import { fetchTrendyolHtml } from "../scraping/fetchTrendyolHtml";
import { parseTrendyolProduct } from "../scraping/parseTrendyolProduct";
import { extractSourceProductId } from "./extractSourceProductId";
import { normalizeTrendyolUrl } from "./normalizeTrendyolUrl";

export class DuplicateProductLinkedVariantError extends Error {
  constructor() {
    super("Bu Trendyol linki zaten bir ürüne varyant olarak eklenmiş.");
    this.name = "DuplicateProductLinkedVariantError";
  }
}

export class ParentProductLinkedVariantError extends Error {
  constructor() {
    super("Ana ürün linki kendi varyantı olarak eklenemez.");
    this.name = "ParentProductLinkedVariantError";
  }
}

export class InvalidProductLinkedVariantUrlError extends Error {
  constructor() {
    super("Geçerli bir Trendyol ürün linki girin.");
    this.name = "InvalidProductLinkedVariantUrlError";
  }
}

export interface AddProductLinkedVariantOptions {
  fetchImpl?: typeof fetch;
  fetchTimeoutMs?: number;
  now?: Date;
}

export async function addProductLinkedVariant(
  env: Pick<Env, "DB">,
  ownerKey: OwnerKey,
  parentProductId: string,
  trendyolUrl: string,
  options: AddProductLinkedVariantOptions = {},
) {
  const repo = createProductLinkedVariantsRepo(env.DB);
  const parent = await repo.getParent(ownerKey, parentProductId);
  if (!parent) {
    return null;
  }

  let normalizedUrl: string;
  try {
    normalizedUrl = normalizeTrendyolUrl(trendyolUrl);
  } catch {
    throw new InvalidProductLinkedVariantUrlError();
  }

  const hostname = new URL(normalizedUrl).hostname.toLowerCase();
  if (hostname !== "trendyol.com" && !hostname.endsWith(".trendyol.com")) {
    throw new InvalidProductLinkedVariantUrlError();
  }
  if (normalizedUrl === parent.trendyolUrl) {
    throw new ParentProductLinkedVariantError();
  }

  if (await repo.findByNormalizedUrl(ownerKey, normalizedUrl)) {
    throw new DuplicateProductLinkedVariantError();
  }

  const html = await fetchTrendyolHtml(normalizedUrl, {
    fetchImpl: options.fetchImpl,
    timeoutMs: options.fetchTimeoutMs,
  });
  const parsed = parseTrendyolProduct(html);
  const now = options.now ?? new Date();
  const currentStockState = parsed.variants.some((variant) => variant.stockState === "IN_STOCK")
    ? "IN_STOCK"
    : "OUT_OF_STOCK";

  return repo.create({
    id: crypto.randomUUID(),
    parentProductId,
    ownerKey,
    trendyolUrl: normalizedUrl,
    trendyolUrlNormalized: normalizedUrl,
    sourceProductId: extractSourceProductId(normalizedUrl),
    title: parsed.title,
    brand: parsed.brand,
    descriptionRaw: parsed.descriptionRaw,
    attributesRaw: JSON.stringify(parsed.attributes),
    imagesRaw: JSON.stringify(parsed.images),
    currentPrice: parsed.price,
    currentStockState,
    lastCheckedAt: now.getTime(),
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
  });
}
