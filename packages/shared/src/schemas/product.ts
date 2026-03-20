import { z } from "zod";

export const productStatusSchema = z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const parseStatusSchema = z.enum(["PENDING", "SUCCESS", "FAILED"]);
export type ParseStatus = z.infer<typeof parseStatusSchema>;

export const stockStateSchema = z.enum(["IN_STOCK", "OUT_OF_STOCK", "UNKNOWN"]);
export type StockState = z.infer<typeof stockStateSchema>;

export const notificationSeveritySchema = z.enum(["INFO", "WARNING", "ERROR"]);
export type NotificationSeverity = z.infer<typeof notificationSeveritySchema>;

export const variantSchema = z.object({
  id: z.string().min(1),
  option1: z.string().nullable().optional(),
  option2: z.string().nullable().optional(),
  option3: z.string().nullable().optional(),
  price: z.number().nonnegative(),
  stockState: stockStateSchema,
  stockCount: z.number().int().nonnegative().nullable().optional()
});
export type Variant = z.infer<typeof variantSchema>;

export const productSnapshotSchema = z.object({
  title: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().min(1).default("TRY"),
  stockState: stockStateSchema,
  variants: z.array(variantSchema).default([])
});
export type ProductSnapshot = z.infer<typeof productSnapshotSchema>;

export const productStateChangeSchema = z.object({
  priceChanged: z.boolean().default(false),
  stockChanged: z.boolean().default(false),
  variantCountChanged: z.boolean().default(false)
});
export type ProductStateChange = z.infer<typeof productStateChangeSchema>;