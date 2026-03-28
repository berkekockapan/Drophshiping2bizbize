import { calculateScenario } from "./calculateScenario";
import type { CalculatorDraft } from "./types";

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function reachesTarget(draft: CalculatorDraft, salePriceUsd: number) {
  const result = calculateScenario({ ...draft, salePriceUsd });

  if (draft.targetProfitMode === "margin_percent") {
    return result.netMarginPercent >= draft.targetProfitValue;
  }

  if (draft.targetProfitMode === "net_profit_try") {
    return result.netProfitTry >= draft.targetProfitValue;
  }

  return result.netProfitUsd >= draft.targetProfitValue;
}

export function solveTargetPrice(draft: CalculatorDraft) {
  let low = 0;
  let high = Math.max(100, Math.ceil((draft.salePriceUsd || 1) * 100));

  while (!reachesTarget(draft, high / 100) && high < 10_000_000) {
    low = high;
    high *= 2;
  }

  if (!reachesTarget(draft, high / 100)) {
    return null;
  }

  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (reachesTarget(draft, mid / 100)) {
      high = mid;
    } else {
      low = mid;
    }
  }

  let candidate = high;
  while (!reachesTarget(draft, candidate / 100) && candidate < 10_000_000) {
    candidate += 1;
  }

  return candidate >= 10_000_000 ? null : round2(candidate / 100);
}
