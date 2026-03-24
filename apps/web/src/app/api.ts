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
  thumbnailImage: string | null;
  currentPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  inStockVariantCount: number | null;
  totalVariantCount: number | null;
  isFavorite: boolean;
  lastCheckedAt?: number | null;
}

export interface TrackingViewResponse {
  summary: TrackingSummary;
  items: TrackingItem[];
  filters: {
    status?: string | null;
    parseStatus?: string | null;
    search?: string | null;
    favorite?: boolean;
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
    trendyolUrl: string | null;
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
    newPrice: number | null;
    changedAt: number;
    changeReason: string | null;
    refreshAuditId: string | null;
  }>;
  stockHistory: Array<{
    id: string;
    productId: string;
    variantId: string;
    previousStockState: string | null;
    newStockState: string;
    changedAt: number;
    refreshAuditId: string | null;
  }>;
  changeTimeline: ProductChangeTimelineItem[];
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

export interface DraftAttribute {
  key: string;
  value: string;
}

export interface EtsyDraft {
  id: string;
  productId: string;
  englishTitle: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  tags: string[];
  materials: string[];
  attributes: DraftAttribute[];
  seoNotes: string | null;
  policyNotes: string | null;
  generatedVersion: number;
  editedVersion: number;
  lastGeneratedAt: number | null;
  manualEditsPresent: boolean;
}

export type EtsyPrepField = "title" | "description" | "tags";

export interface EtsyPrepBootstrapResponse {
  product: ProductDetailResponse["product"];
  draft: EtsyDraft;
}

export interface EtsyPrepAnalysisInsights {
  seoNotes?: string | null;
  policyNotes?: string | null;
  riskNotes?: string | null;
  merchandisingNotes?: string | null;
}

export interface EtsyPrepStepStartedEvent {
  type: "step_started";
  step: string;
  field: "general" | EtsyPrepField;
}

export interface EtsyPrepStepCompletedEvent {
  type: "step_completed";
  step: string;
  field: "general" | EtsyPrepField;
  signals?: Record<string, unknown>;
  constraints?: Record<string, unknown>;
}

export interface EtsyPrepResearchSummaryEvent {
  type: "research_summary";
  summary: {
    title?: string;
    keywordAngles?: string[];
    audienceThemes?: string[];
    policyNotes?: string[];
  };
}

export interface EtsyPrepResultReadyEvent {
  type: "result_ready";
  result: {
    productId: string;
    insights: EtsyPrepAnalysisInsights;
  };
}

export interface EtsyPrepPromptReadyEvent {
  type: "prompt_ready";
  field: EtsyPrepField;
  prompt: string;
  context: Record<string, unknown>;
}

export type EtsyPrepStreamEvent =
  | EtsyPrepStepStartedEvent
  | EtsyPrepStepCompletedEvent
  | EtsyPrepResearchSummaryEvent
  | EtsyPrepResultReadyEvent
  | EtsyPrepPromptReadyEvent;

export interface SaveEtsyPrepWorkspacePayload {
  englishTitle: string | null;
  longDescription: string | null;
  tags: string[];
  seoNotes: string | null;
  policyNotes: string | null;
  generatedFields: EtsyPrepField[];
  editedFields: EtsyPrepField[];
}

export interface ConnectorGenerateFieldPayload {
  field: EtsyPrepField;
  prompt: string;
  context?: Record<string, unknown>;
}

export interface DraftPromptResponse {
  instructions: string;
  source: {
    productId: string;
    productTitle: string;
    brand: string | null;
    category: string | null;
    description: string | null;
    attributes: DraftAttribute[];
    variants: Array<{
      variantKey: string;
      option1: string | null;
      option2: string | null;
      option3: string | null;
      currentPrice: number | null;
      currentStockState: string;
    }>;
  };
  constraints: {
    locale: "en";
    maxTitleLength: number;
    requiredTagCount: number;
  };
}

export interface ConnectorProfile {
  id: string;
  label: string;
  emailMasked: string | null;
  provider: string;
  status: "connected" | "needs_reauth" | "disconnected" | "error";
  lastValidatedAt: number | null;
  lastError: string | null;
  isActive?: boolean;
}

export interface ConnectionAttemptResponse {
  id: string;
  provider: "openai";
  status:
    | "pending_browser_launch"
    | "waiting_for_login"
    | "verifying_session"
    | "completed"
    | "failed"
    | "cancelled";
  profileId: string | null;
  error: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ConnectorHealthResponse {
  status: string;
  provider: string;
  activeProfile: ConnectorProfile | null;
  connectionAttempt: ConnectionAttemptResponse | null;
}

export interface ConnectorProfilesResponse {
  items: ConnectorProfile[];
  activeProfile: ConnectorProfile | null;
}

export class ConnectorRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ConnectorRequestError";
  }
}

export interface AppSettingsResponse {
  id: string;
  refreshIntervalHours: number;
  promptPreferences: Record<string, unknown> | null;
  connectorHealthcheckEnabled: boolean;
  aiTargetBaseUrl: string | null;
  aiTargetManagementKey: string | null;
  aiTargetLabel: string | null;
  aiTargetApiKey: string | null;
}

export interface ManualRefreshRunSummary {
  id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED";
  totalCount: number;
  pendingCount: number;
  runningCount: number;
  successCount: number;
  failedCount: number;
  startedAt: number | null;
  finishedAt: number | null;
  scope: "ALL" | "FAILED_ONLY";
  sourceRunId: string | null;
}

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("İstek zaman aşımına uğradı. Lütfen tekrar deneyin.");
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as
        | {
            error?:
              | string
              | {
                  code?: string;
                  message?: string;
                };
          }
        | null;
      if (body?.error && typeof body.error === "object") {
        throw new Error(body.error.message ?? `Request failed (${response.status})`);
      }

      throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${response.status})`);
    }

    const fallbackText = await response.text().catch(() => "");
    const message = fallbackText.trim().slice(0, 180);
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function parseConnectorJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as
        | {
            error?:
              | string
              | {
                  code?: string;
                  message?: string;
                };
          }
        | null;

      if (body?.error && typeof body.error === "object") {
        throw new ConnectorRequestError(
          body.error.code ?? "CONNECTOR_REQUEST_FAILED",
          body.error.message ?? `Request failed (${response.status})`,
        );
      }

      throw new Error(typeof body?.error === "string" ? body.error : `Request failed (${response.status})`);
    }

    const fallbackText = await response.text().catch(() => "");
    const message = fallbackText.trim().slice(0, 180);
    throw new Error(message || `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

async function assertOkResponse(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  await parseJson<{ error: string }>(response);
  throw new Error(`Request failed (${response.status})`);
}

async function assertConnectorOkResponse(response: Response): Promise<Response> {
  if (response.ok) {
    return response;
  }

  await parseConnectorJson<{ ok: true }>(response);
  throw new Error(`Request failed (${response.status})`);
}

export async function fetchTrackingView(options: { favoriteOnly?: boolean } = {}): Promise<TrackingViewResponse> {
  const search = new URLSearchParams();
  if (options.favoriteOnly) {
    search.set("favorite", "true");
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`/tracking/products${suffix}`);
  return parseJson<TrackingViewResponse>(response);
}

export async function createTrackedProduct(trendyolUrl: string): Promise<CreateTrackedProductResponse> {
  const response = await fetchWithTimeout("/tracking/products", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trendyolUrl }),
  });

  return parseJson<CreateTrackedProductResponse>(response);
}

export async function fetchProductDetail(productId: string): Promise<ProductDetailResponse> {
  const response = await fetchWithTimeout(`/products/${productId}`);
  return parseJson<ProductDetailResponse>(response);
}

export async function setTrackedProductFavorite(productId: string, isFavorite: boolean) {
  const response = await fetchWithTimeout(`/tracking/products/${productId}/favorite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isFavorite }),
  });

  return parseJson<{ productId: string; isFavorite: boolean }>(response);
}

export async function deleteTrackedProduct(productId: string) {
  const response = await fetchWithTimeout(`/tracking/products/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function startManualRefreshRun() {
  const response = await fetchWithTimeout("/tracking/products/refresh-runs", {
    method: "POST",
  });

  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

export async function fetchActiveManualRefreshRun() {
  const response = await fetchWithTimeout("/tracking/products/refresh-runs/active");
  return parseJson<{ run: ManualRefreshRunSummary | null }>(response);
}

export async function fetchManualRefreshRun(runId: string) {
  const response = await fetchWithTimeout(`/tracking/products/refresh-runs/${runId}`);
  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

export async function retryFailedManualRefreshRun(runId: string) {
  const response = await fetchWithTimeout(`/tracking/products/refresh-runs/${runId}/retry-failed`, {
    method: "POST",
  });

  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

function getFilenameFromDisposition(contentDisposition: string | null, fallback: string) {
  if (!contentDisposition) {
    return fallback;
  }

  const utf8Match = contentDisposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename\s*=\s*"([^"]+)"/i) ?? contentDisposition.match(/filename\s*=\s*([^;]+)/i);
  if (plainMatch?.[1]) {
    return plainMatch[1].trim();
  }

  return fallback;
}

export async function downloadProductImage(productId: string, imageUrl: string) {
  const search = new URLSearchParams({ url: imageUrl });
  const response = await fetchWithTimeout(`/products/${productId}/images/download?${search.toString()}`);

  if (!response.ok) {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.includes("application/json")) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? "Görsel indirilemedi.");
    }

    throw new Error("Görsel indirilemedi.");
  }

  return {
    blob: await response.blob(),
    filename: getFilenameFromDisposition(response.headers.get("content-disposition"), "urun-gorseli.jpg"),
  };
}

export async function fetchNotifications(productId?: string): Promise<{ items: NotificationItem[] }> {
  const search = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const response = await fetchWithTimeout(`/notifications${search}`);
  return parseJson<{ items: NotificationItem[] }>(response);
}

export async function fetchDraft(productId: string): Promise<{ draft: EtsyDraft; prompt: DraftPromptResponse | null }> {
  const response = await fetchWithTimeout(`/drafts/${productId}`);
  return parseJson<{ draft: EtsyDraft; prompt: DraftPromptResponse | null }>(response);
}

export async function fetchEtsyPrepWorkspace(productId: string): Promise<EtsyPrepBootstrapResponse> {
  const response = await fetchWithTimeout(`/products/${productId}/etsy-prep`);
  return parseJson<EtsyPrepBootstrapResponse>(response);
}

export async function streamEtsyPrepAnalysis(productId: string) {
  const response = await fetchWithTimeout(`/products/${productId}/etsy-prep/analyze`, {
    method: "POST",
  });

  return assertOkResponse(response);
}

export async function streamEtsyPrepFieldPackage(productId: string, field: EtsyPrepField) {
  const path = field === "title" ? "generate-title" : field === "description" ? "generate-description" : "generate-tags";
  const response = await fetchWithTimeout(`/products/${productId}/etsy-prep/${path}`, {
    method: "POST",
  });

  return assertOkResponse(response);
}

export async function saveEtsyPrepWorkspace(productId: string, payload: SaveEtsyPrepWorkspacePayload) {
  const response = await fetchWithTimeout(`/products/${productId}/etsy-prep/save`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EtsyDraft>(response);
}

export async function patchDraft(
  productId: string,
  payload: Partial<
    Pick<EtsyDraft, "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes">
  >,
) {
  const response = await fetchWithTimeout(`/drafts/${productId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EtsyDraft>(response);
}

export async function saveGeneratedDraft(
  productId: string,
  payload: {
    overwrite?: boolean;
    generated: Pick<
      EtsyDraft,
      "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes"
    >;
  },
) {
  const response = await fetchWithTimeout(`/drafts/${productId}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EtsyDraft>(response);
}

export async function fetchConnectorHealth() {
  const response = await fetchWithTimeout("/ai-profiles/health");
  return parseJson<ConnectorHealthResponse>(response);
}

export async function fetchConnectorProfiles() {
  const response = await fetchWithTimeout("/ai-profiles");
  return parseJson<ConnectorProfilesResponse>(response);
}

export async function activateConnectorProfile(profileId: string) {
  const response = await fetchWithTimeout(`/ai-profiles/${encodeURIComponent(profileId)}/activate`, {
    method: "POST",
  });

  return parseJson<{ ok: true; activeProfile: ConnectorProfile }>(response);
}

export async function startOpenAiConnection() {
  const response = await fetchWithTimeout("/ai-profiles/openai/start", {
    method: "POST",
  });

  return parseConnectorJson<{ attempt: ConnectionAttemptResponse; authorizationUrl: string }>(response);
}

export async function fetchConnectionAttempt(attemptId: string) {
  const response = await fetchWithTimeout(`/ai-profiles/openai/attempts/${encodeURIComponent(attemptId)}`);
  return parseJson<{ attempt: ConnectionAttemptResponse }>(response);
}

export async function reconnectConnectorProfile(profileId: string) {
  const response = await fetchWithTimeout(`/ai-profiles/${encodeURIComponent(profileId)}/reconnect`, {
    method: "POST",
  });

  return parseConnectorJson<{ attempt: ConnectionAttemptResponse }>(response);
}

export async function deleteConnectorProfile(profileId: string) {
  const response = await fetchWithTimeout(`/ai-profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });

  if (response.status !== 204) {
    await assertOkResponse(response);
  }
}

export async function connectorGenerate(payload: {
  productId: string;
  language: "en";
  sourceTitle: string;
  sourceDescription?: string | null;
  sourceAttributes?: Array<{ key: string; value: string }>;
}) {
  const response = await fetchWithTimeout("/ai-profiles/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseConnectorJson<{
    englishTitle: string;
    shortDescription: string;
    longDescription: string;
    tags: string[];
    materials: string[];
    attributes: Array<{ key: string; value: string }>;
    seoNotes: string;
    policyNotes: string;
    model: string;
  }>(response);
}

export async function connectorGenerateField(payload: ConnectorGenerateFieldPayload) {
  const response = await fetchWithTimeout("/ai-profiles/generate-field", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseConnectorJson<{
    field: EtsyPrepField;
    value: string;
    provider: string;
  }>(response);
}

export async function syncAiProfiles(payload: {
  connectorStatus: { status: string; provider: string };
  profiles: Array<{
    id: string;
    label: string;
    emailMasked: string | null;
    provider: string;
    isActive: boolean;
    status: ConnectorProfile["status"];
    lastValidatedAt: number | null;
    lastError: string | null;
  }>;
}) {
  const response = await fetchWithTimeout("/ai-profiles/sync", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{
    items: Array<
      ConnectorProfile & {
        isActive: boolean;
        connectorStatusSnapshot: string | null;
        lastSeenAt: number | null;
        updatedAt: number;
      }
    >;
  }>(response);
}

export async function fetchAiProfiles() {
  const response = await fetchWithTimeout("/ai-profiles");
  return parseJson<{
    items: Array<
      ConnectorProfile & {
        isActive: boolean;
        connectorStatusSnapshot: string | null;
        lastSeenAt: number | null;
        updatedAt: number;
      }
    >;
  }>(response);
}

export async function fetchSettings() {
  const response = await fetchWithTimeout("/settings");
  return parseJson<AppSettingsResponse>(response);
}

export async function patchSettings(payload: {
  refreshIntervalHours?: number;
  promptPreferences?: Record<string, unknown> | null;
  connectorHealthcheckEnabled?: boolean;
  aiTargetBaseUrl?: string | null;
  aiTargetManagementKey?: string | null;
  aiTargetLabel?: string | null;
  aiTargetApiKey?: string | null;
}) {
  const response = await fetchWithTimeout("/settings", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<AppSettingsResponse>(response);
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
