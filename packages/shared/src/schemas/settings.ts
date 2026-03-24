import { z } from "zod";

export const settingsSchema = z.object({
  refreshIntervalHours: z.number().int().min(1).max(168).default(5),
  promptPreferences: z
    .object({
      tone: z.string().min(1).optional(),
      seoFocus: z.string().min(1).optional(),
      language: z.string().min(1).default("tr"),
    })
    .nullable()
    .default(null),
  connectorHealthcheckEnabled: z.boolean().default(true),
  aiTargetBaseUrl: z.string().trim().min(1).nullable().default(null),
  aiTargetManagementKey: z.string().trim().min(1).nullable().default(null),
  aiTargetLabel: z.string().trim().min(1).nullable().default(null),
  aiTargetApiKey: z.string().trim().min(1).nullable().default(null),
});
export type Settings = z.infer<typeof settingsSchema>;
