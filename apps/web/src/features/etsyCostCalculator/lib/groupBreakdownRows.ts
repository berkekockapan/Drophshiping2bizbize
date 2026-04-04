import { formatBreakdown } from "./formatBreakdown";
import type { BreakdownGroup, BreakdownRow, ScenarioSnapshot } from "./types";

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

type SnapshotPresentationFields = ScenarioSnapshot & Partial<{
  listedSalePriceUsd: number;
  discountedSalePriceUsd: number;
  productRevenueUsd: number;
  productRevenueTry: number;
  collectedShippingUsd: number;
  collectedShippingTry: number;
  collectedExtrasUsd: number;
  collectedExtrasTry: number;
  totalCollectedUsd: number;
  totalCollectedTry: number;
  dutyBaseUsd: number;
}>;

function isEtsyFeeKey(key: string) {
  return (
    key === "listing_related_fee" ||
    key === "transaction_fee" ||
    key === "processing_fee" ||
    key === "regulatory_operating_fee" ||
    key === "currency_conversion_fee" ||
    key === "offsite_ads_fee" ||
    key === "seller_fee_vat" ||
    key === "deposit_fee"
  );
}

function isOperationalCostKey(key: string) {
  return (
    key === "product_cost" ||
    key === "actual_shipping_cost" ||
    key === "packaging_cost" ||
    key === "shipentegra_operation_cost" ||
    key.startsWith("custom_cost_") ||
    key === "overhead_cost" ||
    key === "us_duty_fee" ||
    key === "shipentegra_additional_duty_fee" ||
    key === "shipentegra_carrier_fee" ||
    key === "shipentegra_import_total"
  );
}

function createRevenueRows(snapshot: SnapshotPresentationFields) {
  const totalCollectedUsd = snapshot.totalCollectedUsd ?? snapshot.normalizedRevenueUsd;
  const productRevenueUsd = snapshot.productRevenueUsd ?? snapshot.normalizedRevenueUsd;
  const exchangeRate = snapshot.normalizedRevenueUsd > 0 ? snapshot.normalizedRevenueTry / snapshot.normalizedRevenueUsd : 0;
  const formatTry = (usdValue: number, tryValue?: number) =>
    TRY_FORMATTER.format(tryValue ?? Math.round(usdValue * exchangeRate * 100) / 100);

  return [
    {
      key: "total_collected",
      label: "Toplam tahsilat",
      formattedUsd: USD_FORMATTER.format(totalCollectedUsd),
      formattedTry: formatTry(totalCollectedUsd, snapshot.totalCollectedTry),
      badgeLabel: "Gelir",
    },
    {
      key: "product_revenue",
      label: "Urun geliri",
      formattedUsd: USD_FORMATTER.format(productRevenueUsd),
      formattedTry: formatTry(productRevenueUsd, snapshot.productRevenueTry),
      badgeLabel: "Gelir",
    },
  ];
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
  const rows = formatBreakdown(snapshot.breakdown).map((row) =>
    row.key === "us_duty_fee" && row.label === "Duty"
      ? ({
          ...row,
          label: "ABD duty",
        } satisfies BreakdownRow)
      : row,
  );
  const revenueRows = createRevenueRows(snapshot as SnapshotPresentationFields);
  const etsyFeeRows = rows.filter((row) => isEtsyFeeKey(row.key));
  const operationalCostRows = rows.filter((row) => isOperationalCostKey(row.key));

  return [
    {
      key: "revenue",
      label: "Gelir",
      rows: revenueRows,
    },
    {
      key: "etsy_fees",
      label: "Etsy ucretleri",
      rows: etsyFeeRows,
    },
    {
      key: "operational_costs",
      label: "Operasyonel maliyetler",
      rows: operationalCostRows,
    },
    {
      key: "summary",
      label: "Sonuc ozeti",
      rows: [createSummaryRow(snapshot)],
    },
  ] as unknown as BreakdownGroup[];
}
