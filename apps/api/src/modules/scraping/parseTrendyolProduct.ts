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

function firstScalarText(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
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

function parseNestedPrice(value: unknown): number | null {
  if (value == null) {
    return null;
  }

  if (typeof value === "number" || typeof value === "string") {
    return parsePriceValue(value);
  }

  if (!isRecord(value)) {
    return null;
  }

  return (
    parseNestedPrice(value.discountedPrice) ??
    parseNestedPrice(value.sellingPrice) ??
    parseNestedPrice(value.originalPrice) ??
    parseNestedPrice(value.value) ??
    parseNestedPrice(value.text)
  );
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

function buildDisplayTitle(name: string | null, brand: string | null) {
  if (!name) {
    return null;
  }

  if (!brand || name.toLocaleLowerCase("tr-TR").startsWith(brand.toLocaleLowerCase("tr-TR"))) {
    return name;
  }

  return `${brand} ${name}`;
}

function tryNormalizeUrl(value: unknown, baseUrl?: string | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  try {
    return new URL(value.trim(), baseUrl ?? "https://www.trendyol.com").toString();
  } catch {
    return null;
  }
}

function readUrlCandidate(baseUrl: string | null, ...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = tryNormalizeUrl(value, baseUrl);
    if (normalized) {
      return normalized;
    }

    if (!isRecord(value)) {
      continue;
    }

    const nested = readUrlCandidate(
      baseUrl,
      value.url,
      value.uri,
      value.href,
      value.link,
      value.path,
      value.webUrl,
      value.pdpUrl,
      value.productUrl,
    );
    if (nested) {
      return nested;
    }
  }

  return null;
}

function readVariantUrl(variant: Record<string, unknown>, baseUrl: string | null) {
  return readUrlCandidate(
    baseUrl,
    variant.url,
    variant.uri,
    variant.href,
    variant.link,
    variant.path,
    variant.webUrl,
    variant.pdpUrl,
    variant.productUrl,
    variant.merchantListing,
  );
}

function parseStockStateFromRecord(value: Record<string, unknown>): "IN_STOCK" | "OUT_OF_STOCK" {
  if (typeof value.inStock === "boolean") {
    return value.inStock ? "IN_STOCK" : "OUT_OF_STOCK";
  }

  if (typeof value.sellable === "boolean") {
    return value.sellable ? "IN_STOCK" : "OUT_OF_STOCK";
  }

  if (typeof value.stockStatus === "number") {
    return value.stockStatus > 0 ? "IN_STOCK" : "OUT_OF_STOCK";
  }

  return parseStockState(value.availability);
}

function readEnvoyProps(html: string): Record<string, unknown> | null {
  const marker = /window\["__envoy__PROPS"\]\s*=/;
  const match = marker.exec(html);
  if (!match) {
    return null;
  }

  const start = match.index + match[0].length;
  const end = html.indexOf("</script>", start);
  if (end === -1) {
    return null;
  }

  const payload = html.slice(start, end).trim().replace(/;$/, "");
  try {
    const parsed = JSON.parse(payload);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function parseFromEnvoyProps(html: string): ParsedProduct | null {
  const envoyProps = readEnvoyProps(html);
  if (!envoyProps || !isRecord(envoyProps.product)) {
    return null;
  }

  let jsonLdFallback: ParsedProduct | null = null;
  try {
    jsonLdFallback = parseFromJsonLd(html);
  } catch {
    jsonLdFallback = null;
  }

  const product = envoyProps.product;
  const merchantListing = isRecord(product.merchantListing) ? product.merchantListing : null;
  const productVariants = toArray(product.variants).filter((entry): entry is Record<string, unknown> => isRecord(entry));
  const merchantVariants = toArray(merchantListing?.variants).filter((entry): entry is Record<string, unknown> => isRecord(entry));
  const winnerVariant = isRecord(merchantListing?.winnerVariant) ? merchantListing.winnerVariant : null;
  const productUrl = readUrlCandidate(null, product.url, merchantListing?.url);

  const variantRecords =
    productVariants.length > 0 ? productVariants : merchantVariants.length > 0 ? merchantVariants : winnerVariant ? [winnerVariant] : [];

  const selectedVariant =
    variantRecords.find((variant) => variant.isSelected === true) ?? winnerVariant ?? variantRecords[0] ?? null;
  const currentPrice = parseNestedPrice(selectedVariant?.price) ?? parseNestedPrice(winnerVariant?.price) ?? jsonLdFallback?.price ?? null;

  if (currentPrice === null) {
    return null;
  }

  const variants = variantRecords.map((variant, index) => {
    const option = firstText(variant.beautifiedValue, variant.value);
    const price = parseNestedPrice(variant.price) ?? currentPrice;
    const url = readVariantUrl(variant, productUrl) ?? productUrl;

    return {
      variantKey:
        firstScalarText(variant.itemNumber, variant.barcode, variant.listingId) ?? option ?? `variant-${index + 1}`,
      option1: option,
      option2: null,
      option3: null,
      stockState: parseStockStateFromRecord(variant),
      price,
      rawPayload: {
        itemNumber: firstScalarText(variant.itemNumber),
        barcode: firstScalarText(variant.barcode),
        value: firstText(variant.value),
        beautifiedValue: firstText(variant.beautifiedValue),
        stockState: parseStockStateFromRecord(variant),
        url,
        price,
      },
    } satisfies ParsedVariant;
  });

  const normalizedVariants =
    variants.length > 0
      ? variants
      : [
          {
            variantKey: firstScalarText(winnerVariant?.itemNumber, winnerVariant?.barcode) ?? "default",
            option1: null,
            option2: null,
            option3: null,
            stockState: winnerVariant ? parseStockStateFromRecord(winnerVariant) : "IN_STOCK",
            price: currentPrice,
            rawPayload: {
              itemNumber: firstScalarText(winnerVariant?.itemNumber),
              barcode: firstScalarText(winnerVariant?.barcode),
              stockState: winnerVariant ? parseStockStateFromRecord(winnerVariant) : "IN_STOCK",
              url: winnerVariant ? readVariantUrl(winnerVariant, productUrl) ?? productUrl : productUrl,
              price: currentPrice,
            },
          } satisfies ParsedVariant,
        ];

  const attributeEntries = toArray(product.attributes)
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .map((entry) => ({
      key: firstText(isRecord(entry.key) ? entry.key.name : entry.key) ?? "",
      value: firstText(isRecord(entry.value) ? entry.value.name : entry.value) ?? "",
    }))
    .filter((attribute) => attribute.key && attribute.value);

  const images = [...new Set(readImageUrls(product.images))].filter((image) => !image.toLowerCase().includes("product-placeholder"));
  const brand = readBrand(product.brand) ?? jsonLdFallback?.brand ?? null;
  const title = buildDisplayTitle(firstText(product.name) ?? jsonLdFallback?.title ?? null, brand);

  if (!title) {
    return null;
  }

  return {
    title,
    brand,
    category: firstText(isRecord(product.category) ? product.category.name : product.category) ?? jsonLdFallback?.category ?? null,
    descriptionRaw: firstText(product.description) ?? jsonLdFallback?.descriptionRaw ?? null,
    attributes: attributeEntries.length > 0 ? attributeEntries : jsonLdFallback?.attributes ?? [],
    images: images.length > 0 ? images : jsonLdFallback?.images ?? [],
    price: currentPrice,
    variants: normalizedVariants,
  };
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
    const url = tryNormalizeUrl(element.attr("data-url"));

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
        url,
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
              url: null,
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
      const url = readUrlCandidate(null, variantOffer?.url, variantNode.url);
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
          url,
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
              url: readUrlCandidate(null, groupOffer?.url, productNode.url),
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

  const envoyParsed = parseFromEnvoyProps(html);
  if (envoyParsed) {
    return envoyParsed;
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
