import { z } from "zod";

import { ownerKeySchema } from "./owners";

export const sourceProductPlatformSchema = z.enum(["SHOPIER", "CUSTOM_SITE", "OTHER"]);
export type SourceProductPlatform = z.infer<typeof sourceProductPlatformSchema>;

const nullableNoteSchema = z
  .string()
  .trim()
  .max(4000)
  .nullish()
  .transform((value) => (value && value.length > 0 ? value : null));

export const createSourceProductRequestSchema = z.object({
  sourceTitle: z.string().trim().min(1).max(200),
  sourceUrl: z.string().trim().url(),
  sourcePlatform: sourceProductPlatformSchema,
  note: nullableNoteSchema.optional(),
});
export type CreateSourceProductRequest = z.infer<typeof createSourceProductRequestSchema>;

export const patchSourceProductRequestSchema = z
  .object({
    sourceTitle: z.string().trim().min(1).max(200).optional(),
    sourceUrl: z.string().trim().url().optional(),
    sourcePlatform: sourceProductPlatformSchema.optional(),
    note: nullableNoteSchema.optional(),
  })
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "At least one field is required",
  });
export type PatchSourceProductRequest = z.infer<typeof patchSourceProductRequestSchema>;

export const createSourceProductEtsyLinkRequestSchema = z.object({
  etsyUrl: z.string().trim().url(),
});
export type CreateSourceProductEtsyLinkRequest = z.infer<typeof createSourceProductEtsyLinkRequestSchema>;

export const sourceProductSummarySchema = z.object({
  id: z.string().min(1),
  ownerKey: ownerKeySchema,
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  sourcePlatform: sourceProductPlatformSchema,
  notePreview: z.string().nullable(),
  etsyLinkCount: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type SourceProductSummary = z.infer<typeof sourceProductSummarySchema>;

export const sourceProductListResponseSchema = z.object({
  items: z.array(sourceProductSummarySchema),
  total: z.number().int().nonnegative(),
});
export type SourceProductListResponse = z.infer<typeof sourceProductListResponseSchema>;

export const sourceProductDetailSchema = z.object({
  id: z.string().min(1),
  ownerKey: ownerKeySchema,
  sourceTitle: z.string().min(1),
  sourceUrl: z.string().url(),
  sourcePlatform: sourceProductPlatformSchema,
  note: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type SourceProductDetail = z.infer<typeof sourceProductDetailSchema>;

export const sourceProductEtsyLinkSchema = z.object({
  id: z.string().min(1),
  sourceProductId: z.string().min(1),
  ownerKey: ownerKeySchema,
  etsyUrl: z.string().url(),
  etsyUrlNormalized: z.string().url(),
  etsyListingId: z.string().nullable(),
  createdAt: z.number().int().nonnegative(),
});
export type SourceProductEtsyLink = z.infer<typeof sourceProductEtsyLinkSchema>;

export const sourceProductDetailResponseSchema = z.object({
  product: sourceProductDetailSchema,
  etsyLinks: z.array(sourceProductEtsyLinkSchema),
});
export type SourceProductDetailResponse = z.infer<typeof sourceProductDetailResponseSchema>;
