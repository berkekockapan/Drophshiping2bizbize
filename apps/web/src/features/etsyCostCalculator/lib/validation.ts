import type { CalculatorDraft } from "./types";

export type ValidationErrors = Record<string, string>;

function isNegative(value: number) {
  return Number.isFinite(value) && value < 0;
}

export function validateDraft(draft: CalculatorDraft): ValidationErrors {
  const errors: ValidationErrors = {};

  if (draft.usdTryRate <= 0) {
    errors.usdTryRate = "USD/TRY kuru 0'dan buyuk olmali.";
  }

  const numericValues = [
    ["salePriceUsd", draft.salePriceUsd],
    ["buyerPaidShippingUsd", draft.buyerPaidShippingUsd],
    ["buyerPaidExtrasUsd", draft.buyerPaidExtrasUsd],
    ["buyerTaxCollectedByEtsyUsd", draft.buyerTaxCollectedByEtsyUsd],
    ["targetProfitValue", draft.targetProfitValue],
  ] as const;

  for (const [key, value] of numericValues) {
    if (isNegative(value)) {
      errors[key] = "Bu alan negatif olamaz.";
    }
  }

  if (draft.saleDiscountPercent < 0 || draft.saleDiscountPercent >= 100) {
    errors.saleDiscountPercent = "Indirim orani %0 ile %99.99 arasinda olmali.";
  }

  if (draft.manualDutyPercent < 0 || draft.manualDutyPercent > 100) {
    errors.manualDutyPercent = "Duty orani %0 ile %100 arasinda olmali.";
  }

  const discountedSubtotalUsd = draft.salePriceUsd * (1 - draft.saleDiscountPercent / 100);
  if (draft.coupon.type === "fixed_usd" && draft.coupon.value > discountedSubtotalUsd) {
    errors.coupon = "Sabit kupon, indirim sonrasi urun ara toplamini asamaz.";
  }

  if (draft.overheadMode === "allocated_total" && draft.overheadExpectedOrderCount <= 0) {
    errors.overheadExpectedOrderCount = "Beklenen siparis adedi 0'dan buyuk olmali.";
  }

  return errors;
}
