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
  official_default: "Resmi varsayilan",
  official_override: "Ozellestirilmis",
  user_input: "Kullanici girdisi",
  conditional: "Kosullu kalem",
} as const;

export function formatBreakdown(rows: BreakdownRow[]) {
  return rows.map((row) => ({
    ...row,
    badgeLabel: SOURCE_LABELS[row.sourceType],
    formattedUsd: usdFormatter.format(row.amountUsd),
    formattedTry: tryFormatter.format(row.amountTry),
  }));
}
