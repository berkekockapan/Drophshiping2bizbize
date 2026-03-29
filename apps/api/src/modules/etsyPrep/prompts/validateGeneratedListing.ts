import type { GeneratedListingPackResult } from "@trendyol-etsy/shared";

export interface GeneratedListingValidationContext {
  allowedClaimTokens?: readonly string[];
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

const SUPPORTED_CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;
const DEFAULT_ALLOWED_CLAIM_TOKENS = ["handmade"] as const;

export class InvalidGeneratedListingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidGeneratedListingError";
  }
}

function normalize(value: string) {
  return value.normalize("NFKC");
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

function assertNoUnsupportedClaims(value: string, context: GeneratedListingValidationContext) {
  const normalized = normalize(value).toLowerCase();
  const allowedTokens = new Set(
    [...DEFAULT_ALLOWED_CLAIM_TOKENS, ...(context.allowedClaimTokens ?? [])].map((token) => token.toLowerCase()),
  );

  for (const token of SUPPORTED_CLAIM_TOKENS) {
    if (token === "handmade") {
      continue;
    }

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

export function validateGeneratedListing(
  result: GeneratedListingPackResult,
  context: GeneratedListingValidationContext = {},
) {
  const combined = `${result.title}\n${result.description}\n${result.tags}`;

  assertNoBannedTokens(combined);
  assertMostlyEnglish(combined);
  assertNoUnsupportedClaims(combined, context);
  assertTitleIsNotVariantDump(result.title);
}
