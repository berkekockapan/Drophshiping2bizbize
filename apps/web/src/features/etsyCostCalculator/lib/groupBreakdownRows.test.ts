import { describe, expect, it } from "vitest";

import { createDefaultDraft } from "./defaults";
import { calculateScenario } from "./calculateScenario";
import { groupBreakdownRows } from "./groupBreakdownRows";

describe("groupBreakdownRows", () => {
  it("groups fee, user cost, and summary rows in a stable order", () => {
    const snapshot = calculateScenario({
      ...createDefaultDraft(),
      salePriceUsd: 52,
    });

    const groups = groupBreakdownRows(snapshot);

    expect(groups.map((group) => group.key)).toEqual(["etsy_fees", "user_costs", "summary"]);
    expect(groups[2]?.rows.map((row) => row.label)).toContain("Net kar");
  });
});
