const MARKETPLACE_NOISE_PATTERNS = [
  /\btrendyol(?:['’]a)?\b/gi,
  /\byorumlarini inceleyin\b/gi,
  /\bindirimli fiyat\b/gi,
  /\bsepete ekle\b/gi,
  /\bkupon\b/gi,
  /\bkargo\b/gi,
  /\btaksit\b/gi,
  /https?:\/\/\S+/gi,
  /\bwww\.\S+/gi,
  /\bcdn\.\S+/gi,
] as const;

const BOILERPLATE_SENTENCE_PATTERNS = [
  /\b(origin|country of origin|made in|warranty|warranty period|care instructions?|washing instructions?)\b/i,
  /\b(garanti\s*suresi|garanti\s*süresi|mensei|menşei|bakim\s*talimati|bakım\s*talimatı)\b/i,
] as const;

const USELESS_ATTRIBUTE_KEYS = new Set([
  "garanti suresi",
  "garanti süresi",
  "mensei",
  "menşei",
  "bakim talimati",
  "bakım talimatı",
  "marka",
  "brand",
  "brand name",
]);

const CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeLookupText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function sanitizeFactText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  let next = value;
  for (const pattern of MARKETPLACE_NOISE_PATTERNS) {
    next = next.replace(pattern, " ");
  }

  return collapseWhitespace(next.replace(/[|•]+/g, " "));
}

function buildBrandRegexes(brand: string | null | undefined) {
  const tokens = sanitizeFactText(brand)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) {
    return [];
  }

  const flexiblePattern = tokens.map(escapeRegExp).join("[\\s\\-_/]*");
  const compactToken = tokens.join("");
  const patterns = [new RegExp(`\\b${flexiblePattern}\\b`, "giu")];

  if (compactToken.length >= 4) {
    patterns.push(new RegExp(`\\b${escapeRegExp(compactToken)}\\b`, "giu"));
  }

  return patterns;
}

export function stripBrandFromText(value: string | null | undefined, brand: string | null | undefined) {
  let withoutBrand = sanitizeFactText(value);

  if (!withoutBrand || !sanitizeFactText(brand)) {
    return withoutBrand;
  }

  for (const pattern of buildBrandRegexes(brand)) {
    withoutBrand = withoutBrand.replace(pattern, " ");
  }

  return collapseWhitespace(
    withoutBrand
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+[-,:/|]+\s+/g, " ")
    .replace(/^[-,:/| ]+|[-,:/| ]+$/g, " "),
  );
}

export function splitSanitizedSentences(value: string | null | undefined) {
  return sanitizeFactText(value)
    .split(/[.!?\n]+/)
    .map((sentence) => collapseWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12)
    .filter((sentence) => !BOILERPLATE_SENTENCE_PATTERNS.some((pattern) => pattern.test(sentence)))
    .slice(0, 4);
}

export function isUsefulAttribute(key: string | null | undefined) {
  const normalized = normalizeLookupText(sanitizeFactText(key));
  return Boolean(normalized) && !USELESS_ATTRIBUTE_KEYS.has(normalized);
}

export function collectAllowedClaimTokens(lines: string[]) {
  const haystack = lines.join(" ").toLowerCase();
  return CLAIM_TOKENS.filter((token) => haystack.includes(token));
}

export function collectBannedBrandTokens(brand: string | null | undefined) {
  const cleaned = sanitizeFactText(brand);
  if (!cleaned) {
    return [];
  }

  const compact = cleaned.replace(/[^a-z0-9]+/gi, "");
  return [...new Set([cleaned, compact].filter((token) => token.length >= 4))];
}
