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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function parsePriceValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  if (typeof value === "string") {
    return parsePrice(value);
  }

  return null;
}

function readImageUrls(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) => readImageUrls(entry));
  }

  if (isRecord(value)) {
    return [...readImageUrls(value.contentUrl), ...readImageUrls(value.url)];
  }

  return [];
}

function extractJsonLdNodes(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => extractJsonLdNodes(entry));
  }

  if (!isRecord(value)) {
    return [];
  }

  const nodes: Array<Record<string, unknown>> = [value];

  if (value["@graph"]) {
    nodes.push(...extractJsonLdNodes(value["@graph"]));
  }

  return nodes;
}

function parseStockState(availability: unknown): "IN_STOCK" | "OUT_OF_STOCK" {
  const value = typeof availability === "string" ? availability.toLowerCase() : "";
  return value.includes("outofstock") ? "OUT_OF_STOCK" : "IN_STOCK";
}

function readOffer(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const firstOffer = value.find((entry) => isRecord(entry));
    return isRecord(firstOffer) ? firstOffer : null;
  }

  return isRecord(value) ? value : null;
}

function readBrand(value: unknown): string | null {
  if (typeof value === "string") {
    return value.trim() || null;
  }

  if (isRecord(value)) {
    return firstText(value.name);
  }

  return null;
}

function parseFromFixtureDom(html: string): ParsedProduct {
  const $ = load(html);
  const root = $('[data-product-page="trendyol"]').first();
  if (root.length === 0) {
    throw new ParseError("Missing product root", "MISSING_PRODUCT_ROOT");
  }

  const title = root.find('[data-testid="product-title"]').first().text().trim();
  if (!title) {
    throw new ParseError("Missing product title", "MISSING_TITLE");
  }

  const price = parsePrice(
    root.find('[data-testid="product-price"]').attr("data-price") ?? root.find('[data-testid="product-price"]').text(),
  );
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

  const normalizedVariants =
    variants.length > 0
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

function parseFromJsonLd(html: string): ParsedProduct | null {
  const $ = load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();
  if (scripts.length === 0) {
    return null;
  }

  const nodes: Array<Record<string, unknown>> = [];
  for (const script of scripts) {
    const text = $(script).html()?.trim();
    if (!text) {
      continue;
    }

    try {
      nodes.push(...extractJsonLdNodes(JSON.parse(text)));
    } catch {
      // ignore invalid JSON-LD blocks
    }
  }

  const productNode = nodes.find((node) => {
    const types = toArray(node["@type"]).filter((type): type is string => typeof type === "string");
    return types.some((type) => type === "ProductGroup" || type === "Product");
  });

  if (!productNode) {
    return null;
  }

  const title = firstText(productNode.name);
  if (!title) {
    throw new ParseError("Missing product title", "MISSING_TITLE");
  }

  const groupOffer = readOffer(productNode.offers);
  const groupPrice = parsePriceValue(groupOffer?.price);

  const variantNodes = toArray(productNode.hasVariant).filter((node): node is Record<string, unknown> => isRecord(node));
  const variants: ParsedVariant[] = variantNodes.flatMap((variantNode, index) => {
      const variantOffer = readOffer(variantNode.offers);
      const variantPrice = parsePriceValue(variantOffer?.price) ?? groupPrice;
      if (variantPrice === null) {
        return [];
      }

      return [
        {
        variantKey: firstText(variantNode.sku, variantNode.productID, variantNode.name, variantNode.color) ?? `variant-${index + 1}`,
        option1: firstText(variantNode.color),
        option2: firstText(variantNode.pattern, variantNode.size),
        option3: null,
        stockState: parseStockState(variantOffer?.availability),
        price: variantPrice,
        rawPayload: {
          sku: firstText(variantNode.sku),
          color: firstText(variantNode.color),
          availability: firstText(variantOffer?.availability),
          url: firstText(variantOffer?.url),
          price: variantPrice,
        },
      },
      ];
    });

  const normalizedPrice = groupPrice ?? variants[0]?.price ?? null;
  if (normalizedPrice === null) {
    throw new ParseError("Missing product price", "MISSING_PRICE");
  }

  const normalizedVariants =
    variants.length > 0
      ? variants
      : [
          {
            variantKey: firstText(productNode.sku, productNode.productID) ?? "default",
            option1: firstText(productNode.color),
            option2: firstText(productNode.pattern, productNode.size),
            option3: null,
            stockState: parseStockState(groupOffer?.availability),
            price: normalizedPrice,
            rawPayload: {
              availability: firstText(groupOffer?.availability),
              url: firstText(groupOffer?.url),
              price: normalizedPrice,
            },
          } satisfies ParsedVariant,
        ];

  return {
    title,
    brand: readBrand(productNode.manufacturer) ?? readBrand(productNode.brand),
    category: firstText(productNode.category),
    descriptionRaw: firstText(productNode.description),
    attributes: [],
    images: readImageUrls(productNode.image),
    price: normalizedPrice,
    variants: normalizedVariants,
  };
}

export function parseTrendyolProduct(html: string): ParsedProduct {
  const $ = load(html);

  if ($('[data-testid="product-unavailable"]').length > 0) {
    throw new ParseError("Product is unavailable", "PRODUCT_UNAVAILABLE");
  }

  try {
    return parseFromFixtureDom(html);
  } catch (error) {
    if (!(error instanceof ParseError)) {
      throw error;
    }

    const fallback = parseFromJsonLd(html);
    if (fallback) {
      return fallback;
    }

    throw error;
  }
}
