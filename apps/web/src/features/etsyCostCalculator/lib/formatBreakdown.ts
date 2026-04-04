import type { BreakdownRow } from "./types";

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});
const tryFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
});

const SOURCE_LABELS = {
  system_default: "Sistem",
  manual_override: "Manuel",
  profile_default: "Profil",
  analysis_selected: "Analiz",
  conditional: "Kosullu",
} as const;

export function formatBreakdown(rows: BreakdownRow[]) {
  return rows.map((row) => ({
    ...row,
    badgeLabel: SOURCE_LABELS[row.sourceType],
    formattedUsd: usdFormatter.format(row.amountUsd),
    formattedTry: tryFormatter.format(row.amountTry),
  }));
}
