import type {
  SourceProductDetailResponse,
  SourceProductEtsyLink,
  SourceProductListResponse,
  SourceProductPlatform,
  SourceProductSummary,
} from "@trendyol-etsy/shared";

import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";
import { sourceProductEtsyLinks, sourceProducts } from "../schema";

export interface SourceProductRow {
  id: string;
  ownerKey: OwnerKey;
  sourceTitle: string;
  sourceUrl: string;
  sourceUrlNormalized: string;
  sourcePlatform: SourceProductPlatform;
  note: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface SourceProductEtsyLinkRow {
  id: string;
  sourceProductId: string;
  ownerKey: OwnerKey;
  etsyUrl: string;
  etsyUrlNormalized: string;
  etsyListingId: string | null;
  createdAt: number;
}

interface SourceProductListRow {
  id: string;
  ownerKey: OwnerKey;
  sourceTitle: string;
  sourceUrl: string;
  sourcePlatform: SourceProductPlatform;
  notePreview: string | null;
  etsyLinkCount: number;
  updatedAt: number;
}

interface SourceProductDetailRow extends SourceProductRow {}

function buildSearchPatterns(search: string | null) {
  if (!search?.trim()) {
    return [] as string[];
  }

  const patterns = new Set<string>([`%${search.trim()}%`]);

  try {
    const normalizedSourceUrl = new URL(search.trim());
    normalizedSourceUrl.hash = "";
    normalizedSourceUrl.protocol = normalizedSourceUrl.protocol.toLowerCase();
    normalizedSourceUrl.hostname = normalizedSourceUrl.hostname.toLowerCase();
    if (normalizedSourceUrl.pathname !== "/") {
      normalizedSourceUrl.pathname = normalizedSourceUrl.pathname.replace(/\/+$/, "");
    }

    const params = [...normalizedSourceUrl.searchParams.entries()].sort(([left], [right]) =>
      left.localeCompare(right),
    );
    normalizedSourceUrl.search = "";
    for (const [key, value] of params) {
      normalizedSourceUrl.searchParams.append(key, value);
    }

    patterns.add(`%${normalizedSourceUrl.toString()}%`);
  } catch {
    // not a URL
  }

  try {
    const normalizedEtsyUrl = new URL(search.trim());
    const listingId = normalizedEtsyUrl.pathname.match(/\/listing\/(\d+)/i)?.[1] ?? null;
    if (listingId) {
      patterns.add(`%https://www.etsy.com/listing/${listingId}%`);
      patterns.add(`%${listingId}%`);
    }
  } catch {
    // not a URL
  }

  return [...patterns];
}

function buildSearchClause(search: string | null) {
  const patterns = buildSearchPatterns(search);
  if (patterns.length === 0) {
    return { query: "", values: [] as unknown[] };
  }

  const clause = patterns
    .map(
      () =>
        `(p.source_title like ? or p.source_url like ? or p.source_url_normalized like ? or coalesce(p.note, '') like ? or exists (select 1 from source_product_etsy_links l where l.source_product_id = p.id and (l.etsy_url like ? or l.etsy_url_normalized like ? or coalesce(l.etsy_listing_id, '') like ?)))`,
    )
    .join(" or ");

  return {
    query: `and (${clause})`,
    values: patterns.flatMap((pattern) => [pattern, pattern, pattern, pattern, pattern, pattern, pattern]),
  };
}

function mapSummaryRow(row: SourceProductListRow): SourceProductSummary {
  return {
    id: row.id,
    ownerKey: row.ownerKey,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    sourcePlatform: row.sourcePlatform,
    notePreview: row.notePreview,
    etsyLinkCount: row.etsyLinkCount,
    updatedAt: row.updatedAt,
  };
}

function mapLinkRow(row: SourceProductEtsyLinkRow): SourceProductEtsyLink {
  return {
    id: row.id,
    sourceProductId: row.sourceProductId,
    ownerKey: row.ownerKey,
    etsyUrl: row.etsyUrl,
    etsyUrlNormalized: row.etsyUrlNormalized,
    etsyListingId: row.etsyListingId,
    createdAt: row.createdAt,
  };
}

function mapDetailRow(row: SourceProductDetailRow): SourceProductDetailResponse["product"] {
  return {
    id: row.id,
    ownerKey: row.ownerKey,
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    sourcePlatform: row.sourcePlatform,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function createSourceProductsRepo(db: D1Database) {
  const repo = {
    db,
    tables: {
      sourceProducts,
      sourceProductEtsyLinks,
    },
    async hasSourceProduct(ownerKey: OwnerKey, sourceProductId: string) {
      const row = await db
        .prepare(
          `select 1 as found
           from source_products
           where owner_key = ? and id = ?
           limit 1`,
        )
        .bind(ownerKey, sourceProductId)
        .first<{ found: number }>();

      return Boolean(row);
    },
    async findByNormalizedSourceUrl(ownerKey: OwnerKey, sourceUrlNormalized: string, excludeSourceProductId?: string) {
      const query = [
        `select id
         from source_products
         where owner_key = ?
           and source_url_normalized = ?`,
      ];
      const values: unknown[] = [ownerKey, sourceUrlNormalized];

      if (excludeSourceProductId) {
        query[0] += " and id <> ?";
        values.push(excludeSourceProductId);
      }

      return db.prepare(`${query[0]} limit 1`).bind(...values).first<{ id: string }>();
    },
    async findByNormalizedEtsyUrl(ownerKey: OwnerKey, etsyUrlNormalized: string, excludeSourceProductId?: string) {
      const query = [
        `select id, source_product_id as sourceProductId
         from source_product_etsy_links
         where owner_key = ?
           and etsy_url_normalized = ?`,
      ];
      const values: unknown[] = [ownerKey, etsyUrlNormalized];

      if (excludeSourceProductId) {
        query[0] += " and source_product_id <> ?";
        values.push(excludeSourceProductId);
      }

      return db
        .prepare(`${query[0]} limit 1`)
        .bind(...values)
        .first<{ id: string; sourceProductId: string }>();
    },
    async listSourceProducts(ownerKey: OwnerKey, search: string | null) {
      const searchClause = buildSearchClause(search);
      const where = ["p.owner_key = ?", searchClause.query].filter(Boolean).join(" ");
      const values: unknown[] = [ownerKey, ...searchClause.values];

      const rows = await db
        .prepare(
          `select p.id, p.owner_key as ownerKey, p.source_title as sourceTitle, p.source_url as sourceUrl,
                  p.source_platform as sourcePlatform,
                  case when p.note is null then null else substr(p.note, 1, 120) end as notePreview,
                  (select count(*) from source_product_etsy_links l where l.source_product_id = p.id) as etsyLinkCount,
                  p.updated_at as updatedAt
           from source_products p
           where ${where}
           order by p.updated_at desc, p.created_at desc`,
        )
        .bind(...values)
        .all<SourceProductListRow>();

      const total = await db
        .prepare(
          `select count(*) as count
           from source_products p
           where ${where}`,
        )
        .bind(...values)
        .first<{ count: number }>();

      return {
        items: rows.results.map(mapSummaryRow),
        total: total?.count ?? 0,
      } satisfies SourceProductListResponse;
    },
    async getDetail(ownerKey: OwnerKey, sourceProductId: string) {
      const product = await db
        .prepare(
          `select id, owner_key as ownerKey, source_title as sourceTitle, source_url as sourceUrl,
                  source_platform as sourcePlatform, note, created_at as createdAt, updated_at as updatedAt
           from source_products
           where owner_key = ? and id = ?
           limit 1`,
        )
        .bind(ownerKey, sourceProductId)
        .first<SourceProductDetailRow>();

      if (!product) {
        return null;
      }

      const etsyLinks = await db
        .prepare(
          `select id, source_product_id as sourceProductId, owner_key as ownerKey, etsy_url as etsyUrl,
                  etsy_url_normalized as etsyUrlNormalized, etsy_listing_id as etsyListingId,
                  created_at as createdAt
           from source_product_etsy_links
           where owner_key = ? and source_product_id = ?
           order by created_at desc`,
        )
        .bind(ownerKey, sourceProductId)
        .all<SourceProductEtsyLinkRow>();

      return {
        product: mapDetailRow(product),
        etsyLinks: etsyLinks.results.map(mapLinkRow),
      } satisfies SourceProductDetailResponse;
    },
    async createSourceProduct(input: {
      id: string;
      ownerKey: OwnerKey;
      sourceTitle: string;
      sourceUrl: string;
      sourceUrlNormalized: string;
      sourcePlatform: SourceProductPlatform;
      note: string | null;
      createdAt: number;
      updatedAt: number;
    }) {
      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into source_products (
              id, owner_key, source_title, source_url, source_url_normalized, source_platform, note, created_at, updated_at
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.id,
            input.ownerKey,
            input.sourceTitle,
            input.sourceUrl,
            input.sourceUrlNormalized,
            input.sourcePlatform,
            input.note,
            input.createdAt,
            input.updatedAt,
          )
          .run();
      });

      return repo.getDetail(input.ownerKey, input.id);
    },
    async updateSourceProduct(
      ownerKey: OwnerKey,
      sourceProductId: string,
      changes: {
        sourceTitle?: string;
        sourceUrl?: string;
        sourceUrlNormalized?: string;
        sourcePlatform?: SourceProductPlatform;
        note?: string | null;
        updatedAt: number;
      },
    ) {
      const sets: string[] = [];
      const values: unknown[] = [];

      if (changes.sourceTitle !== undefined) {
        sets.push("source_title = ?");
        values.push(changes.sourceTitle);
      }

      if (changes.sourceUrl !== undefined) {
        sets.push("source_url = ?");
        values.push(changes.sourceUrl);
      }

      if (changes.sourceUrlNormalized !== undefined) {
        sets.push("source_url_normalized = ?");
        values.push(changes.sourceUrlNormalized);
      }

      if (changes.sourcePlatform !== undefined) {
        sets.push("source_platform = ?");
        values.push(changes.sourcePlatform);
      }

      if (changes.note !== undefined) {
        sets.push("note = ?");
        values.push(changes.note);
      }

      sets.push("updated_at = ?");
      values.push(changes.updatedAt, ownerKey, sourceProductId);

      await runWithWriteRetry(async () => {
        await db
          .prepare(`update source_products set ${sets.join(", ")} where owner_key = ? and id = ?`)
          .bind(...values)
          .run();
      });

      return repo.getDetail(ownerKey, sourceProductId);
    },
    async createSourceProductEtsyLink(input: {
      id: string;
      ownerKey: OwnerKey;
      sourceProductId: string;
      etsyUrl: string;
      etsyUrlNormalized: string;
      etsyListingId: string | null;
      createdAt: number;
    }) {
      if (!(await repo.hasSourceProduct(input.ownerKey, input.sourceProductId))) {
        return null;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into source_product_etsy_links (
              id, source_product_id, owner_key, etsy_url, etsy_url_normalized, etsy_listing_id, created_at
            )
            values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.id,
            input.sourceProductId,
            input.ownerKey,
            input.etsyUrl,
            input.etsyUrlNormalized,
            input.etsyListingId,
            input.createdAt,
          )
          .run();
      });

      return repo.getDetail(input.ownerKey, input.sourceProductId);
    },
    async deleteEtsyLink(ownerKey: OwnerKey, sourceProductId: string, etsyLinkId: string) {
      const existing = await db
        .prepare(
          `select id
           from source_product_etsy_links
           where owner_key = ? and source_product_id = ? and id = ?
           limit 1`,
        )
        .bind(ownerKey, sourceProductId, etsyLinkId)
        .first<{ id: string }>();

      if (!existing) {
        return null;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `delete from source_product_etsy_links
             where owner_key = ? and source_product_id = ? and id = ?`,
          )
          .bind(ownerKey, sourceProductId, etsyLinkId)
          .run();
      });

      return repo.getDetail(ownerKey, sourceProductId);
    },
  };

  return repo;
}
