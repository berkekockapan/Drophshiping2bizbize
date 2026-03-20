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
  }>;
}

export interface StoredAiProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: string;
  isActive: boolean;
  lastSeenAt: number | null;
  connectorStatusSnapshot: string | null;
}

export async function listStoredProfiles(db: D1Database) {
  const result = await db
    .prepare(
      `select id, label, email_masked as emailMasked, provider, is_active as isActive,
              last_seen_at as lastSeenAt, connector_status_snapshot as connectorStatusSnapshot
       from ai_profiles
       order by is_active desc, last_seen_at desc, id asc`,
    )
    .all<{
      id: string;
      label: string;
      emailMasked: string | null;
      provider: string;
      isActive: number | boolean;
      lastSeenAt: number | null;
      connectorStatusSnapshot: string | null;
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
    const existing = await db
      .prepare("select id from ai_profiles where id = ? limit 1")
      .bind(profile.id)
      .first<{ id: string }>();

    if (existing) {
      await db
        .prepare(
          `update ai_profiles
           set label = ?, email_masked = ?, provider = ?, is_active = ?, last_seen_at = ?, connector_status_snapshot = ?
           where id = ?`,
        )
        .bind(
          profile.label,
          profile.emailMasked,
          profile.provider,
          profile.isActive ? 1 : 0,
          now,
          connectorSnapshot,
          profile.id,
        )
        .run();
    } else {
      await db
        .prepare(
          `insert into ai_profiles (
            id, label, email_masked, provider, is_active, last_seen_at, connector_status_snapshot
          ) values (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          profile.id,
          profile.label,
          profile.emailMasked,
          profile.provider,
          profile.isActive ? 1 : 0,
          now,
          connectorSnapshot,
        )
        .run();
    }
  }

  return {
    items: await listStoredProfiles(db),
    connectorStatus: input.connectorStatus,
  };
}