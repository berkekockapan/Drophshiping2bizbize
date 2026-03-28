import { appSettings } from "../schema";
import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

export interface AppSettingsRecord {
  id: string;
  refreshIntervalHours: number;
  promptPreferencesJson: string | null;
  connectorHealthcheckEnabled: number | boolean;
  aiTargetBaseUrl: string | null;
  aiTargetManagementKey: string | null;
  aiTargetLabel: string | null;
  aiTargetApiKey: string | null;
}

export interface SaveSettingsInput {
  refreshIntervalHours?: number;
  promptPreferences?: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
  aiTargetBaseUrl?: string | null;
  aiTargetManagementKey?: string | null;
  aiTargetLabel?: string | null;
  aiTargetApiKey?: string | null;
}

const DEFAULT_SETTINGS_ID = "default";

export function createSettingsRepo(db: D1Database) {
  return {
    db,
    tables: {
      appSettings,
    },
    async getSettings() {
      const record = await db
        .prepare(
          `select id, refresh_interval_hours as refreshIntervalHours, prompt_preferences_json as promptPreferencesJson,
                  connector_healthcheck_enabled as connectorHealthcheckEnabled,
                  ai_target_base_url as aiTargetBaseUrl,
                  ai_target_management_key as aiTargetManagementKey,
                  ai_target_label as aiTargetLabel,
                  ai_target_api_key as aiTargetApiKey
           from app_settings
           where id = ?
           limit 1`,
        )
        .bind(DEFAULT_SETTINGS_ID)
        .first<AppSettingsRecord>();

      if (record) {
        return {
          id: record.id,
          refreshIntervalHours: record.refreshIntervalHours,
          promptPreferences: record.promptPreferencesJson ? JSON.parse(record.promptPreferencesJson) : null,
          connectorHealthcheckEnabled: Boolean(record.connectorHealthcheckEnabled),
          aiTargetBaseUrl: record.aiTargetBaseUrl,
          aiTargetManagementKey: record.aiTargetManagementKey,
          aiTargetLabel: record.aiTargetLabel,
          aiTargetApiKey: record.aiTargetApiKey,
        };
      }

      return {
        id: DEFAULT_SETTINGS_ID,
        refreshIntervalHours: 5,
        promptPreferences: null,
        connectorHealthcheckEnabled: true,
        aiTargetBaseUrl: null,
        aiTargetManagementKey: null,
        aiTargetLabel: null,
        aiTargetApiKey: null,
      };
    },
    async saveSettings(input: SaveSettingsInput) {
      return runWithWriteRetry(async () => {
        const current = await this.getSettings();
        const existing = await db
          .prepare("select id from app_settings where id = ? limit 1")
          .bind(DEFAULT_SETTINGS_ID)
          .first<{ id: string }>();

        const merged = {
          ...current,
          ...(typeof input.refreshIntervalHours === "number" ? { refreshIntervalHours: input.refreshIntervalHours } : {}),
          ...(typeof input.connectorHealthcheckEnabled === "boolean"
            ? { connectorHealthcheckEnabled: input.connectorHealthcheckEnabled }
            : {}),
          ...(typeof input.promptPreferences !== "undefined" ? { promptPreferences: input.promptPreferences } : {}),
          ...(typeof input.aiTargetBaseUrl !== "undefined" ? { aiTargetBaseUrl: input.aiTargetBaseUrl } : {}),
          ...(typeof input.aiTargetManagementKey !== "undefined"
            ? { aiTargetManagementKey: input.aiTargetManagementKey }
            : {}),
          ...(typeof input.aiTargetLabel !== "undefined" ? { aiTargetLabel: input.aiTargetLabel } : {}),
          ...(typeof input.aiTargetApiKey !== "undefined" ? { aiTargetApiKey: input.aiTargetApiKey } : {}),
        };

        const promptPreferencesJson = merged.promptPreferences ? JSON.stringify(merged.promptPreferences) : null;

        if (existing) {
          await db
            .prepare(
              `update app_settings
               set refresh_interval_hours = ?, prompt_preferences_json = ?, connector_healthcheck_enabled = ?,
                   ai_target_base_url = ?, ai_target_management_key = ?, ai_target_label = ?, ai_target_api_key = ?,
                   updated_at = ?
               where id = ?`,
            )
            .bind(
              merged.refreshIntervalHours,
              promptPreferencesJson,
              merged.connectorHealthcheckEnabled ? 1 : 0,
              merged.aiTargetBaseUrl,
              merged.aiTargetManagementKey,
              merged.aiTargetLabel,
              merged.aiTargetApiKey,
              Date.now(),
              DEFAULT_SETTINGS_ID,
            )
            .run();
        } else {
          await db
            .prepare(
              `insert into app_settings (
                id, refresh_interval_hours, prompt_preferences_json, connector_healthcheck_enabled,
                ai_target_base_url, ai_target_management_key, ai_target_label, ai_target_api_key,
                created_at, updated_at
              ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            )
            .bind(
              DEFAULT_SETTINGS_ID,
              merged.refreshIntervalHours,
              promptPreferencesJson,
              merged.connectorHealthcheckEnabled ? 1 : 0,
              merged.aiTargetBaseUrl,
              merged.aiTargetManagementKey,
              merged.aiTargetLabel,
              merged.aiTargetApiKey,
              Date.now(),
              Date.now(),
            )
            .run();
        }

        return this.getSettings();
      });
    },
  };
}
