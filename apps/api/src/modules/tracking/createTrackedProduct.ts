import type { Env } from "../../config/bindings";
import { fetchTrendyolHtml } from "../scraping/fetchTrendyolHtml";
import { parseTrendyolProduct } from "../scraping/parseTrendyolProduct";
import { extractSourceProductId } from "./extractSourceProductId";
import { normalizeTrendyolUrl } from "./normalizeTrendyolUrl";

export interface CreateTrackedProductInput {
  trendyolUrl: string;
}

export interface CreateTrackedProductOptions {
  fetchImpl?: typeof fetch;
  now?: Date;
}

export class DuplicateProductError extends Error {
  constructor(public readonly normalizedUrl: string) {
    super(`Tracked product already exists for ${normalizedUrl}`);
    this.name = "DuplicateProductError";
  }
}

function stringify(value: unknown) {
  return JSON.stringify(value);
}

export async function createTrackedProduct(
  env: Pick<Env, "DB">,
  input: CreateTrackedProductInput,
  options: CreateTrackedProductOptions = {}
) {
  const normalizedUrl = normalizeTrendyolUrl(input.trendyolUrl);
  const existing = await env.DB
    .prepare("select id from products where trendyol_url = ? limit 1")
    .bind(normalizedUrl)
    .first<{ id: string }>();

  if (existing) {
    throw new DuplicateProductError(normalizedUrl);
  }

  const html = await fetchTrendyolHtml(normalizedUrl, options.fetchImpl);
  const parsed = parseTrendyolProduct(html);
  const now = options.now ?? new Date();
  const productId = crypto.randomUUID();
  const sourceProductId = extractSourceProductId(normalizedUrl);
  const inStockVariantCount = parsed.variants.filter((variant) => variant.stockState === "IN_STOCK").length;

  await env.DB
    .prepare(
      `insert into products (
        id, trendyol_url, source_product_id, title, brand, category, description_raw, attributes_raw, images_raw,
        status, parse_status, last_checked_at, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      productId,
      normalizedUrl,
      sourceProductId,
      parsed.title,
      parsed.brand,
      parsed.category,
      parsed.descriptionRaw,
      stringify(parsed.attributes),
      stringify(parsed.images),
      "ACTIVE",
      "OK",
      now.getTime(),
      now.getTime(),
      now.getTime()
    )
    .run();

  for (const variant of parsed.variants) {
    await env.DB
      .prepare(
        `insert into product_variants (
          id, product_id, variant_key, option_1, option_2, option_3, current_stock_state, current_price, last_seen_at, raw_payload
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        productId,
        variant.variantKey,
        variant.option1,
        variant.option2,
        variant.option3,
        variant.stockState,
        variant.price,
        now.getTime(),
        stringify(variant.rawPayload)
      )
      .run();
  }

  await env.DB
    .prepare(
      `insert into product_current_state (
        product_id, current_price, min_price, max_price, in_stock_variant_count, total_variant_count, last_change_at, last_checked_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      productId,
      parsed.price,
      parsed.price,
      parsed.price,
      inStockVariantCount,
      parsed.variants.length,
      now.getTime(),
      now.getTime()
    )
    .run();

  return {
    product: {
      id: productId,
      trendyolUrl: normalizedUrl,
      sourceProductId,
      title: parsed.title,
      variantCount: parsed.variants.length,
    },
  };
}
