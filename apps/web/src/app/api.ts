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

export interface DetailAttribute {
  key: string;
  value: string;
}

export interface NotificationItem {
  id: string;
  productId: string | null;
  type: string;
  severity: string;
  title: string;
  body: string;
  readAt: number | null;
  createdAt: number;
}

export interface ProductDetailResponse {
  product: {
    id: string;
    trendyolUrl: string;
    sourceProductId: string | null;
    title: string | null;
    brand: string | null;
    category: string | null;
    descriptionRaw: string | null;
    attributes: DetailAttribute[] | null;
    images: string[] | null;
    status: string;
    parseStatus: string;
    lastCheckedAt: number | null;
  };
  currentState: {
    currentPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    inStockVariantCount: number;
    totalVariantCount: number;
    lastChangeAt: number | null;
    lastCheckedAt: number | null;
  };
  variants: Array<{
    id: string;
    variantKey: string;
    option1: string | null;
    option2: string | null;
    option3: string | null;
    currentStockState: string;
    currentPrice: number | null;
    lastSeenAt: number | null;
    rawPayload: Record<string, unknown> | null;
  }>;
  priceHistory: Array<{
    id: string;
    productId: string;
    variantId: string | null;
    previousPrice: number | null;
    newPrice: number;
    changedAt: number;
    changeReason: string | null;
  }>;
  stockHistory: Array<{
    id: string;
    productId: string;
    variantId: string;
    previousStockState: string | null;
    newStockState: string;
    changedAt: number;
  }>;
  notifications: NotificationItem[];
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

export async function fetchProductDetail(productId: string): Promise<ProductDetailResponse> {
  const response = await fetch(`/products/${productId}`);
  return parseJson<ProductDetailResponse>(response);
}

export async function fetchNotifications(productId?: string): Promise<{ items: NotificationItem[] }> {
  const search = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const response = await fetch(`/notifications${search}`);
  return parseJson<{ items: NotificationItem[] }>(response);
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

export function formatDateTime(value: number | null | undefined) {
  if (value == null) {
    return "—";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
