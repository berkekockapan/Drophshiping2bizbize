export interface RefreshAuditRow {
  id: string;
  source: "MANUAL" | "SCHEDULED";
  status: "SUCCESS" | "NO_CHANGE" | "PARSE_ERROR" | "FETCH_ERROR";
  errorMessage: string | null;
  checkedAt: number;
}

export interface ContentHistoryRow {
  id: string;
  refreshAuditId: string;
  fieldKey: "TITLE" | "DESCRIPTION" | "IMAGES";
  previousValueRaw: string | null;
  newValueRaw: string | null;
  changedAt: number;
}

export interface PriceHistoryRow {
  id: string;
  variantId: string | null;
  previousPrice: number | null;
  newPrice: number | null;
  changedAt: number;
  changeReason: "PRODUCT_PRICE_CHANGED" | "VARIANT_PRICE_CHANGED" | null;
  refreshAuditId: string | null;
}

export interface StockHistoryRow {
  id: string;
  variantId: string;
  previousStockState: string | null;
  newStockState: string;
  changedAt: number;
  refreshAuditId: string | null;
}

interface VariantSummary {
  id: string;
  variantKey: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
}

export interface ProductChangeTimelineItem {
  id: string;
  type:
    | "REFRESH_NO_CHANGE"
    | "REFRESH_ERROR"
    | "TITLE_CHANGED"
    | "DESCRIPTION_CHANGED"
    | "IMAGES_CHANGED"
    | "PRODUCT_PRICE_CHANGED"
    | "VARIANT_PRICE_CHANGED"
    | "VARIANT_STOCK_CHANGED";
  changedAt: number;
  summary: string;
  details: string | null;
  before: string | null;
  after: string | null;
  variantKey: string | null;
  refreshSource: "MANUAL" | "SCHEDULED" | null;
}

function formatPrice(value: number | null) {
  if (value == null) {
    return null;
  }

  return `${(value / 100).toFixed(2)} TL`;
}

function formatStockState(value: string | null) {
  if (value === "IN_STOCK") {
    return "Stokta";
  }

  if (value === "OUT_OF_STOCK") {
    return "Stokta degil";
  }

  return null;
}

function getVariantLabel(variant: VariantSummary) {
  return [variant.option1, variant.option2, variant.option3].filter(Boolean).join(" / ") || variant.variantKey;
}

function toAuditTimelineItem(audit: RefreshAuditRow): ProductChangeTimelineItem | null {
  if (audit.status === "SUCCESS") {
    return null;
  }

  if (audit.status === "NO_CHANGE") {
    return {
      id: audit.id,
      type: "REFRESH_NO_CHANGE",
      changedAt: audit.checkedAt,
      summary: "Yenileme yapildi, degisiklik bulunamadi",
      details: null,
      before: null,
      after: null,
      variantKey: null,
      refreshSource: audit.source,
    };
  }

  return {
    id: audit.id,
    type: "REFRESH_ERROR",
    changedAt: audit.checkedAt,
    summary: "Yenileme hata ile sonlandi",
    details: audit.errorMessage,
    before: null,
    after: null,
    variantKey: null,
    refreshSource: audit.source,
  };
}

function toContentTimelineItem(
  entry: ContentHistoryRow,
  auditSource: "MANUAL" | "SCHEDULED" | null,
): ProductChangeTimelineItem {
  if (entry.fieldKey === "TITLE") {
    return {
      id: entry.id,
      type: "TITLE_CHANGED",
      changedAt: entry.changedAt,
      summary: "Baslik degisti",
      details: null,
      before: entry.previousValueRaw,
      after: entry.newValueRaw,
      variantKey: null,
      refreshSource: auditSource,
    };
  }

  if (entry.fieldKey === "DESCRIPTION") {
    return {
      id: entry.id,
      type: "DESCRIPTION_CHANGED",
      changedAt: entry.changedAt,
      summary: "Aciklama guncellendi",
      details: null,
      before: entry.previousValueRaw,
      after: entry.newValueRaw,
      variantKey: null,
      refreshSource: auditSource,
    };
  }

  return {
    id: entry.id,
    type: "IMAGES_CHANGED",
    changedAt: entry.changedAt,
    summary: "Gorsel listesi degisti",
    details: null,
    before: entry.previousValueRaw,
    after: entry.newValueRaw,
    variantKey: null,
    refreshSource: auditSource,
  };
}

function toPriceTimelineItem(
  entry: PriceHistoryRow,
  variantLabels: Map<string, string>,
  auditSource: "MANUAL" | "SCHEDULED" | null,
): ProductChangeTimelineItem {
  if (entry.changeReason === "VARIANT_PRICE_CHANGED" && entry.variantId) {
    const variantLabel = variantLabels.get(entry.variantId) ?? entry.variantId;
    return {
      id: entry.id,
      type: "VARIANT_PRICE_CHANGED",
      changedAt: entry.changedAt,
      summary: `${variantLabel} varyanti fiyati degisti`,
      details: null,
      before: formatPrice(entry.previousPrice),
      after: formatPrice(entry.newPrice),
      variantKey: variantLabel,
      refreshSource: auditSource,
    };
  }

  return {
    id: entry.id,
    type: "PRODUCT_PRICE_CHANGED",
    changedAt: entry.changedAt,
    summary: "Urun fiyati degisti",
    details: null,
    before: formatPrice(entry.previousPrice),
    after: formatPrice(entry.newPrice),
    variantKey: null,
    refreshSource: auditSource,
  };
}

function toStockTimelineItem(
  entry: StockHistoryRow,
  variantLabels: Map<string, string>,
  auditSource: "MANUAL" | "SCHEDULED" | null,
): ProductChangeTimelineItem {
  const variantLabel = variantLabels.get(entry.variantId) ?? entry.variantId;
  const summary =
    entry.newStockState === "OUT_OF_STOCK"
      ? `${variantLabel} varyanti stok disi oldu`
      : `${variantLabel} varyanti yeniden stokta`;

  return {
    id: entry.id,
    type: "VARIANT_STOCK_CHANGED",
    changedAt: entry.changedAt,
    summary,
    details: null,
    before: formatStockState(entry.previousStockState),
    after: formatStockState(entry.newStockState),
    variantKey: variantLabel,
    refreshSource: auditSource,
  };
}

export function buildProductChangeTimeline(input: {
  audits: RefreshAuditRow[];
  contentHistory: ContentHistoryRow[];
  priceHistory: PriceHistoryRow[];
  stockHistory: StockHistoryRow[];
  variants: VariantSummary[];
}) {
  const auditSources = new Map(input.audits.map((audit) => [audit.id, audit.source] as const));
  const variantLabels = new Map(input.variants.map((variant) => [variant.id, getVariantLabel(variant)] as const));

  return [
    ...input.audits.map((audit) => toAuditTimelineItem(audit)).filter((item): item is ProductChangeTimelineItem => item !== null),
    ...input.contentHistory.map((entry) => toContentTimelineItem(entry, auditSources.get(entry.refreshAuditId) ?? null)),
    ...input.priceHistory.map((entry) => toPriceTimelineItem(entry, variantLabels, entry.refreshAuditId ? (auditSources.get(entry.refreshAuditId) ?? null) : null)),
    ...input.stockHistory.map((entry) => toStockTimelineItem(entry, variantLabels, entry.refreshAuditId ? (auditSources.get(entry.refreshAuditId) ?? null) : null)),
  ].sort((left, right) => right.changedAt - left.changedAt || left.id.localeCompare(right.id));
}
