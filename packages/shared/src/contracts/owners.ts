import { z } from "zod";

export const ownerKeySchema = z.enum(["berke", "kaan"]);
export type OwnerKey = z.infer<typeof ownerKeySchema>;

export const ownerOptions = [
  { key: "berke", label: "Berke" },
  { key: "kaan", label: "Kaan" },
] as const satisfies ReadonlyArray<{ key: OwnerKey; label: string }>;

export function getOwnerLabel(ownerKey: OwnerKey) {
  return ownerOptions.find((item) => item.key === ownerKey)?.label ?? ownerKey;
}
