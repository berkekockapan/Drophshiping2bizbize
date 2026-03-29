import type { GeneratedListingPackResult } from "@trendyol-etsy/shared";

export interface GeneratedListingValidationContext {
  allowedClaimTokens?: readonly string[];
  forbiddenBrandPhrases?: readonly string[];
}

const BANNED_OUTPUT_PATTERNS = [
  /\btrendyol\b/i,
  /\byorumlarini inceleyin\b/i,
  /\bindirimli fiyat\b/i,
  /https?:\/\//i,
  /\bcdn\./i,
] as const;

const TURKISH_LEAKAGE_PATTERNS = [
  /\b(ve|icin|i?çin|kadin|kadın|erkek|yumusak|yumuşak|renk|beden|hediye|pamuk|dokulu|gunluk|günlük|kullanim|kullanım|orgu|örgü|sik|şık)\b/i,
  /[ığüşöçİ]/i,
] as const;

const BOILERPLATE_PATTERNS = [
  /\b(origin|country of origin|made in)\b/i,
  /\b(warranty|warranty period)\b/i,
  /\b(care instructions?|washing instructions?)\b/i,
  /\b(return policy|shipping policy|seller policy)\b/i,
] as const;

const SUPPORTED_CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;
const TITLE_STOPWORDS = new Set(["with", "and", "for", "the", "a", "an", "of", "to", "in", "on", "from", "by"]);

export class InvalidGeneratedListingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGeneratedListingError";
  }
}

function normalize(value: string) {
  return value.normalize("NFKC");
}

function normalizeLookup(value: string) {
  return normalize(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function assertNoBannedTokens(value: string) {
  const normalized = normalize(value);
  if (BANNED_OUTPUT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new InvalidGeneratedListingError("Generated listing contains banned marketplace or URL tokens.");
  }
}

function assertMostlyEnglish(value: string) {
  const normalized = normalize(value);
  if (TURKISH_LEAKAGE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new InvalidGeneratedListingError("Generated listing must be predominantly English.");
  }
}

function assertNoForbiddenBrands(value: string, context: GeneratedListingValidationContext) {
  const haystack = ` ${normalizeLookup(value)} `;
  for (const brandPhrase of context.forbiddenBrandPhrases ?? []) {
    const normalizedBrand = normalizeLookup(brandPhrase);
    if (normalizedBrand && haystack.includes(` ${normalizedBrand} `)) {
      throw new InvalidGeneratedListingError("Generated listing must not mention the source brand.");
    }
  }
}

function assertNoUnsupportedClaims(value: string, context: GeneratedListingValidationContext) {
  const normalized = normalize(value).toLowerCase();
  const allowedTokens = new Set((context.allowedClaimTokens ?? []).map((token) => token.toLowerCase()));

  for (const token of SUPPORTED_CLAIM_TOKENS) {
    if (normalized.includes(token) && !allowedTokens.has(token)) {
      throw new InvalidGeneratedListingError(`Generated listing uses unsupported claim token: ${token}`);
    }
  }
}

function assertTitleIsNotVariantDump(title: string) {
  const normalized = normalize(title);
  const separatorCount = (normalized.match(/[|,;/:-]/g) ?? []).length;
  const looksLikeVariantMatrix =
    separatorCount >= 4 || ((/\b(variant|variants|size|color|colour|option|options)\b/i.test(normalized) || /\/\s*[^\s/]+\s*\/\s*[^\s/]+/i.test(normalized)) && separatorCount >= 2);

  if (looksLikeVariantMatrix) {
    throw new InvalidGeneratedListingError("Generated title looks like a variant matrix dump.");
  }
}

function assertNoBoilerplate(result: GeneratedListingPackResult) {
  const combined = `${result.title}\n${result.description}`;
  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(combined))) {
    throw new InvalidGeneratedListingError("Generated listing contains origin, warranty, or care boilerplate.");
  }
}

function assertTitleQuality(title: string) {
  const normalized = normalize(title);
  const words = normalized
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]+/gu, ""))
    .filter(Boolean);
  const contentWords = words
    .map((word) => word.toLowerCase())
    .filter((word) => word.length >= 3 && !TITLE_STOPWORDS.has(word));

  if (words.length < 3) {
    throw new InvalidGeneratedListingError("Generated title is too short.");
  }

  if (words.length > 12) {
    throw new InvalidGeneratedListingError("Generated title is too long.");
  }

  const counts = new Map<string, number>();
  for (const word of contentWords) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  const repeatedTerms = [...counts.entries()].filter(([, count]) => count > 1);
  if (repeatedTerms.length > 0) {
    throw new InvalidGeneratedListingError("Generated title repeats the same product phrase.");
  }
}

function assertTagsAreStrong(tags: string) {
  const entries = tags
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (entries.length !== 13) {
    throw new InvalidGeneratedListingError("Generated tags must contain exactly 13 unique entries.");
  }

  const uniqueEntries = new Set(entries.map((entry) => entry.toLowerCase()));
  if (uniqueEntries.size !== 13) {
    throw new InvalidGeneratedListingError("Generated tags contain duplicates.");
  }

  for (const entry of entries) {
    if (entry.length > 20) {
      throw new InvalidGeneratedListingError("Generated tags must stay within Etsy's 20-character limit.");
    }
  }
}

export function validateGeneratedListing(
  result: GeneratedListingPackResult,
  context: GeneratedListingValidationContext = {},
) {
  const combined = `${result.title}\n${result.description}\n${result.tags}`;

  assertNoBannedTokens(combined);
  assertMostlyEnglish(combined);
  assertNoForbiddenBrands(combined, context);
  assertNoUnsupportedClaims(combined, context);
  assertTitleIsNotVariantDump(result.title);
  assertNoBoilerplate(result);
  assertTitleQuality(result.title);
  assertTagsAreStrong(result.tags);
}
