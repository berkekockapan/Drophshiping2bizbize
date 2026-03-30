import { describe, expect, it } from "vitest";

import { formatBreakdown } from "./formatBreakdown";

describe("formatBreakdown", () => {
  it("maps source types to visible badge labels", () => {
    const rows = formatBreakdown([
      {
        key: "transaction_fee",
        label: "Transaction fee",
        amountUsd: 3.9,
        amountTry: 156,
        sourceType: "system_default",
      },
      {
        key: "processing_fee",
        label: "Processing fee",
        amountUsd: 4.25,
        amountTry: 170,
        sourceType: "manual_override",
      },
      {
        key: "shipentegra",
        label: "ShipEntegra",
        amountUsd: 2,
        amountTry: 80,
        sourceType: "profile_default",
      },
      {
        key: "duty",
        label: "Duty",
        amountUsd: 5,
        amountTry: 200,
        sourceType: "analysis_selected",
      },
      {
        key: "deposit_fee",
        label: "Deposit fee",
        amountUsd: 1.05,
        amountTry: 42,
        sourceType: "conditional",
      },
    ]);

    expect(rows.map((row) => row.badgeLabel)).toEqual([
      "Sistem",
      "Manuel",
      "Profil",
      "Analiz",
      "Kosullu",
    ]);
  });
});
