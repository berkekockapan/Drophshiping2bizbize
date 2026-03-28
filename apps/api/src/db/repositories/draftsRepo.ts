import { aiProfiles, etsyDrafts } from "../schema";
import type { D1Database } from "../../config/bindings";
import { runWithWriteRetry } from "../runWithWriteRetry";

export interface DraftAttribute {
  key: string;
  value: string;
}

export interface EtsyDraftRecord {
  id: string;
  productId: string;
  englishTitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  tags: string[];
  materials: string[];
  attributes: DraftAttribute[];
  seoNotes: string | null;
  policyNotes: string | null;
  generatedVersion: number;
  editedVersion: number;
  lastGeneratedAt: number | null;
  manualEditsPresent: boolean;
}

interface EtsyDraftRow {
  id: string;
  productId: string;
  englishTitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  tagsJson: string | null;
  materialsJson: string | null;
  attributesJson: string | null;
  seoNotes: string | null;
  policyNotes: string | null;
  generatedVersion: number;
  editedVersion: number;
  lastGeneratedAt: number | null;
  manualEditsPresent: number | boolean;
}

function parseStringArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
  } catch {
    return [];
  }
}

function parseAttributes(value: string | null): DraftAttribute[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is { key: unknown; value: unknown } => Boolean(item) && typeof item === "object")
      .map((item) => ({
        key: String(item.key ?? ""),
        value: String(item.value ?? ""),
      }))
      .filter((item) => item.key.length > 0 && item.value.length > 0);
  } catch {
    return [];
  }
}

function mapRow(row: EtsyDraftRow): EtsyDraftRecord {
  return {
    id: row.id,
    productId: row.productId,
    englishTitle: row.englishTitle,
    shortDescription: row.shortDescription,
    longDescription: row.longDescription,
    tags: parseStringArray(row.tagsJson),
    materials: parseStringArray(row.materialsJson),
    attributes: parseAttributes(row.attributesJson),
    seoNotes: row.seoNotes,
    policyNotes: row.policyNotes,
    generatedVersion: row.generatedVersion,
    editedVersion: row.editedVersion,
    lastGeneratedAt: row.lastGeneratedAt,
    manualEditsPresent: Boolean(row.manualEditsPresent),
  };
}

function hasOwnKey<T extends object>(value: T, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

async function selectDraftByProductId(db: D1Database, productId: string) {
  return db
    .prepare(
      `select id, product_id as productId, english_title as englishTitle, short_description as shortDescription,
              long_description as longDescription, tags_json as tagsJson, materials_json as materialsJson,
              attributes_json as attributesJson, seo_notes as seoNotes, policy_notes as policyNotes,
              generated_version as generatedVersion, edited_version as editedVersion, last_generated_at as lastGeneratedAt,
              manual_edits_present as manualEditsPresent
       from etsy_drafts
       where product_id = ?
       limit 1`,
    )
    .bind(productId)
    .first<EtsyDraftRow>();
}

export function createDraftsRepo(db: D1Database) {
  async function getByProductId(productId: string) {
    const row = await selectDraftByProductId(db, productId);
    return row ? mapRow(row) : null;
  }

  async function ensureForProduct(productId: string) {
    return runWithWriteRetry(async () => {
      const existing = await getByProductId(productId);
      if (existing) {
        return existing;
      }

      await db
        .prepare(
          `insert into etsy_drafts (
              id, product_id, generated_version, edited_version, manual_edits_present
            ) values (?, ?, ?, ?, ?)`,
        )
        .bind(crypto.randomUUID(), productId, 0, 0, 0)
        .run();

      const created = await getByProductId(productId);
      if (!created) {
        throw new Error("Unable to create draft");
      }

      return created;
    });
  }

  return {
    db,
    tables: {
      etsyDrafts,
      aiProfiles,
    },
    getByProductId,
    ensureForProduct,
    async applyManualEdits(
      productId: string,
      patch: Partial<
        Pick<
          EtsyDraftRecord,
          "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes"
        >
      >,
    ) {
      return runWithWriteRetry(async () => {
        const existing = await ensureForProduct(productId);
        const nextEnglishTitle = hasOwnKey(patch, "englishTitle") ? (patch.englishTitle ?? null) : existing.englishTitle;
        const nextShortDescription = hasOwnKey(patch, "shortDescription")
          ? (patch.shortDescription ?? null)
          : existing.shortDescription;
        const nextLongDescription = hasOwnKey(patch, "longDescription")
          ? (patch.longDescription ?? null)
          : existing.longDescription;
        const nextTags = hasOwnKey(patch, "tags") ? (patch.tags ?? []) : existing.tags;
        const nextMaterials = hasOwnKey(patch, "materials") ? (patch.materials ?? []) : existing.materials;
        const nextAttributes = hasOwnKey(patch, "attributes") ? (patch.attributes ?? []) : existing.attributes;
        const nextSeoNotes = hasOwnKey(patch, "seoNotes") ? (patch.seoNotes ?? null) : existing.seoNotes;
        const nextPolicyNotes = hasOwnKey(patch, "policyNotes") ? (patch.policyNotes ?? null) : existing.policyNotes;

        await db
          .prepare(
            `update etsy_drafts
             set english_title = ?, short_description = ?, long_description = ?, tags_json = ?, materials_json = ?,
                 attributes_json = ?, seo_notes = ?, policy_notes = ?, edited_version = ?, manual_edits_present = ?
             where product_id = ?`,
          )
          .bind(
            nextEnglishTitle,
            nextShortDescription,
            nextLongDescription,
            JSON.stringify(nextTags),
            JSON.stringify(nextMaterials),
            JSON.stringify(nextAttributes),
            nextSeoNotes,
            nextPolicyNotes,
            existing.editedVersion + 1,
            1,
            productId,
          )
          .run();

        const updated = await getByProductId(productId);
        if (!updated) {
          throw new Error("Unable to update draft edits");
        }

        return updated;
      });
    },
    async saveGenerated(
      productId: string,
      draft: Pick<
        EtsyDraftRecord,
        "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes"
      > & { overwrite: boolean },
      options: { currentGeneratedVersion?: number; generatedAt: number },
    ) {
      return runWithWriteRetry(async () => {
        const existing = await ensureForProduct(productId);
        const nextGeneratedVersion = (options.currentGeneratedVersion ?? existing.generatedVersion) + 1;
        const manualEditsPresent = draft.overwrite ? 0 : existing.manualEditsPresent ? 1 : 0;

        await db
          .prepare(
            `update etsy_drafts
             set english_title = ?, short_description = ?, long_description = ?, tags_json = ?, materials_json = ?,
                 attributes_json = ?, seo_notes = ?, policy_notes = ?, generated_version = ?, last_generated_at = ?,
                 manual_edits_present = ?
             where product_id = ?`,
          )
          .bind(
            draft.englishTitle,
            draft.shortDescription,
            draft.longDescription,
            JSON.stringify(draft.tags),
            JSON.stringify(draft.materials),
            JSON.stringify(draft.attributes),
            draft.seoNotes,
            draft.policyNotes,
            nextGeneratedVersion,
            options.generatedAt,
            manualEditsPresent,
            productId,
          )
          .run();

        const updated = await getByProductId(productId);
        if (!updated) {
          throw new Error("Unable to save generated draft");
        }

        return updated;
      });
    },
    async savePrepDraft(
      productId: string,
      input: {
        englishTitle: string | null;
        longDescription: string | null;
        tags: string[];
        seoNotes: string | null;
        policyNotes: string | null;
        generatedFields: Array<"title" | "description" | "tags">;
        editedFields: Array<"title" | "description" | "tags">;
        savedAt: number;
      },
    ) {
      return runWithWriteRetry(async () => {
        const existing = await ensureForProduct(productId);
        const generatedChanged = input.generatedFields.length > 0;
        const manualEdited = input.editedFields.length > 0;

        await db
          .prepare(
            `update etsy_drafts
             set english_title = ?, long_description = ?, tags_json = ?, seo_notes = ?, policy_notes = ?,
                 generated_version = ?, edited_version = ?, last_generated_at = ?, manual_edits_present = ?
             where product_id = ?`,
          )
          .bind(
            input.englishTitle,
            input.longDescription,
            JSON.stringify(input.tags),
            input.seoNotes,
            input.policyNotes,
            generatedChanged ? existing.generatedVersion + 1 : existing.generatedVersion,
            manualEdited ? existing.editedVersion + 1 : existing.editedVersion,
            generatedChanged ? input.savedAt : existing.lastGeneratedAt,
            manualEdited ? 1 : existing.manualEditsPresent ? 1 : 0,
            productId,
          )
          .run();

        const updated = await getByProductId(productId);
        if (!updated) {
          throw new Error("Unable to save prep draft");
        }

        return updated;
      });
    },
  };
}
