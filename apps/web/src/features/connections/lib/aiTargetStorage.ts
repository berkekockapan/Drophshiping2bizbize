export interface AiTargetCache {
  baseUrl: string;
}

const AI_TARGET_BASE_URL_KEY = "aiTarget.baseUrl";

export function readAiTargetCache(): AiTargetCache | null {
  const baseUrl = localStorage.getItem(AI_TARGET_BASE_URL_KEY)?.trim() ?? "";

  if (!baseUrl) {
    return null;
  }

  return {
    baseUrl,
  };
}

export function writeAiTargetCache(input: { baseUrl: string }) {
  localStorage.setItem(AI_TARGET_BASE_URL_KEY, input.baseUrl.trim());
}

export function clearAiTargetCache() {
  localStorage.removeItem(AI_TARGET_BASE_URL_KEY);
}
