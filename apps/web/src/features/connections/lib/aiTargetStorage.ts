export interface AiTargetCache {
  baseUrl: string;
  label: string;
  updatedAt: number | null;
}

const AI_TARGET_BASE_URL_KEY = "aiTarget.baseUrl";
const AI_TARGET_LABEL_KEY = "aiTarget.label";
const AI_TARGET_UPDATED_AT_KEY = "aiTarget.updatedAt";

export function readAiTargetCache(): AiTargetCache | null {
  const baseUrl = localStorage.getItem(AI_TARGET_BASE_URL_KEY)?.trim() ?? "";
  const label = localStorage.getItem(AI_TARGET_LABEL_KEY)?.trim() ?? "";

  if (!baseUrl || !label) {
    return null;
  }

  const rawUpdatedAt = localStorage.getItem(AI_TARGET_UPDATED_AT_KEY);
  const parsedUpdatedAt = rawUpdatedAt == null ? Number.NaN : Number(rawUpdatedAt);

  return {
    baseUrl,
    label,
    updatedAt: Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : null,
  };
}

export function writeAiTargetCache(input: { baseUrl: string; label: string }) {
  localStorage.setItem(AI_TARGET_BASE_URL_KEY, input.baseUrl.trim());
  localStorage.setItem(AI_TARGET_LABEL_KEY, input.label.trim());
  localStorage.setItem(AI_TARGET_UPDATED_AT_KEY, String(Date.now()));
}

export function clearAiTargetCache() {
  localStorage.removeItem(AI_TARGET_BASE_URL_KEY);
  localStorage.removeItem(AI_TARGET_LABEL_KEY);
  localStorage.removeItem(AI_TARGET_UPDATED_AT_KEY);
}
