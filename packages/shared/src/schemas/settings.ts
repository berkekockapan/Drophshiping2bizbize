import { z } from "zod";

export const settingsSchema = z.object({
  refreshIntervalHours: z.number().int().min(1).max(168).default(4),
  promptPreferences: z
    .object({
      tone: z.string().min(1).optional(),
      seoFocus: z.string().min(1).optional(),
      language: z.string().min(1).default("tr")
    })
    .default({})
});
export type Settings = z.infer<typeof settingsSchema>;