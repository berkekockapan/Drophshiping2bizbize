import { z } from "zod";
import {
  notificationSeveritySchema,
  parseStatusSchema,
  productStatusSchema,
  stockStateSchema,
  variantSchema
} from "../schemas/product";
import { ownerKeySchema } from "./owners";

export const addTrackedProductSchema = z.object({
  trendyolUrl: z.string().url(),
  note: z.string().min(1).optional()
});
export type AddTrackedProductRequest = z.infer<typeof addTrackedProductSchema>;

export const trackingListItemSchema = z.object({
  id: z.string().min(1),
  ownerKey: ownerKeySchema,
  title: z.string().min(1),
  trendyolUrl: z.string().url(),
  status: productStatusSchema,
  parseStatus: parseStatusSchema,
  currentPrice: z.number().nonnegative().nullable(),
  stockState: stockStateSchema,
  variantCount: z.number().int().nonnegative()
});
export type TrackingListItem = z.infer<typeof trackingListItemSchema>;

export const trackingListResponseSchema = z.object({
  items: z.array(trackingListItemSchema),
  total: z.number().int().nonnegative()
});
export type TrackingListResponse = z.infer<typeof trackingListResponseSchema>;

export const productDetailResponseSchema = z.object({
  id: z.string().min(1),
  ownerKey: ownerKeySchema,
  title: z.string().min(1),
  trendyolUrl: z.string().url(),
  status: productStatusSchema,
  parseStatus: parseStatusSchema,
  currentPrice: z.number().nonnegative().nullable(),
  variants: z.array(variantSchema),
  priceHistory: z.array(
    z.object({
      recordedAt: z.string(),
      price: z.number().nonnegative()
    })
  ),
  stockHistory: z.array(
    z.object({
      recordedAt: z.string(),
      stockState: stockStateSchema
    })
  )
});
export type ProductDetailResponse = z.infer<typeof productDetailResponseSchema>;

export const notificationItemSchema = z.object({
  id: z.string().min(1),
  productId: z.string().min(1),
  severity: notificationSeveritySchema,
  message: z.string().min(1),
  createdAt: z.string()
});
export type NotificationItem = z.infer<typeof notificationItemSchema>;

export const notificationListResponseSchema = z.object({
  items: z.array(notificationItemSchema)
});
export type NotificationListResponse = z.infer<typeof notificationListResponseSchema>;

export const ownerScopedParamsSchema = z.object({
  ownerKey: ownerKeySchema,
  productId: z.string().min(1),
});

export const trashListItemSchema = trackingListItemSchema.extend({
  deletedAt: z.number().int().nonnegative(),
});
export type TrashListItem = z.infer<typeof trashListItemSchema>;

export const trashListResponseSchema = z.object({
  items: z.array(trashListItemSchema),
  total: z.number().int().nonnegative(),
});
export type TrashListResponse = z.infer<typeof trashListResponseSchema>;
