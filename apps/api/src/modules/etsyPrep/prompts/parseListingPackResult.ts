import type { GeneratedListingPackResult } from "@dropshiping2bizbize/shared";

import type { GeneratedListingValidationContext } from "./validateGeneratedListing";
import { InvalidGeneratedListingError, validateGeneratedListing } from "./validateGeneratedListing";

function normalizeTagsString(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].join(", ");
}

export function parseListingPackResult(
  rawText: string,
  context: GeneratedListingValidationContext = {},
): GeneratedListingPackResult {
  const normalizedRawText = rawText.trim();

  if (/```/.test(normalizedRawText)) {
    throw new InvalidGeneratedListingError("Generated listing must not include markdown code fences.");
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(normalizedRawText) as Record<string, unknown>;
  } catch {
    throw new InvalidGeneratedListingError("Generated listing must be valid JSON.");
  }

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    throw new InvalidGeneratedListingError("title must be a non-empty string");
  }

  if (typeof parsed.description !== "string" || !parsed.description.trim()) {
    throw new InvalidGeneratedListingError("description must be a non-empty string");
  }

  if (typeof parsed.tags !== "string") {
    throw new InvalidGeneratedListingError("tags must be a comma-separated string");
  }

  const normalizedTags = normalizeTagsString(parsed.tags);
  if (!normalizedTags) {
    throw new InvalidGeneratedListingError("tags string must contain at least one tag");
  }

  const result = {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    tags: normalizedTags,
  };

  validateGeneratedListing(result, context);
  return result;
}

