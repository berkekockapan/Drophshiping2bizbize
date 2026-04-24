import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { calculateScenario } from "./calculateScenario";
import { groupBreakdownRows } from "./groupBreakdownRows";

describe("groupBreakdownRows", () => {
  it("groups revenue, fee, operational cost, and summary rows in a stable order", () => {
    const snapshot = calculateScenario({
      ...createDefaultDraft(),
      destinationProfile: "US",
      manualDutyPercent: 11,
      valueSources: { duty: "manual_override" },
      salePriceUsd: 52,
    });

    const groups = groupBreakdownRows(snapshot);

    expect(groups.map((group) => group.key)).toEqual(["revenue", "etsy_fees", "operational_costs", "summary"]);
    expect(groups[0]?.rows.map((row) => row.key)).toEqual(expect.arrayContaining(["total_collected", "product_revenue"]));
    expect(groups[2]?.rows.map((row) => row.key)).toContain("us_duty_fee");
    expect(groups[3]?.rows.map((row) => row.label)).toContain("Net kar");
  });

  it("keeps manual import duty rows inside operational costs in stable order", () => {
    const snapshot = {
      listedSalePriceUsd: 52,
      discountedSalePriceUsd: 52,
      productRevenueUsd: 52,
      collectedShippingUsd: 0,
      collectedExtrasUsd: 0,
      totalCollectedUsd: 52,
      dutyBaseUsd: 52,
      normalizedRevenueUsd: 52,
      normalizedRevenueTry: 2080,
      totalEtsyFeesUsd: 11.65,
      totalEtsyFeesTry: 466,
      totalOperationalCostsUsd: 31.4,
      totalOperationalCostsTry: 1256,
      netProfitUsd: 8.95,
      netProfitTry: 358,
      netMarginPercent: 17.21,
      breakdown: [
        { key: "actual_shipping_cost", label: "ShipEntegra kargo maliyeti", amountUsd: 5, amountTry: 200, sourceType: "manual_override" },
        { key: "us_duty_fee", label: "ABD ithalat vergisi", amountUsd: 3.2, amountTry: 128, sourceType: "manual_override" },
      ],
      warnings: [],
    } as unknown as ReturnType<typeof calculateScenario>;

    const groups = groupBreakdownRows(snapshot);
    const operationalRows = groups[2]?.rows.map((row) => row.key) ?? [];

    expect(groups.map((group) => group.key)).toEqual(["revenue", "etsy_fees", "operational_costs", "summary"]);
    expect(operationalRows).toEqual(expect.arrayContaining(["actual_shipping_cost", "us_duty_fee"]));
  });
});
