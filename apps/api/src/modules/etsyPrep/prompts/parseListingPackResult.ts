import type { GeneratedListingPackResult } from "@trendyol-etsy/shared";

function normalizeTagsString(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))].join(", ");
}

export function parseListingPackResult(rawText: string): GeneratedListingPackResult {
  const parsed = JSON.parse(rawText) as Record<string, unknown>;

  if (typeof parsed.title !== "string" || !parsed.title.trim()) {
    throw new Error("title must be a non-empty string");
  }

  if (typeof parsed.description !== "string" || !parsed.description.trim()) {
    throw new Error("description must be a non-empty string");
  }

  if (typeof parsed.tags !== "string") {
    throw new Error("tags must be a comma-separated string");
  }

  const normalizedTags = normalizeTagsString(parsed.tags);
  if (!normalizedTags) {
    throw new Error("tags string must contain at least one tag");
  }

  return {
    title: parsed.title.trim(),
    description: parsed.description.trim(),
    tags: normalizedTags,
  };
}
