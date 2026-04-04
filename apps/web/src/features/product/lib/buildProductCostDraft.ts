import type { ProductCostContext, ProductCostContextVariant } from "../../../app/api";
import type { CalculatorDraft, DestinationProfile } from "../../etsyCostCalculator/lib/types";

export function buildProductCostDraft(input: {
  baseDraft: CalculatorDraft;
  variant: ProductCostContextVariant;
  destinationProfile: DestinationProfile;
  usState: ProductCostContext["usState"];
}): CalculatorDraft {
  const productCost = input.variant.manualProductCost ?? input.variant.autoProductCost;
  const actualShippingCost = input.variant.manualShippingCost ?? input.variant.autoShippingEstimate;
  const selectedProfile =
    input.destinationProfile === "US" && input.usState.profile && "combinedDutyRate" in input.usState.profile
      ? input.usState.profile
      : null;
  const resolvedDutyPercent =
    selectedProfile == null ? null : Math.round((selectedProfile.combinedDutyRate * 100 + Number.EPSILON) * 100) / 100;

  return {
    ...input.baseDraft,
    destinationProfile: input.destinationProfile,
    manualDutyPercent: 0,
    linkedVariantId: input.variant.variantId,
    productCost,
    actualShippingCost,
    resolvedDutyPercent,
    dutyLabel: selectedProfile?.dutySummary ?? null,
    importDutyEnabled: resolvedDutyPercent != null,
    importDutyRate: resolvedDutyPercent == null ? null : resolvedDutyPercent / 100,
    importDutyLabel: selectedProfile?.dutySummary ?? null,
    valueSources: {
      ...input.baseDraft.valueSources,
      productCost: input.variant.manualProductCost ? "manual_override" : "system_default",
      actualShippingCost:
        input.variant.manualShippingCost
          ? "manual_override"
          : input.variant.autoShippingEstimate.amount > 0
            ? "profile_default"
            : "system_default",
      duty: resolvedDutyPercent == null ? null : "analysis_selected",
    },
  };
}
