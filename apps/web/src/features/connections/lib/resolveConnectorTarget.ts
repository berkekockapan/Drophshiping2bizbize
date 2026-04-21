const DEFAULT_CONNECTOR_BASE_URL = "http://127.0.0.1:4318";

export interface ResolvedConnectorTarget {
  baseUrl: string;
  source: "desktop_default" | "settings_override";
  isOverride: boolean;
}

export function resolveConnectorTarget(
  settings: { aiTargetBaseUrl: string | null } | undefined,
  cached: { baseUrl: string } | null,
): ResolvedConnectorTarget {
  const override = settings?.aiTargetBaseUrl?.trim() || cached?.baseUrl?.trim() || "";

  if (override) {
    return {
      baseUrl: override,
      source: "settings_override",
      isOverride: true,
    };
  }

  return {
    baseUrl: DEFAULT_CONNECTOR_BASE_URL,
    source: "desktop_default",
    isOverride: false,
  };
}

