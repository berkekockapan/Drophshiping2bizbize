import type { D1Database } from "../../config/bindings";

export interface SyncProfileInput {
  connectorStatus: {
    status: string;
    provider: string;
  };
  profiles: Array<{
    id: string;
    label: string;
    emailMasked: string | null;
    provider: string;
    isActive: boolean;
    status: "connected" | "needs_reauth" | "disconnected" | "error";
    lastValidatedAt: number | null;
    lastError: string | null;
  }>;
}

export interface StoredAiProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: string;
  isActive: boolean;
  status: string;
  lastSeenAt: number | null;
  lastValidatedAt: number | null;
  lastError: string | null;
  connectorStatusSnapshot: string | null;
  updatedAt: number;
}

export async function listStoredProfiles(db: D1Database) {
  const result = await db
    .prepare(
      `select id, label, email_masked as emailMasked, provider, is_active as isActive,
              status, last_seen_at as lastSeenAt, last_validated_at as lastValidatedAt,
              last_error as lastError, connector_status_snapshot as connectorStatusSnapshot,
              updated_at as updatedAt
       from ai_profiles
       order by is_active desc, updated_at desc, last_seen_at desc, id asc`,
    )
    .all<{
      id: string;
      label: string;
      emailMasked: string | null;
      provider: string;
      isActive: number | boolean;
      status: string;
      lastSeenAt: number | null;
      lastValidatedAt: number | null;
      lastError: string | null;
      connectorStatusSnapshot: string | null;
      updatedAt: number;
    }>();

  return result.results.map<StoredAiProfile>((item) => ({
    ...item,
    isActive: Boolean(item.isActive),
  }));
}

export async function syncProfileMetadata(db: D1Database, input: SyncProfileInput) {
  const now = Date.now();
  const connectorSnapshot = JSON.stringify(input.connectorStatus);

  await db.prepare("update ai_profiles set is_active = 0").run();

  for (const profile of input.profiles) {
    const status = profile.status ?? "connected";
    const lastValidatedAt = profile.lastValidatedAt ?? null;
    const lastError = profile.lastError ?? null;
    const existing = await db
      .prepare("select id from ai_profiles where id = ? limit 1")
      .bind(profile.id)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(
          `update ai_profiles
           set label = ?, email_masked = ?, provider = ?, is_active = ?, status = ?, last_seen_at = ?,
               last_validated_at = ?, last_error = ?, connector_status_snapshot = ?, updated_at = ?
           where id = ?`,
        )
        .bind(
          profile.label,
          profile.emailMasked,
          profile.provider,
          profile.isActive ? 1 : 0,
          status,
          now,
          lastValidatedAt,
          lastError,
          connectorSnapshot,
          now,
          profile.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `insert into ai_profiles (
            id, label, email_masked, provider, is_active, status, last_seen_at,
            last_validated_at, last_error, connector_status_snapshot, updated_at
          ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          profile.id,
          profile.label,
          profile.emailMasked,
          profile.provider,
          profile.isActive ? 1 : 0,
          status,
          now,
          lastValidatedAt,
          lastError,
          connectorSnapshot,
          now,
        )
        .run();
    }
  }

  return {
    items: await listStoredProfiles(db),
    connectorStatus: input.connectorStatus,
  };
}
