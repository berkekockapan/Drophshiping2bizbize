import type { DraftAttribute, EtsyDraftRecord } from "../../db/repositories/draftsRepo";

export interface GeneratedDraftPayload {
  englishTitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  tags: string[];
  materials: string[];
  attributes: DraftAttribute[];
  seoNotes: string | null;
  policyNotes: string | null;
}

export function mergeGeneratedDraft(
  existing: EtsyDraftRecord,
  incoming: GeneratedDraftPayload,
  options: { overwrite: boolean },
): GeneratedDraftPayload {
  const shouldPreserveManual = existing.manualEditsPresent && !options.overwrite;

  return {
    englishTitle: shouldPreserveManual ? existing.englishTitle : incoming.englishTitle,
    shortDescription: shouldPreserveManual ? existing.shortDescription : incoming.shortDescription,
    longDescription: shouldPreserveManual ? existing.longDescription : incoming.longDescription,
    tags: shouldPreserveManual ? existing.tags : incoming.tags,
    materials: shouldPreserveManual ? existing.materials : incoming.materials,
    attributes: shouldPreserveManual ? existing.attributes : incoming.attributes,
    seoNotes: shouldPreserveManual ? existing.seoNotes : incoming.seoNotes,
    policyNotes: shouldPreserveManual ? existing.policyNotes : incoming.policyNotes,
  };
}