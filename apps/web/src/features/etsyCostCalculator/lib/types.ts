export type CurrencyCode = "USD" | "TRY";

export interface MoneyInput {
  amount: number;
  currency: CurrencyCode;
}

export interface CouponInput {
  type: "none" | "percent" | "fixed_usd";
  value: number;
}

export interface CostLineInput {
  id: string;
  label: string;
  value: MoneyInput;
  enabled: boolean;
}

export interface FeeProfileOverrides {
  listingRelatedFeeUsd?: number;
  transactionFeeRate?: number;
  processingFeeRate?: number;
  processingFixedTry?: number;
  regulatoryFeeRate?: number;
  currencyConversionFeeRate?: number;
  offsiteAdsRate?: number;
  vatRate?: number;
  depositFeeTry?: number;
  depositMinimumTry?: number;
  depositThresholdTry?: number;
  vatApplicableFeeKeys?: string[];
}

export interface CalculatorDraft {
  usdTryRate: number;
  salePriceUsd: number;
  buyerPaidShippingUsd: number;
  buyerPaidExtrasUsd: number;
  buyerTaxCollectedByEtsyUsd: number;
  linkedOwnerKey: string | null;
  linkedProductId: string | null;
  selectedTariffCode: string | null;
  importDutyEnabled: boolean;
  importDutyRate: number | null;
  importDutyLabel: string | null;
  saleDiscountPercent: number;
  coupon: CouponInput;
  freeShipping: boolean;
  productCost: MoneyInput;
  actualShippingCost: MoneyInput;
  packagingCost: MoneyInput;
  shipentegraOperationCost: MoneyInput;
  customCosts: CostLineInput[];
  overheadMode: "off" | "per_order" | "allocated_total";
  overheadPerOrder: MoneyInput;
  overheadTotalLines: CostLineInput[];
  overheadExpectedOrderCount: number;
  targetProfitMode: "margin_percent" | "net_profit_usd" | "net_profit_try";
  targetProfitValue: number;
  vatMode: "vat_id_provided" | "no_vat_id";
  currencyConversionEnabled: boolean;
  offsiteAdsMode: "off" | "rate_12" | "rate_15";
  includeDepositFee: boolean;
  feeProfileOverrides: FeeProfileOverrides | null;
}

export type BreakdownSourceType = "official_default" | "official_override" | "user_input" | "conditional";

export interface BreakdownRow {
  key: string;
  label: string;
  amountUsd: number;
  amountTry: number;
  sourceType: BreakdownSourceType;
  note?: string;
}

export interface ScenarioWarning {
  key: string;
  message: string;
}

export interface ScenarioSnapshot {
  normalizedRevenueUsd: number;
  normalizedRevenueTry: number;
  totalEtsyFeesUsd: number;
  totalEtsyFeesTry: number;
  totalOperationalCostsUsd: number;
  totalOperationalCostsTry: number;
  netProfitUsd: number;
  netProfitTry: number;
  netMarginPercent: number;
  breakdown: BreakdownRow[];
  warnings: ScenarioWarning[];
}

export interface ScenarioResult extends ScenarioSnapshot {
  breakEvenPriceUsd: number | null;
  targetSafeListPriceUsd: number | null;
}

export type CalculatorQuickTab = "target_price" | "analyze_price";

export interface FormattedBreakdownRow extends BreakdownRow {
  badgeLabel: string;
  formattedUsd: string;
  formattedTry: string;
}

export interface BreakdownGroup {
  key: "etsy_fees" | "user_costs" | "summary";
  label: string;
  rows: Array<
    FormattedBreakdownRow | {
      key: string;
      label: string;
      formattedUsd: string;
      formattedTry: string;
      badgeLabel: string;
      note?: string;
    }
  >;
}

export interface QuickModeViewModel {
  recommendedSalePriceUsd: number | null;
  breakEvenPriceUsd: number | null;
  targetSafeListPriceUsd: number | null;
  recommendedScenario: ScenarioSnapshot | null;
  enteredPriceScenario: ScenarioSnapshot | null;
  hasEnteredSalePrice: boolean;
}

export interface EtsyCostCalculatorPreset {
  id: string;
  name: string;
  input: CalculatorDraft;
  createdAt: number;
  updatedAt: number;
}

export interface EtsyCostCalculatorStorage {
  version: 1;
  profileVersion: string;
  draft: CalculatorDraft;
  presets: EtsyCostCalculatorPreset[];
  updatedAt: number;
}
