import { calculateScenario } from "./calculateScenario";
import { solveTargetPrice } from "./solveTargetPrice";
import type { CalculatorDraft, QuickModeViewModel } from "./types";

export function buildQuickModeViewModel(draft: CalculatorDraft): QuickModeViewModel {
  const breakEvenPriceUsd = solveTargetPrice({
    ...draft,
    targetProfitMode: "net_profit_usd",
    targetProfitValue: 0,
  });
  const targetSafeListPriceUsd = solveTargetPrice(draft);
  const recommendedSalePriceUsd = targetSafeListPriceUsd ?? breakEvenPriceUsd;

  return {
    recommendedSalePriceUsd,
    breakEvenPriceUsd,
    targetSafeListPriceUsd,
    recommendedScenario:
      recommendedSalePriceUsd == null ? null : calculateScenario({ ...draft, salePriceUsd: recommendedSalePriceUsd }),
    enteredPriceScenario: draft.salePriceUsd > 0 ? calculateScenario(draft) : null,
    hasEnteredSalePrice: draft.salePriceUsd > 0,
  };
}
