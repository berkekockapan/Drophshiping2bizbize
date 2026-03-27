export type OwnerKey = "berke" | "kaan";

export const ownerKeySchema = {
  safeParse(value: string | undefined): { success: true; data: OwnerKey } | { success: false; error: { issues: Array<{ message: string }> } } {
    if (value === "berke" || value === "kaan") {
      return {
        success: true as const,
        data: value as OwnerKey,
      };
    }

    return {
      success: false as const,
      error: {
        issues: [{ message: `Unsupported owner key: ${String(value)}` }],
      },
    };
  },
};

export const ownerOptions = [
  { key: "berke", label: "Berke" },
  { key: "kaan", label: "Kaan" },
] as const satisfies ReadonlyArray<{ key: OwnerKey; label: string }>;
