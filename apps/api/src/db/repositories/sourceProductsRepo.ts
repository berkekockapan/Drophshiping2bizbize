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
  sourceCategoryId: string | null;
  sortOrder: number | null;
  deletedAt: number | null;
  deletedReason: string | null;
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

export interface SourceProductRecord {
  id: string;
  ownerKey: OwnerKey;
  title: string;
  sourceUrl: string;
  platform: string | null;
  notes: string | null;
  sourceCategoryId: string | null;
  sourceCategoryName: string | null;
  sortOrder: number | null;
  deletedAt: number | null;
  deletedReason: string | null;
  createdAt: number;
  updatedAt: number;
  linkedEtsyCount: number;
}

export interface SourceProductManagementDetailRecord {
  sourceProduct: SourceProductRecord;
  linkedEtsyItems: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

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

function categoryClause(categoryId: string | null) {
  if (categoryId === null) {
    return "source_category_id is null";
  }

  return "source_category_id = ?";
}

function categoryValues(categoryId: string | null) {
  return categoryId === null ? [] : [categoryId];
}

interface ManagementRow {
  id: string;
  ownerKey: OwnerKey;
  title: string;
  sourceUrl: string;
  platform: string | null;
  notes: string | null;
  sourceCategoryId: string | null;
  sourceCategoryName: string | null;
  sortOrder: number | null;
  deletedAt: number | null;
  deletedReason: string | null;
  createdAt: number;
  updatedAt: number;
  linkedEtsyCount: number;
}

function mapManagementRow(row: ManagementRow): SourceProductRecord {
  return {
    id: row.id,
    ownerKey: row.ownerKey,
    title: row.title,
    sourceUrl: row.sourceUrl,
    platform: row.platform,
    notes: row.notes,
    sourceCategoryId: row.sourceCategoryId,
    sourceCategoryName: row.sourceCategoryName,
    sortOrder: row.sortOrder,
    deletedAt: row.deletedAt,
    deletedReason: row.deletedReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    linkedEtsyCount: row.linkedEtsyCount,
  };
}

export function createSourceProductsRepo(db: D1Database) {
  async function loadActiveCategoryRows(ownerKey: OwnerKey, categoryId: string | null) {
    const result = await db
      .prepare(
        `select id
         from source_products
         where owner_key = ?
           and deleted_at is null
           and ${categoryClause(categoryId)}
         order by sort_order asc, created_at asc, id asc`,
      )
      .bind(ownerKey, ...categoryValues(categoryId))
      .all<{ id: string }>();

    return result.results;
  }

  async function normalizeBucketOrder(ownerKey: OwnerKey, categoryId: string | null, now: Date) {
    const rows = await loadActiveCategoryRows(ownerKey, categoryId);
    if (rows.length === 0) {
      return;
    }

    await runWithWriteRetry(async () => {
      await db.batch!(
        rows.map((row, index) =>
          db
            .prepare(
              `update source_products
               set sort_order = ?, updated_at = ?
               where id = ?
                 and owner_key = ?
                 and deleted_at is null`,
            )
            .bind(index, now.getTime(), row.id, ownerKey),
        ),
      );
    });
  }

  async function getNextSortOrder(ownerKey: OwnerKey, categoryId: string | null) {
    const row = await db
      .prepare(
        `select coalesce(max(sort_order), -1) as maxSort
         from source_products
         where owner_key = ?
           and deleted_at is null
           and ${categoryClause(categoryId)}`,
      )
      .bind(ownerKey, ...categoryValues(categoryId))
      .first<{ maxSort: number | null }>();

    return (row?.maxSort ?? -1) + 1;
  }

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
      const where = ["p.owner_key = ?", "p.deleted_at is null", searchClause.query].filter(Boolean).join(" ");
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
                  source_url_normalized as sourceUrlNormalized,
                  source_platform as sourcePlatform,
                  note,
                  source_category_id as sourceCategoryId,
                  sort_order as sortOrder,
                  deleted_at as deletedAt,
                  deleted_reason as deletedReason,
                  created_at as createdAt,
                  updated_at as updatedAt
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
      const nextSortOrder = await getNextSortOrder(input.ownerKey, null);

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `insert into source_products (
              id,
              owner_key,
              source_title,
              source_url,
              source_url_normalized,
              source_platform,
              note,
              source_category_id,
              sort_order,
              deleted_at,
              deleted_reason,
              created_at,
              updated_at
            )
            values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            input.id,
            input.ownerKey,
            input.sourceTitle,
            input.sourceUrl,
            input.sourceUrlNormalized,
            input.sourcePlatform,
            input.note,
            null,
            nextSortOrder,
            null,
            null,
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
    async get(ownerKey: OwnerKey, sourceProductId: string) {
      const row = await db
        .prepare(
          `select p.id,
                  p.owner_key as ownerKey,
                  p.source_title as title,
                  p.source_url as sourceUrl,
                  p.source_platform as platform,
                  p.note as notes,
                  p.source_category_id as sourceCategoryId,
                  c.name as sourceCategoryName,
                  p.sort_order as sortOrder,
                  p.deleted_at as deletedAt,
                  p.deleted_reason as deletedReason,
                  p.created_at as createdAt,
                  p.updated_at as updatedAt,
                  coalesce(link_counts.linked_etsy_count, 0) as linkedEtsyCount
           from source_products p
           left join source_product_categories c
             on c.id = p.source_category_id
            and c.owner_key = p.owner_key
           left join (
             select source_product_id, count(*) as linked_etsy_count
             from source_product_etsy_links
             where owner_key = ?
             group by source_product_id
           ) link_counts
             on link_counts.source_product_id = p.id
           where p.owner_key = ?
             and p.id = ?
           limit 1`,
        )
        .bind(ownerKey, ownerKey, sourceProductId)
        .first<ManagementRow>();

      return row ? mapManagementRow(row) : null;
    },
    async getManagementDetail(ownerKey: OwnerKey, sourceProductId: string) {
      const sourceProduct = await repo.get(ownerKey, sourceProductId);
      if (!sourceProduct) {
        return null;
      }

      const linkedEtsyItems = (
        await db
          .prepare(
            `select id,
                    coalesce(etsy_listing_id, etsy_url) as title,
                    etsy_url as url
             from source_product_etsy_links
             where owner_key = ?
               and source_product_id = ?
             order by created_at asc, id asc`,
          )
          .bind(ownerKey, sourceProductId)
          .all<{ id: string; title: string; url: string }>()
      ).results;

      return {
        sourceProduct,
        linkedEtsyItems,
      } satisfies SourceProductManagementDetailRecord;
    },
    async listActive(
      ownerKey: OwnerKey,
      filters: { search?: string | null; categoryId?: string | "uncategorized" | null } = {},
    ) {
      const clauses: string[] = ["p.owner_key = ?", "p.deleted_at is null"];
      const searchClause = buildSearchClause(filters.search ?? null);
      const values: unknown[] = [ownerKey, ...searchClause.values];

      if (searchClause.query) {
        clauses.push(searchClause.query.replace(/^and\s+/i, ""));
      }

      if (filters.categoryId === "uncategorized") {
        clauses.push("p.source_category_id is null");
      } else if (typeof filters.categoryId === "string" && filters.categoryId) {
        clauses.push("p.source_category_id = ?");
        values.push(filters.categoryId);
      }

      const rows = await db
        .prepare(
          `select p.id,
                  p.owner_key as ownerKey,
                  p.source_title as title,
                  p.source_url as sourceUrl,
                  p.source_platform as platform,
                  p.note as notes,
                  p.source_category_id as sourceCategoryId,
                  c.name as sourceCategoryName,
                  p.sort_order as sortOrder,
                  p.deleted_at as deletedAt,
                  p.deleted_reason as deletedReason,
                  p.created_at as createdAt,
                  p.updated_at as updatedAt,
                  coalesce(link_counts.linked_etsy_count, 0) as linkedEtsyCount
           from source_products p
           left join source_product_categories c
             on c.id = p.source_category_id
            and c.owner_key = p.owner_key
           left join (
             select source_product_id, count(*) as linked_etsy_count
             from source_product_etsy_links
             where owner_key = ?
             group by source_product_id
           ) link_counts
             on link_counts.source_product_id = p.id
           where ${clauses.join(" and ")}
           order by case when p.source_category_id is null then 1 else 0 end asc,
                    lower(coalesce(c.name, '')) asc,
                    p.sort_order asc,
                    p.created_at asc,
                    p.id asc`,
        )
        .bind(ownerKey, ...values)
        .all<ManagementRow>();

      return rows.results.map(mapManagementRow);
    },
    async listTrash(ownerKey: OwnerKey) {
      const rows = await db
        .prepare(
          `select p.id,
                  p.owner_key as ownerKey,
                  p.source_title as title,
                  p.source_url as sourceUrl,
                  p.source_platform as platform,
                  p.note as notes,
                  p.source_category_id as sourceCategoryId,
                  c.name as sourceCategoryName,
                  p.sort_order as sortOrder,
                  p.deleted_at as deletedAt,
                  p.deleted_reason as deletedReason,
                  p.created_at as createdAt,
                  p.updated_at as updatedAt,
                  coalesce(link_counts.linked_etsy_count, 0) as linkedEtsyCount
           from source_products p
           left join source_product_categories c
             on c.id = p.source_category_id
            and c.owner_key = p.owner_key
           left join (
             select source_product_id, count(*) as linked_etsy_count
             from source_product_etsy_links
             where owner_key = ?
             group by source_product_id
           ) link_counts
             on link_counts.source_product_id = p.id
           where p.owner_key = ?
             and p.deleted_at is not null
           order by p.deleted_at desc, p.created_at asc, p.id asc`,
        )
        .bind(ownerKey, ownerKey)
        .all<ManagementRow>();

      return rows.results.map(mapManagementRow);
    },
    async setCategory(ownerKey: OwnerKey, sourceProductId: string, categoryId: string | null, now: Date) {
      const current = await repo.get(ownerKey, sourceProductId);
      if (!current || current.deletedAt) {
        return null;
      }

      const currentCategoryId = current.sourceCategoryId ?? null;
      if (currentCategoryId === categoryId) {
        return current;
      }

      const nextSortOrder = await getNextSortOrder(ownerKey, categoryId);

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `update source_products
             set source_category_id = ?,
                 sort_order = ?,
                 updated_at = ?
             where id = ?
               and owner_key = ?
               and deleted_at is null`,
          )
          .bind(categoryId, nextSortOrder, now.getTime(), sourceProductId, ownerKey)
          .run();
      });

      await normalizeBucketOrder(ownerKey, currentCategoryId, now);
      return repo.get(ownerKey, sourceProductId);
    },
    async reorder(ownerKey: OwnerKey, categoryId: string | null, orderedIds: string[], now: Date) {
      const rows = await loadActiveCategoryRows(ownerKey, categoryId);
      const actualIds = rows.map((row) => row.id);
      const expectedIds = new Set(orderedIds);

      if (
        actualIds.length !== orderedIds.length ||
        expectedIds.size !== orderedIds.length ||
        actualIds.some((id) => !expectedIds.has(id))
      ) {
        return null;
      }

      await runWithWriteRetry(async () => {
        await db.batch!(
          orderedIds.map((id, index) =>
            db
              .prepare(
                `update source_products
                 set sort_order = ?, updated_at = ?
                 where id = ?
                   and owner_key = ?
                   and deleted_at is null`,
              )
              .bind(index, now.getTime(), id, ownerKey),
          ),
        );
      });

      return orderedIds;
    },
    async softDelete(ownerKey: OwnerKey, sourceProductId: string, now: Date) {
      const current = await repo.get(ownerKey, sourceProductId);
      if (!current || current.deletedAt) {
        return false;
      }

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `update source_products
             set deleted_at = ?,
                 deleted_reason = ?,
                 sort_order = null,
                 updated_at = ?
             where id = ?
               and owner_key = ?
               and deleted_at is null`,
          )
          .bind(now.getTime(), "user", now.getTime(), sourceProductId, ownerKey)
          .run();
      });

      await normalizeBucketOrder(ownerKey, current.sourceCategoryId ?? null, now);
      return true;
    },
    async restore(ownerKey: OwnerKey, sourceProductId: string, now: Date) {
      const current = await repo.get(ownerKey, sourceProductId);
      if (!current || !current.deletedAt) {
        return false;
      }

      let targetCategoryId = current.sourceCategoryId ?? null;
      if (targetCategoryId) {
        const category = await db
          .prepare(
            `select id
             from source_product_categories
             where owner_key = ?
               and id = ?
             limit 1`,
          )
          .bind(ownerKey, targetCategoryId)
          .first<{ id: string }>();

        if (!category) {
          targetCategoryId = null;
        }
      }

      const nextSortOrder = await getNextSortOrder(ownerKey, targetCategoryId);

      await runWithWriteRetry(async () => {
        await db
          .prepare(
            `update source_products
             set deleted_at = null,
                 deleted_reason = null,
                 source_category_id = ?,
                 sort_order = ?,
                 updated_at = ?
             where id = ?
               and owner_key = ?
               and deleted_at is not null`,
          )
          .bind(targetCategoryId, nextSortOrder, now.getTime(), sourceProductId, ownerKey)
          .run();
      });

      return true;
    },
    async permanentlyDelete(ownerKey: OwnerKey, sourceProductId: string) {
      const current = await repo.get(ownerKey, sourceProductId);
      if (!current || !current.deletedAt) {
        return false;
      }

      await runWithWriteRetry(async () => {
        await db.batch!([
          db
            .prepare(
              `delete from source_product_etsy_links
               where owner_key = ?
                 and source_product_id = ?`,
            )
            .bind(ownerKey, sourceProductId),
          db
            .prepare(
              `delete from source_products
               where owner_key = ?
                 and id = ?
                 and deleted_at is not null`,
            )
            .bind(ownerKey, sourceProductId),
        ]);
      });

      return true;
    },
  };

  return repo;
}
