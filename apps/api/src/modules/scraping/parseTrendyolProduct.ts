import { load } from "cheerio";

import { ParseError } from "./parseErrors";

export interface ParsedVariant {
  variantKey: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  stockState: "IN_STOCK" | "OUT_OF_STOCK";
  price: number | null;
  rawPayload: Record<string, string | number | null>;
}

export interface ParsedProduct {
  title: string;
  brand: string | null;
  category: string | null;
  descriptionRaw: string | null;
  attributes: Array<{ key: string; value: string }>;
  images: string[];
  price: number;
  variants: ParsedVariant[];
}

function parsePrice(value: string | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/[^\d.,]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const numeric = Number.parseFloat(normalized);
  if (Number.isNaN(numeric)) {
    return null;
  }

  return Math.round(numeric * 100);
}

export function parseTrendyolProduct(html: string): ParsedProduct {
  const $ = load(html);

  if ($('[data-testid="product-unavailable"]').length > 0) {
    throw new ParseError("Product is unavailable", "PRODUCT_UNAVAILABLE");
  }

  const root = $('[data-product-page="trendyol"]').first();
  if (root.length === 0) {
    throw new ParseError("Missing product root", "MISSING_PRODUCT_ROOT");
  }

  const title = root.find('[data-testid="product-title"]').first().text().trim();
  if (!title) {
    throw new ParseError("Missing product title", "MISSING_TITLE");
  }

  const price = parsePrice(root.find('[data-testid="product-price"]').attr("data-price") ?? root.find('[data-testid="product-price"]').text());
  if (price === null) {
    throw new ParseError("Missing product price", "MISSING_PRICE");
  }

  const attributes = root
    .find('[data-testid="product-attributes"] [data-key]')
    .toArray()
    .map((node) => ({
      key: $(node).attr("data-key")?.trim() ?? "",
      value: $(node).text().trim(),
    }))
    .filter((attribute) => attribute.key && attribute.value);

  const images = root
    .find('[data-testid="product-images"] img')
    .toArray()
    .map((node) => $(node).attr("src")?.trim() ?? "")
    .filter(Boolean);

  const variants = root.find("[data-variant]").toArray().map((node) => {
    const element = $(node);
    const rawPrice = element.attr("data-price");
    const parsedPrice = parsePrice(rawPrice);

    return {
      variantKey: element.attr("data-key")?.trim() ?? crypto.randomUUID(),
      option1: element.attr("data-option-1")?.trim() ?? null,
      option2: element.attr("data-option-2")?.trim() ?? null,
      option3: element.attr("data-option-3")?.trim() ?? null,
      stockState: element.attr("data-stock-state") === "OUT_OF_STOCK" ? "OUT_OF_STOCK" : "IN_STOCK",
      price: parsedPrice ?? price,
      rawPayload: {
        price: parsedPrice ?? price,
        stockState: element.attr("data-stock-state")?.trim() ?? "IN_STOCK",
      },
    } satisfies ParsedVariant;
  });

  const normalizedVariants = variants.length > 0
    ? variants
    : [
        {
          variantKey: "default",
          option1: null,
          option2: null,
          option3: null,
          stockState: "IN_STOCK",
          price,
          rawPayload: {
            price,
            stockState: "IN_STOCK",
          },
        } satisfies ParsedVariant,
      ];

  return {
    title,
    brand: root.find('[data-testid="product-brand"]').first().text().trim() || null,
    category: root.find('[data-testid="product-category"]').first().text().trim() || null,
    descriptionRaw: root.find('[data-testid="product-description"]').first().text().trim() || null,
    attributes,
    images,
    price,
    variants: normalizedVariants,
  };
}
