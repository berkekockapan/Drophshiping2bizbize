import type { OwnerKey } from "../../contracts/owners";
import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

export type PromptCardType = "master" | "normal";

export interface PromptLibraryPageRecord {
  id: string;
  ownerKey: OwnerKey;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PromptLibraryCardRecord {
  id: string;
  pageId: string;
  ownerKey: OwnerKey;
  cardType: PromptCardType;
  title: string;
  promptMarkdown: string;
  imageR2Key: string | null;
  imageContentType: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface PromptLibraryView {
  pages: Array<PromptLibraryPageRecord & { cards: PromptLibraryCardRecord[] }>;
}

function nowMs() {
  return Date.now();
}

function normalizeTitle(title: string) {
  return title.trim().replace(/\s+/g, " ");
}

function normalizeDescription(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePrompt(value: string | null | undefined) {
  return typeof value === "string" ? value : "";
}

function toPage(row: {
  id: string;
  ownerKey: OwnerKey;
  title: string;
  description: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}): PromptLibraryPageRecord {
  return row;
}

function toCard(row: {
  id: string;
  pageId: string;
  ownerKey: OwnerKey;
  cardType: PromptCardType;
  title: string;
  promptMarkdown: string;
  imageR2Key: string | null;
  imageContentType: string | null;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}): PromptLibraryCardRecord {
  return row;
}

async function getPageSnapshot(db: D1Database, ownerKey: OwnerKey, pageId: string) {
  return db
    .prepare(
      `select id, owner_key as ownerKey, title, description, sort_order as sortOrder,
              deleted_at as deletedAt, created_at as createdAt, updated_at as updatedAt
       from prompt_library_pages
       where owner_key = ? and id = ?
       limit 1`,
    )
    .bind(ownerKey, pageId)
    .first<Record<string, unknown>>();
}

async function getCardSnapshot(db: D1Database, ownerKey: OwnerKey, cardId: string) {
  return db
    .prepare(
      `select id, page_id as pageId, owner_key as ownerKey, card_type as cardType, title,
              prompt_markdown as promptMarkdown, image_r2_key as imageR2Key,
              image_content_type as imageContentType, sort_order as sortOrder,
              deleted_at as deletedAt, created_at as createdAt, updated_at as updatedAt
       from prompt_library_cards
       where owner_key = ? and id = ?
       limit 1`,
    )
    .bind(ownerKey, cardId)
    .first<Record<string, unknown>>();
}

async function saveRevision(
  db: D1Database,
  ownerKey: OwnerKey,
  entityType: "page" | "card",
  entityId: string,
  snapshot: Record<string, unknown> | null,
) {
  if (!snapshot) {
    return;
  }

  await db
    .prepare(
      `insert into prompt_library_revisions (id, owner_key, entity_type, entity_id, snapshot_json, created_at)
       values (?, ?, ?, ?, ?, ?)`,
    )
    .bind(crypto.randomUUID(), ownerKey, entityType, entityId, JSON.stringify(snapshot), nowMs())
    .run();
}

export function createPromptLibraryRepo(db: D1Database) {
  return {
    async list(ownerKey: OwnerKey): Promise<PromptLibraryView> {
      const pageRows = await db
        .prepare(
          `select id, owner_key as ownerKey, title, description, sort_order as sortOrder,
                  created_at as createdAt, updated_at as updatedAt
           from prompt_library_pages
           where owner_key = ? and deleted_at is null
           order by sort_order asc, updated_at desc`,
        )
        .bind(ownerKey)
        .all<PromptLibraryPageRecord>();

      const cardRows = await db
        .prepare(
          `select id, page_id as pageId, owner_key as ownerKey, card_type as cardType, title,
                  prompt_markdown as promptMarkdown, image_r2_key as imageR2Key,
                  image_content_type as imageContentType, sort_order as sortOrder,
                  created_at as createdAt, updated_at as updatedAt
           from prompt_library_cards
           where owner_key = ? and deleted_at is null
           order by case when card_type = 'master' then 0 else 1 end, sort_order asc, updated_at desc`,
        )
        .bind(ownerKey)
        .all<PromptLibraryCardRecord>();

      const cardsByPage = new Map<string, PromptLibraryCardRecord[]>();
      for (const card of cardRows.results.map(toCard)) {
        const existing = cardsByPage.get(card.pageId) ?? [];
        existing.push(card);
        cardsByPage.set(card.pageId, existing);
      }

      return {
        pages: pageRows.results.map((page) => ({ ...toPage(page), cards: cardsByPage.get(page.id) ?? [] })),
      };
    },

    async createPage(ownerKey: OwnerKey, input: { title: string; description?: string | null }) {
      const title = normalizeTitle(input.title);
      if (!title) {
        throw new Error("Sayfa basligi zorunludur");
      }

      return runWithWriteRetry(async () => {
        const createdAt = nowMs();
        const count = await db
          .prepare("select count(*) as count from prompt_library_pages where owner_key = ? and deleted_at is null")
          .bind(ownerKey)
          .first<{ count: number }>();
        const pageId = crypto.randomUUID();
        const masterCardId = crypto.randomUUID();
        const sortOrder = count?.count ?? 0;

        await db
          .prepare(
            `insert into prompt_library_pages (id, owner_key, title, description, sort_order, created_at, updated_at)
             values (?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(pageId, ownerKey, title, normalizeDescription(input.description), sortOrder, createdAt, createdAt)
          .run();

        await db
          .prepare(
            `insert into prompt_library_cards (
              id, page_id, owner_key, card_type, title, prompt_markdown, sort_order, created_at, updated_at
            ) values (?, ?, ?, 'master', 'Master Prompt', '', 0, ?, ?)`,
          )
          .bind(masterCardId, pageId, ownerKey, createdAt, createdAt)
          .run();

        return this.getPage(ownerKey, pageId);
      });
    },

    async getPage(ownerKey: OwnerKey, pageId: string) {
      const page = await db
        .prepare(
          `select id, owner_key as ownerKey, title, description, sort_order as sortOrder,
                  created_at as createdAt, updated_at as updatedAt
           from prompt_library_pages
           where owner_key = ? and id = ? and deleted_at is null
           limit 1`,
        )
        .bind(ownerKey, pageId)
        .first<PromptLibraryPageRecord>();

      if (!page) {
        return null;
      }

      const cards = await db
        .prepare(
          `select id, page_id as pageId, owner_key as ownerKey, card_type as cardType, title,
                  prompt_markdown as promptMarkdown, image_r2_key as imageR2Key,
                  image_content_type as imageContentType, sort_order as sortOrder,
                  created_at as createdAt, updated_at as updatedAt
           from prompt_library_cards
           where owner_key = ? and page_id = ? and deleted_at is null
           order by case when card_type = 'master' then 0 else 1 end, sort_order asc, updated_at desc`,
        )
        .bind(ownerKey, pageId)
        .all<PromptLibraryCardRecord>();

      return { ...toPage(page), cards: cards.results.map(toCard) };
    },

    async updatePage(ownerKey: OwnerKey, pageId: string, input: { title?: string; description?: string | null }) {
      const snapshot = await getPageSnapshot(db, ownerKey, pageId);
      if (!snapshot || snapshot.deletedAt != null) {
        return null;
      }

      const title = typeof input.title === "string" ? normalizeTitle(input.title) : String(snapshot.title);
      if (!title) {
        throw new Error("Sayfa basligi zorunludur");
      }

      return runWithWriteRetry(async () => {
        await saveRevision(db, ownerKey, "page", pageId, snapshot);
        await db
          .prepare(
            `update prompt_library_pages
             set title = ?, description = ?, updated_at = ?
             where owner_key = ? and id = ? and deleted_at is null`,
          )
          .bind(title, normalizeDescription(typeof input.description === "undefined" ? (snapshot.description as string | null) : input.description), nowMs(), ownerKey, pageId)
          .run();

        return this.getPage(ownerKey, pageId);
      });
    },

    async deletePage(ownerKey: OwnerKey, pageId: string) {
      const snapshot = await getPageSnapshot(db, ownerKey, pageId);
      if (!snapshot || snapshot.deletedAt != null) {
        return false;
      }

      return runWithWriteRetry(async () => {
        const deletedAt = nowMs();
        await saveRevision(db, ownerKey, "page", pageId, snapshot);
        const cards = await db
          .prepare(
            `select id, page_id as pageId, owner_key as ownerKey, card_type as cardType, title,
                    prompt_markdown as promptMarkdown, image_r2_key as imageR2Key,
                    image_content_type as imageContentType, sort_order as sortOrder,
                    deleted_at as deletedAt, created_at as createdAt, updated_at as updatedAt
             from prompt_library_cards
             where owner_key = ? and page_id = ? and deleted_at is null`,
          )
          .bind(ownerKey, pageId)
          .all<Record<string, unknown>>();
        for (const card of cards.results) {
          await saveRevision(db, ownerKey, "card", String(card.id), card);
        }
        await db
          .prepare("update prompt_library_cards set deleted_at = ?, updated_at = ? where owner_key = ? and page_id = ? and deleted_at is null")
          .bind(deletedAt, deletedAt, ownerKey, pageId)
          .run();
        await db
          .prepare("update prompt_library_pages set deleted_at = ?, updated_at = ? where owner_key = ? and id = ? and deleted_at is null")
          .bind(deletedAt, deletedAt, ownerKey, pageId)
          .run();
        return true;
      });
    },

    async createCard(
      ownerKey: OwnerKey,
      pageId: string,
      input: { title: string; promptMarkdown?: string; imageR2Key?: string | null; imageContentType?: string | null },
    ) {
      const page = await this.getPage(ownerKey, pageId);
      if (!page) {
        return null;
      }

      const title = normalizeTitle(input.title);
      if (!title) {
        throw new Error("Kart basligi zorunludur");
      }

      return runWithWriteRetry(async () => {
        const createdAt = nowMs();
        const count = await db
          .prepare(
            "select count(*) as count from prompt_library_cards where owner_key = ? and page_id = ? and card_type = 'normal' and deleted_at is null",
          )
          .bind(ownerKey, pageId)
          .first<{ count: number }>();
        const cardId = crypto.randomUUID();

        await db
          .prepare(
            `insert into prompt_library_cards (
              id, page_id, owner_key, card_type, title, prompt_markdown, image_r2_key, image_content_type,
              sort_order, created_at, updated_at
            ) values (?, ?, ?, 'normal', ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            cardId,
            pageId,
            ownerKey,
            title,
            normalizePrompt(input.promptMarkdown),
            input.imageR2Key ?? null,
            input.imageContentType ?? null,
            count?.count ?? 0,
            createdAt,
            createdAt,
          )
          .run();

        return this.getCard(ownerKey, cardId);
      });
    },

    async getCard(ownerKey: OwnerKey, cardId: string) {
      const card = await db
        .prepare(
          `select id, page_id as pageId, owner_key as ownerKey, card_type as cardType, title,
                  prompt_markdown as promptMarkdown, image_r2_key as imageR2Key,
                  image_content_type as imageContentType, sort_order as sortOrder,
                  created_at as createdAt, updated_at as updatedAt
           from prompt_library_cards
           where owner_key = ? and id = ? and deleted_at is null
           limit 1`,
        )
        .bind(ownerKey, cardId)
        .first<PromptLibraryCardRecord>();

      return card ? toCard(card) : null;
    },

    async updateCard(
      ownerKey: OwnerKey,
      cardId: string,
      input: { title?: string; promptMarkdown?: string; imageR2Key?: string | null; imageContentType?: string | null },
    ) {
      const snapshot = await getCardSnapshot(db, ownerKey, cardId);
      if (!snapshot || snapshot.deletedAt != null) {
        return null;
      }

      const title = typeof input.title === "string" ? normalizeTitle(input.title) : String(snapshot.title);
      if (!title) {
        throw new Error("Kart basligi zorunludur");
      }

      return runWithWriteRetry(async () => {
        await saveRevision(db, ownerKey, "card", cardId, snapshot);
        await db
          .prepare(
            `update prompt_library_cards
             set title = ?, prompt_markdown = ?, image_r2_key = ?, image_content_type = ?, updated_at = ?
             where owner_key = ? and id = ? and deleted_at is null`,
          )
          .bind(
            title,
            typeof input.promptMarkdown === "string" ? input.promptMarkdown : String(snapshot.promptMarkdown ?? ""),
            typeof input.imageR2Key === "undefined" ? (snapshot.imageR2Key as string | null) : input.imageR2Key,
            typeof input.imageContentType === "undefined"
              ? (snapshot.imageContentType as string | null)
              : input.imageContentType,
            nowMs(),
            ownerKey,
            cardId,
          )
          .run();

        return this.getCard(ownerKey, cardId);
      });
    },

    async deleteCard(ownerKey: OwnerKey, cardId: string) {
      const snapshot = await getCardSnapshot(db, ownerKey, cardId);
      if (!snapshot || snapshot.deletedAt != null || snapshot.cardType === "master") {
        return false;
      }

      return runWithWriteRetry(async () => {
        await saveRevision(db, ownerKey, "card", cardId, snapshot);
        await db
          .prepare("update prompt_library_cards set deleted_at = ?, updated_at = ? where owner_key = ? and id = ? and deleted_at is null")
          .bind(nowMs(), nowMs(), ownerKey, cardId)
          .run();
        return true;
      });
    },
  };
}
