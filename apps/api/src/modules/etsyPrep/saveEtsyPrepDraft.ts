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

export class InvalidEtsyPrepDraftPayloadError extends Error {
  constructor() {
    super("Invalid Etsy prep save payload");
    this.name = "InvalidEtsyPrepDraftPayloadError";
  }
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isPrepField(value: unknown): value is "title" | "description" | "tags" {
  return value === "title" || value === "description" || value === "tags";
}

function isPrepFieldArray(value: unknown): value is Array<"title" | "description" | "tags"> {
  return Array.isArray(value) && value.every(isPrepField);
}

function isSaveInput(input: unknown): input is SaveEtsyPrepDraftInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return false;
  }

  const candidate = input as Record<string, unknown>;
  const allowedKeys = new Set([
    "englishTitle",
    "longDescription",
    "tags",
    "seoNotes",
    "policyNotes",
    "generatedFields",
    "editedFields",
  ]);

  for (const key of Object.keys(candidate)) {
    if (!allowedKeys.has(key)) {
      return false;
    }
  }

  return (
    isNullableString(candidate.englishTitle) &&
    isNullableString(candidate.longDescription) &&
    isStringArray(candidate.tags) &&
    isNullableString(candidate.seoNotes) &&
    isNullableString(candidate.policyNotes) &&
    isPrepFieldArray(candidate.generatedFields) &&
    isPrepFieldArray(candidate.editedFields)
  );
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

  if (!isSaveInput(input)) {
    throw new InvalidEtsyPrepDraftPayloadError();
  }

  const draftsRepo = createDraftsRepo(db);

  return draftsRepo.savePrepDraft(productId, { ...input, savedAt });
}
