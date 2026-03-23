import type { D1Database } from "../../config/bindings";
import { createDraftsRepo, type EtsyDraftRecord } from "../../db/repositories/draftsRepo";

export interface SaveEtsyPrepDraftInput {
  englishTitle: string | null;
  longDescription: string | null;
  tags: string[];
  seoNotes: string | null;
  policyNotes: string | null;
  generatedFields: Array<"title" | "description" | "tags">;
  editedFields: Array<"title" | "description" | "tags">;
}

function ensureStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : [];
}

function ensurePrepFields(value: unknown): Array<"title" | "description" | "tags"> {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is "title" | "description" | "tags" => item === "title" || item === "description" || item === "tags");
}

function parseSaveInput(input: unknown): SaveEtsyPrepDraftInput {
  const candidate = input && typeof input === "object" ? (input as Record<string, unknown>) : {};

  return {
    englishTitle: typeof candidate.englishTitle === "string" ? candidate.englishTitle : candidate.englishTitle == null ? null : String(candidate.englishTitle),
    longDescription:
      typeof candidate.longDescription === "string" ? candidate.longDescription : candidate.longDescription == null ? null : String(candidate.longDescription),
    tags: ensureStringArray(candidate.tags),
    seoNotes: typeof candidate.seoNotes === "string" ? candidate.seoNotes : candidate.seoNotes == null ? null : String(candidate.seoNotes),
    policyNotes: typeof candidate.policyNotes === "string" ? candidate.policyNotes : candidate.policyNotes == null ? null : String(candidate.policyNotes),
    generatedFields: ensurePrepFields(candidate.generatedFields),
    editedFields: ensurePrepFields(candidate.editedFields),
  };
}

async function productExists(db: D1Database, productId: string) {
  const product = await db.prepare("select id from products where id = ? limit 1").bind(productId).first<{ id: string }>();
  return Boolean(product);
}

export async function saveEtsyPrepDraft(
  db: D1Database,
  productId: string,
  input: unknown,
  savedAt: number,
): Promise<EtsyDraftRecord | null> {
  if (!(await productExists(db, productId))) {
    return null;
  }

  const draftsRepo = createDraftsRepo(db);
  const parsed = parseSaveInput(input);

  return draftsRepo.savePrepDraft(productId, {
    ...parsed,
    savedAt,
  });
}
