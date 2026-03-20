import { z } from "zod";
import { variantSchema } from "./product";

export const draftFieldOverwriteSchema = z.object({
  overwrite: z.boolean().default(false),
  overwriteManualEdits: z.boolean().default(false)
});
export type DraftFieldOverwrite = z.infer<typeof draftFieldOverwriteSchema>;

export const etsyDraftSchema = z.object({
  productId: z.string().min(1),
  englishTitle: z.string().min(1),
  englishDescription: z.string().min(1),
  tags: z.array(z.string().min(1)).max(13).default([]),
  materials: z.array(z.string().min(1)).default([]),
  sourceVariants: z.array(variantSchema).default([]),
  manualEditsPresent: z.boolean().default(false)
});
export type EtsyDraft = z.infer<typeof etsyDraftSchema>;

export const generatedDraftSchema = z.object({
  englishTitle: z.string().min(1),
  englishDescription: z.string().min(1),
  tags: z.array(z.string().min(1)).max(13),
  materials: z.array(z.string().min(1)).default([])
});
export type GeneratedDraft = z.infer<typeof generatedDraftSchema>;