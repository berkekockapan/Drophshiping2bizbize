import { appSettings } from "../schema";
import type { D1Database } from "../../config/bindings";

export interface AppSettingsRecord {
  id: string;
  refreshIntervalHours: number;
  promptPreferencesJson: string | null;
  connectorHealthcheckEnabled: number | boolean;
}

export interface SaveSettingsInput {
  refreshIntervalHours: number;
  promptPreferences: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
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
                  connector_healthcheck_enabled as connectorHealthcheckEnabled
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
        };
      }

      return {
        id: DEFAULT_SETTINGS_ID,
        refreshIntervalHours: 5,
        promptPreferences: null,
        connectorHealthcheckEnabled: true,
      };
    },
    async saveSettings(input: SaveSettingsInput) {
      const existing = await db
        .prepare("select id from app_settings where id = ? limit 1")
        .bind(DEFAULT_SETTINGS_ID)
        .first<{ id: string }>();

      const promptPreferencesJson = input.promptPreferences ? JSON.stringify(input.promptPreferences) : null;
      const connectorHealthcheckEnabled = input.connectorHealthcheckEnabled ?? true;

      if (existing) {
        await db
          .prepare(
            `update app_settings
             set refresh_interval_hours = ?, prompt_preferences_json = ?, connector_healthcheck_enabled = ?, updated_at = ?
             where id = ?`,
          )
          .bind(
            input.refreshIntervalHours,
            promptPreferencesJson,
            connectorHealthcheckEnabled ? 1 : 0,
            Date.now(),
            DEFAULT_SETTINGS_ID,
          )
          .run();
      } else {
        await db
          .prepare(
            `insert into app_settings (
              id, refresh_interval_hours, prompt_preferences_json, connector_healthcheck_enabled, created_at, updated_at
            ) values (?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            DEFAULT_SETTINGS_ID,
            input.refreshIntervalHours,
            promptPreferencesJson,
            connectorHealthcheckEnabled ? 1 : 0,
            Date.now(),
            Date.now(),
          )
          .run();
      }

      return this.getSettings();
    },
  };
}
