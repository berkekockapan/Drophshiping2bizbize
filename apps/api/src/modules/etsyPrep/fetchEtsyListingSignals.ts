import type { EtsyPrepView } from "./buildEtsyPrepView";

export type EtsyPrepField = "title" | "description" | "tags";

export interface EtsyListingSignals {
  keywordAngles: string[];
  audienceThemes: string[];
  policyNotes: string[];
  merchandisingNotes: string[];
}

type EtsyPrepProduct = EtsyPrepView["product"];

function tokenize(value: string | null | undefined) {
  if (!value) {
    return [];
  }

  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function buildKeywordAngles(product: EtsyPrepProduct, field: EtsyPrepField) {
  const titleTokens = tokenize(product.title);
  const baseKeywords = unique([...titleTokens.slice(0, 4), tokenize(product.category)[0] ?? "gift"]);

  const suffixByField: Record<EtsyPrepField, string> = {
    title: "title keyword angle",
    description: "description keyword angle",
    tags: "tag keyword angle",
  };

  return baseKeywords.slice(0, 4).map((keyword) => `${keyword} ${suffixByField[field]}`);
}

function buildAudienceThemes(product: EtsyPrepProduct) {
  return unique(
    [product.category, product.brand, product.title]
      .flatMap((value) => tokenize(value))
      .slice(0, 4)
      .map((token) => `${token} buyer intent`),
  );
}

function buildPolicyNotes(product: EtsyPrepProduct) {
  const notes = ["Avoid unverifiable medical or safety claims."];

  if ((product.category ?? "").toLowerCase().includes("hoodie")) {
    notes.push("Keep fabric and fit statements descriptive instead of absolute.");
  }

  return notes;
}

function buildMerchandisingNotes(product: EtsyPrepProduct) {
  const notes = [`Lead with the clearest keyword from "${product.title ?? "untitled product"}".`];

  if (product.brand) {
    notes.push(`Translate ${product.brand} positioning into generic marketplace language.`);
  }

  return notes;
}

export async function fetchEtsyListingSignals(
  fetchImpl: typeof fetch,
  field: EtsyPrepField,
  product: EtsyPrepProduct,
): Promise<EtsyListingSignals> {
  void fetchImpl;

  return {
    keywordAngles: buildKeywordAngles(product, field),
    audienceThemes: buildAudienceThemes(product),
    policyNotes: buildPolicyNotes(product),
    merchandisingNotes: buildMerchandisingNotes(product),
  };
}
