import type { VariantCostOverrideRow } from "../../db/repositories/productVariantCostOverridesRepo";

import { buildShipentegraEstimate } from "./buildShipentegraEstimate";

export interface ProductCostContextMoney {
  amount: number;
  currency: "USD" | "TRY";
}

export interface ProductCostContextAutoProfile {
  catalogId: string;
  profileName: string;
  canonicalHs6: string;
  htsCode10: string | null;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
}

export interface ProductCostContextManualProfile {
  productId: string;
  ownerKey: string;
  catalogId: string;
  canonicalHs6: string;
  title: string;
  usProfileId: string | null;
  selectionSource: string;
  selectedBy: string;
  selectedAt: number;
  analysisRunId: string | null;
  createdAt: number;
  updatedAt: number;
  generalDutyRate: number | null;
  additionalDutyRate: number | null;
  combinedDutyRate: number | null;
  dutySummary: string | null;
  revisionLabel: string | null;
}

export interface ProductCostContextVariant {
  variantId: string;
  label: string;
  autoProductCost: ProductCostContextMoney;
  manualProductCost: ProductCostContextMoney | null;
  autoShippingEstimate: ReturnType<typeof buildShipentegraEstimate>;
  manualShippingCost: ProductCostContextMoney | null;
}

export interface ProductCostContext {
  selectedVariantId: string | null;
  variants: ProductCostContextVariant[];
  usState: {
    status: "automatic_confirmed" | "review_required" | "locked";
    label: string;
    lockedReason: string | null;
    profile: ProductCostContextManualProfile | ProductCostContextAutoProfile | null;
  };
}

export interface BuildProductCostContextInput {
  product: {
    title: string | null;
    category: string | null;
    attributes: Array<{ key: string; value: string }>;
  };
  variants: Array<{
    id: string;
    variantKey: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    currentStockState: string;
    currentPrice: number | null;
  }>;
  overrides: VariantCostOverrideRow[];
  manualSelection: ProductCostContextManualProfile | null;
  latestRun:
    | {
        confidenceState?: "high_confidence" | "low_confidence";
        selectedProfile?: ProductCostContextAutoProfile | null;
        lockedReason?: string | null;
      }
    | null
    | undefined;
}

function toMoney(amount: number | null, currency: "USD" | "TRY"): ProductCostContextMoney {
  return {
    amount: amount == null ? 0 : Math.round(amount * 100) / 100,
    currency,
  };
}

export async function buildProductCostContext(input: BuildProductCostContextInput): Promise<ProductCostContext> {
  const overridesByVariant = new Map(input.overrides.map((row) => [row.variantId, row] as const));
  const selectedVariant = input.variants.find((variant) => variant.currentStockState === "IN_STOCK") ?? input.variants[0] ?? null;

  const variants = input.variants.map<ProductCostContextVariant>((variant) => {
    const override = overridesByVariant.get(variant.id);
    const autoShippingEstimate = buildShipentegraEstimate({
      title: input.product.title,
      category: input.product.category,
      attributes: input.product.attributes,
      defaultShipentegraUsd:
        input.manualSelection == null && input.latestRun?.selectedProfile
          ? input.latestRun.selectedProfile.defaultShipentegraUsd
          : null,
    });

    return {
      variantId: variant.id,
      label: [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey,
      autoProductCost: toMoney(variant.currentPrice == null ? 0 : variant.currentPrice / 100, "TRY"),
      manualProductCost:
        override?.manualProductCostAmount != null && override.manualProductCostCurrency
          ? toMoney(override.manualProductCostAmount, override.manualProductCostCurrency as "USD" | "TRY")
          : null,
      autoShippingEstimate,
      manualShippingCost:
        override?.manualShippingCostAmount != null && override.manualShippingCostCurrency
          ? toMoney(override.manualShippingCostAmount, override.manualShippingCostCurrency as "USD" | "TRY")
          : null,
    };
  });

  return {
    selectedVariantId: selectedVariant?.id ?? null,
    variants,
    usState: input.manualSelection
      ? {
          status: "automatic_confirmed",
          label: "otomatik dogrulandi",
          lockedReason: null,
          profile: input.manualSelection,
        }
      : input.latestRun?.selectedProfile
        ? {
            status: "automatic_confirmed",
            label: "otomatik dogrulandi",
            lockedReason: null,
            profile: input.latestRun.selectedProfile,
          }
        : input.latestRun?.confidenceState === "low_confidence"
          ? {
              status: "locked",
              label: "hesap kilitli",
              lockedReason:
                input.latestRun.lockedReason ??
                "Sistem ABD profilinden yeterince emin degil. Yanlis kesin sonuc gostermemek icin hesap kilitli kalmali.",
              profile: null,
            }
          : {
              status: "review_required",
              label: "inceleme gerekli",
              lockedReason: "ABD profili secilmeden maliyet acilmaz.",
              profile: null,
            },
  };
}
