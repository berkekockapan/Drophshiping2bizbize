import type { VariantCostOverrideRow } from "../../db/repositories/productVariantCostOverridesRepo";
import { buildShipentegraEstimate, type ShipentegraEstimate } from "./buildShipentegraEstimate";

export interface ProductCostContextMoney {
  amount: number;
  currency: "USD" | "TRY";
}

export interface ProductCostContextVariant {
  variantId: string;
  label: string;
  autoProductCost: ProductCostContextMoney;
  manualProductCost: ProductCostContextMoney | null;
  autoShippingEstimate: ShipentegraEstimate;
  manualShippingCost: ProductCostContextMoney | null;
}

export interface ProductCostContextProfile {
  catalogId: string;
  profileName: string | null;
  canonicalHs6: string;
  htsCode10: string | null;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
}

export type AutoSelectedTariffProfile = ProductCostContextProfile;

export interface ProductCostContext {
  selectedVariantId: string | null;
  variants: ProductCostContextVariant[];
  usState: {
    status: "automatic_confirmed" | "review_required" | "locked";
    label: string;
    lockedReason: string | null;
    profile: ProductCostContextProfile | null;
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
  latestRun: {
    confidenceState?: "high_confidence" | "low_confidence";
    selectedProfile?: AutoSelectedTariffProfile | null;
    lockedReason?: string | null;
  } | null;
  manualSelection: ProductCostContextProfile | null;
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toMoney(amount: number | null | undefined, currency: "USD" | "TRY"): ProductCostContextMoney {
  return {
    amount: round2(amount ?? 0),
    currency,
  };
}

export function buildProductCostContext(input: BuildProductCostContextInput): ProductCostContext {
  const overridesByVariant = new Map(input.overrides.map((row) => [row.variantId, row]));
  const selectedVariant = input.variants.find((variant) => variant.currentStockState === "IN_STOCK") ?? input.variants[0] ?? null;
  const defaultShipentegraUsd = input.latestRun?.selectedProfile?.defaultShipentegraUsd ?? null;

  const variants = input.variants.map<ProductCostContextVariant>((variant) => {
    const override = overridesByVariant.get(variant.id);
    const autoProductCost = toMoney(variant.currentPrice == null ? 0 : variant.currentPrice / 100, "TRY");
    const autoShippingEstimate = buildShipentegraEstimate({
      title: input.product.title,
      category: input.product.category,
      attributes: input.product.attributes,
      defaultShipentegraUsd,
    });

    return {
      variantId: variant.id,
      label: [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey,
      autoProductCost,
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
      : input.latestRun?.selectedProfile && input.latestRun.confidenceState === "high_confidence"
        ? {
          status: "automatic_confirmed",
          label: "otomatik dogrulandi",
          lockedReason: null,
          profile: input.latestRun.selectedProfile,
        }
      : input.latestRun?.selectedProfile
        ? {
            status: "review_required",
            label: "inceleme gerekli",
            lockedReason: input.latestRun.lockedReason ?? null,
            profile: input.latestRun.selectedProfile,
          }
        : input.latestRun?.confidenceState === "low_confidence"
          ? {
              status: "locked",
              label: "hesap kilitli",
              lockedReason: input.latestRun.lockedReason ?? null,
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
