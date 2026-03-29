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

const USELESS_ATTRIBUTE_KEYS = new Set(["garanti suresi", "mensei", "bakim talimati"]);

const CLAIM_TOKENS = ["handmade", "organic", "premium", "luxury", "gift-ready"] as const;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
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

export function splitSanitizedSentences(value: string | null | undefined) {
  return sanitizeFactText(value)
    .split(/[.!?\n]+/)
    .map((sentence) => collapseWhitespace(sentence))
    .filter((sentence) => sentence.length >= 12)
    .slice(0, 4);
}

export function isUsefulAttribute(key: string | null | undefined) {
  const normalized = sanitizeFactText(key).toLowerCase();
  return Boolean(normalized) && !USELESS_ATTRIBUTE_KEYS.has(normalized);
}

export function collectAllowedClaimTokens(lines: string[]) {
  const haystack = lines.join(" ").toLowerCase();
  return CLAIM_TOKENS.filter((token) => haystack.includes(token));
}
