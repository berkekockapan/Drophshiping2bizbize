import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { calculateScenario } from "./calculateScenario";
import { groupBreakdownRows } from "./groupBreakdownRows";

describe("groupBreakdownRows", () => {
  it("groups fee, user cost, and summary rows in a stable order", () => {
    const snapshot = calculateScenario({
      ...createDefaultDraft(),
      destinationProfile: "US",
      manualDutyPercent: 11,
      valueSources: { duty: "manual_override" },
      salePriceUsd: 52,
    });

    const groups = groupBreakdownRows(snapshot);

    expect(groups.map((group) => group.key)).toEqual(["etsy_fees", "user_costs", "summary"]);
    expect(groups[0]?.rows.map((row) => row.key)).toContain("us_duty_fee");
    expect(groups[2]?.rows.map((row) => row.label)).toContain("Net kar");
  });
});
