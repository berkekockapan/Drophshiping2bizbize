import { z } from "zod";

export const connectorProviderSchema = z.enum(["mock", "chatgpt-web"]);
export type ConnectorProvider = z.infer<typeof connectorProviderSchema>;

export const connectorHealthSchema = z.object({
  status: z.literal("online"),
  activeProfile: z
    .object({
      id: z.string().min(1),
      provider: connectorProviderSchema,
      emailMasked: z.string().min(1)
    })
    .nullable()
});
export type ConnectorHealth = z.infer<typeof connectorHealthSchema>;

export const connectorProfileSchema = z.object({
  id: z.string().min(1),
  provider: connectorProviderSchema,
  emailMasked: z.string().min(1),
  isActive: z.boolean().default(false)
});
export type ConnectorProfile = z.infer<typeof connectorProfileSchema>;

export const activateConnectorProfileSchema = z.object({
  profileId: z.string().min(1)
});
export type ActivateConnectorProfileRequest = z.infer<
  typeof activateConnectorProfileSchema
>;

export const generateRequestSchema = z.object({
  profileId: z.string().min(1).optional(),
  field: z.string().min(1),
  prompt: z.string().min(1),
  context: z.record(z.string(), z.unknown()).default({})
});
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

export const generateResponseSchema = z.object({
  field: z.string().min(1),
  value: z.string().min(1),
  provider: connectorProviderSchema
});
export type GenerateResponse = z.infer<typeof generateResponseSchema>;