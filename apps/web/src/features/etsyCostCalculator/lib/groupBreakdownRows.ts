import { formatBreakdown } from "./formatBreakdown";
import type { BreakdownGroup, ScenarioSnapshot } from "./types";

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

const TRY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

function isUserCostKey(key: string) {
  return (
    key === "product_cost" ||
    key === "actual_shipping_cost" ||
    key === "packaging_cost" ||
    key === "shipentegra_operation_cost" ||
    key.startsWith("custom_cost_") ||
    key === "overhead_cost"
  );
}

function createSummaryRow(snapshot: ScenarioSnapshot) {
  return {
    key: "summary_net_profit",
    label: "Net kar",
    formattedUsd: USD_FORMATTER.format(snapshot.netProfitUsd),
    formattedTry: TRY_FORMATTER.format(snapshot.netProfitTry),
    badgeLabel: "Ozet",
  };
}

export function groupBreakdownRows(snapshot: ScenarioSnapshot): BreakdownGroup[] {
  const rows = formatBreakdown(snapshot.breakdown);
  const etsyFeeRows = rows.filter((row) => !isUserCostKey(row.key));
  const userCostRows = rows.filter((row) => isUserCostKey(row.key));

  return [
    {
      key: "etsy_fees",
      label: "Etsy ucretleri",
      rows: etsyFeeRows,
    },
    {
      key: "user_costs",
      label: "Kullanici maliyetleri",
      rows: userCostRows,
    },
    {
      key: "summary",
      label: "Sonuc ozeti",
      rows: [createSummaryRow(snapshot)],
    },
  ];
}
