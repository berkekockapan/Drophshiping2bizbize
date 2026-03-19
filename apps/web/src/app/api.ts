export interface TrackingSummary {
  trackedCount: number;
  activeCount: number;
  reviewNeededCount: number;
}

export interface TrackingItem {
  id: string;
  trendyolUrl?: string;
  title: string | null;
  brand: string | null;
  status: string;
  parseStatus: string;
  currentPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStockVariantCount: number | null;
  totalVariantCount: number | null;
  lastCheckedAt?: number | null;
}

export interface TrackingViewResponse {
  summary: TrackingSummary;
  items: TrackingItem[];
  filters: {
    status?: string | null;
    parseStatus?: string | null;
    search?: string | null;
  };
}

export interface CreateTrackedProductResponse {
  product: {
    id: string;
    trendyolUrl: string;
    sourceProductId: string | null;
    title: string;
    variantCount: number;
  };
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? "Request failed");
  }

  return response.json() as Promise<T>;
}

export async function fetchTrackingView(): Promise<TrackingViewResponse> {
  const response = await fetch("/tracking/products");
  return parseJson<TrackingViewResponse>(response);
}

export async function createTrackedProduct(trendyolUrl: string): Promise<CreateTrackedProductResponse> {
  const response = await fetch("/tracking/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trendyolUrl }),
  });

  return parseJson<CreateTrackedProductResponse>(response);
}

export function formatPrice(cents: number | null | undefined) {
  if (cents == null) {
    return "—";
  }

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
