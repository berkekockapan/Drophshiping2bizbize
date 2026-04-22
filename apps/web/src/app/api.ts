import type {
  CreateSourceProductEtsyLinkRequest,
  CreateSourceProductRequest,
  GenerateListingPackResponse,
  PatchSourceProductRequest,
  SourceProductDetailResponse,
  SourceProductListResponse,
} from "@dropshiping2bizbize/shared";

import type { OwnerKey } from "../features/shared/lib/ownerRouteState";
import type { EtsyCostCalculatorStorage } from "../features/etsyCostCalculator/lib/types";

export interface TrackingSummary {
  trackedCount: number;
  activeCount: number;
  reviewNeededCount: number;
}

export interface ProductCategory {
  id: string;
  name: string;
}

export interface EtsyShop {
  id: string;
  name: string;
  etsyShopUrl: string;
  description: string | null;
  productCount?: number;
  assignedAt?: number;
}

export interface EtsyShopListResponse {
  items: EtsyShop[];
}

export interface EtsyShopDetailResponse {
  shop: EtsyShop;
  products: TrackingViewResponse;
}

export interface SourceProductCategory {
  id: string;
  name: string;
}

export interface SourceProductItem {
  id: string;
  ownerKey: OwnerKey;
  title: string;
  sourceUrl: string;
  platform: string | null;
  notes: string | null;
  sourceCategory: SourceProductCategory | null;
  sortOrder: number | null;
  deletedAt: number | null;
  deletedReason?: string | null;
  linkedEtsyCount: number;
  linkedEtsyItems: Array<{
    id: string;
    title: string;
    url: string;
  }>;
  createdAt?: number;
  updatedAt?: number;
}

export interface SourceProductsViewResponse {
  items: SourceProductItem[];
  filters: {
    search?: string | null;
    categoryId?: string | null;
  };
}

export interface SourceProductsTrashResponse {
  items: SourceProductItem[];
  total: number;
}

export interface SourceProductManagementDetailResponse {
  sourceProduct: SourceProductItem & {
    deletedReason: string | null;
    createdAt: number;
    updatedAt: number;
  };
  linkedEtsyItems: Array<{
    id: string;
    title: string;
    url: string;
  }>;
}

export interface TrackingItem {
  id: string;
  ownerKey: OwnerKey;
  trendyolUrl?: string;
  sourceProductId?: string | null;
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
  userCategory?: ProductCategory | null;
  shops?: EtsyShop[];
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
    categoryId?: string | null;
    shopId?: string | null;
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

export interface ProductTariffRecommendation {
  catalogId: string;
  canonicalHs6: string;
  profileName: string | null;
  title: string;
  rationale: string;
  score: number;
  usProfileId: string | null;
  htsCode10: string | null;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
  sourceBadges: string[];
}

export interface AutoSelectedTariffProfile {
  catalogId: string;
  profileName: string | null;
  canonicalHs6: string;
  htsCode10: string | null;
  combinedDutyRate: number;
  dutySummary: string;
  defaultShipentegraUsd: number | null;
}

export interface ProductTariffAnalysisRun {
  id: string;
  productId: string;
  ownerKey: OwnerKey;
  status: string;
  usedAi: boolean;
  inputSnapshot: Record<string, unknown>;
  resultSnapshot:
    | {
        confidenceState?: "high_confidence" | "low_confidence";
        selectedProfile?: AutoSelectedTariffProfile | null;
        lockedReason?: string | null;
        recommendations: ProductTariffRecommendation[];
      }
    | null;
  engineVersion: string;
  createdAt: number;
  completedAt: number | null;
}

export interface ProductTariffSelection {
  productId: string;
  ownerKey: OwnerKey;
  catalogId: string;
  canonicalHs6: string;
  title: string;
  usProfileId: string | null;
  selectionSource: string;
  selectedBy: string;
  selectedAt: number;
  analysisRunId: string | null;
  createdAt: number;
  updatedAt: number;
  generalDutyRate: number;
  additionalDutyRate: number;
  combinedDutyRate: number;
  dutySummary: string;
  revisionLabel: string | null;
}

export interface ProductTariffAnalysisSummary {
  selection: ProductTariffSelection | null;
  latestRun: ProductTariffAnalysisRun | null;
  recommendations: ProductTariffRecommendation[];
  manualSearchEnabled: boolean;
  disclaimer: string;
}

export interface EtsySystemListingPromptPack {
  prompt: string;
  outputContract: {
    type: "json";
    fields: string[];
  };
}

export interface EtsyChatGptResearchPromptPack {
  prompt: string;
  outputFormat: "sectioned-text";
  researchMode: "required";
  expectedSections: ["title", "description", "tags"];
}

export interface EtsyPromptPackResponse {
  rulebookVersion: string;
  generatedAt: number;
  productSnapshot: {
    productId: string;
    title: string;
    brand: string | null;
    category: string | null;
    attributeCount: number;
    variantCount: number;
    imageCount: number;
  };
  systemListingPromptPack: EtsySystemListingPromptPack;
  chatGptResearchPromptPack: EtsyChatGptResearchPromptPack;
  imagePromptPack: {
    mainPrompt: string;
    variations: string[];
    guardrailSummary: string[];
  };
}

export interface ProductCostContextVariant {
  variantId: string;
  label: string;
  autoProductCost: {
    amount: number;
    currency: "TRY";
  };
  manualProductCost: {
    amount: number;
    currency: "USD" | "TRY";
  } | null;
  autoShippingEstimate: {
    amount: number;
    currency: "USD";
    sourceType: "profile_default" | "system_default";
  };
  manualShippingCost: {
    amount: number;
    currency: "USD" | "TRY";
  } | null;
}

export interface ProductCostContext {
  selectedVariantId: string | null;
  variants: ProductCostContextVariant[];
  usState: {
    status: "automatic_confirmed" | "review_required" | "locked";
    label: string;
    lockedReason: string | null;
    profile: ProductTariffSelection | AutoSelectedTariffProfile | null;
  };
}

export interface ProductDetailResponse {
  product: {
    id: string;
    ownerKey: OwnerKey;
    trendyolUrl: string;
    sourceProductId: string | null;
    title: string | null;
    brand: string | null;
    category: string | null;
    userCategory?: ProductCategory | null;
    descriptionRaw: string | null;
    attributes: DetailAttribute[] | null;
    images: string[] | null;
    status: string;
    parseStatus: string;
    lastCheckedAt: number | null;
    shops: EtsyShop[];
  };
  currentState: {
    currentPrice: number | null;
    minPrice: number | null;
    maxPrice: number | null;
    inStockVariantCount: number;
    totalVariantCount: number;
    lastChangeAt: number | null;
    lastCheckedAt: number | null;
    shops: EtsyShop[];
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
  costContext: ProductCostContext;
  tariffAnalysis: ProductTariffAnalysisSummary;
}

const DEFAULT_TARIFF_DISCLAIMER = "Planlama amacli GTIP tahminidir; nihai beyan karari degildir.";

function normalizeTariffAnalysis(
  value: ProductTariffAnalysisSummary | null | undefined,
): ProductTariffAnalysisSummary {
  if (!value) {
    return {
      selection: null,
      latestRun: null,
      recommendations: [],
      manualSearchEnabled: true,
      disclaimer: DEFAULT_TARIFF_DISCLAIMER,
    };
  }

  return {
    selection: value.selection ?? null,
    latestRun: value.latestRun ?? null,
    recommendations: Array.isArray(value.recommendations) ? value.recommendations : [],
    manualSearchEnabled: typeof value.manualSearchEnabled === "boolean" ? value.manualSearchEnabled : true,
    disclaimer:
      typeof value.disclaimer === "string" && value.disclaimer.trim().length > 0
        ? value.disclaimer
        : DEFAULT_TARIFF_DISCLAIMER,
  };
}

export interface CreateTrackedProductResponse {
  product: {
    id: string;
    ownerKey: OwnerKey;
    trendyolUrl: string;
    sourceProductId: string | null;
    title: string;
    variantCount: number;
  };
}

export interface TrashListResponse {
  items: TrackingItem[];
  total: number;
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
  etsyCostCalculator: EtsyCostCalculatorStorage | null;
}

export interface ManualRefreshRunSummary {
  id: string;
  ownerKey: OwnerKey;
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

export interface ProductTariffAnalysisRunResponse {
  runId: string;
  usedAi: boolean;
  confidenceState: "high_confidence" | "low_confidence";
  selectedProfile: AutoSelectedTariffProfile | null;
  lockedReason: string | null;
  recommendations: ProductTariffRecommendation[];
}

export interface ProductTariffSelectionPayload {
  catalogId: string;
  usProfileId: string | null;
  selectionSource: string;
}

export interface ProductTariffSelectionResponse {
  selection: ProductTariffSelection;
}

export interface ProductTariffSearchResponse {
  items: ProductTariffRecommendation[];
}

export interface TariffKnowledgeCandidatePayload {
  catalogId: string;
  usProfileId: string | null;
  candidateSource: string;
  notes?: string | null;
}

export interface TariffKnowledgeCandidateResponse {
  candidateId: string;
  status: string;
}

export interface SaveProductVariantCostOverridePayload {
  manualProductCost?: { amount: number; currency: "USD" | "TRY" } | null;
  manualShippingCost?: { amount: number; currency: "USD" | "TRY" } | null;
}

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();
const shouldPreferLocalProxy =
  import.meta.env.DEV &&
  Boolean(import.meta.env.VITE_API_PROXY_TARGET) &&
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);

const API_BASE_URL = (shouldPreferLocalProxy ? "" : rawApiBaseUrl).replace(/\/+$/, "");

function toApiUrl(path: string) {
  if (!API_BASE_URL || /^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function fetchWithTimeout(input: string, init?: RequestInit, timeoutMs = 30_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(toApiUrl(input), {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Istek zaman asimina ugradi. Lutfen tekrar deneyin.");
    }

    throw new Error(
      "Merkezi bulut verisine erisilemedi. Internet baglantisini ve canli API ayarlarini kontrol edip tekrar deneyin.",
    );
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

export async function fetchTrackingView(
  ownerKey: OwnerKey,
  options: { favoriteOnly?: boolean; categoryId?: string | "uncategorized" | null; shopId?: string | null } = {},
): Promise<TrackingViewResponse> {
  const search = new URLSearchParams();
  if (options.favoriteOnly) {
    search.set("favorite", "true");
  }
  if (options.categoryId) {
    search.set("categoryId", options.categoryId);
  }
  if (options.shopId) {
    search.set("shopId", options.shopId);
  }

  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products${suffix}`);
  return parseJson<TrackingViewResponse>(response);
}

export async function fetchSourceProductsView(
  ownerKey: OwnerKey,
  options: { search?: string; categoryId?: string | "uncategorized" | null } = {},
): Promise<SourceProductsViewResponse> {
  const search = new URLSearchParams();
  if (options.search?.trim()) {
    search.set("search", options.search.trim());
  }
  if (options.categoryId) {
    search.set("categoryId", options.categoryId);
  }
  const suffix = search.toString() ? `?${search.toString()}` : "";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products${suffix}`);
  return parseJson<SourceProductsViewResponse>(response);
}

export async function fetchSourceProductCategories(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-product-categories`);
  return parseJson<{ items: SourceProductCategory[] }>(response);
}

export async function createSourceProductCategory(ownerKey: OwnerKey, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-product-categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<{ category: SourceProductCategory }>(response);
}

export async function renameSourceProductCategory(ownerKey: OwnerKey, categoryId: string, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-product-categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<{ category: SourceProductCategory }>(response);
}

export async function deleteSourceProductCategory(ownerKey: OwnerKey, categoryId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-product-categories/${categoryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function setSourceProductCategory(ownerKey: OwnerKey, sourceProductId: string, categoryId: string | null) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}/category`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categoryId }),
  });

  return parseJson<{ sourceProductId: string; sourceCategory: SourceProductCategory | null }>(response);
}

export async function reorderSourceProducts(
  ownerKey: OwnerKey,
  payload: { categoryId: string | null; orderedIds: string[] },
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/reorder`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{ orderedIds: string[] }>(response);
}

export async function fetchSourceProductsTrash(ownerKey: OwnerKey): Promise<SourceProductsTrashResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/trash`);
  return parseJson<SourceProductsTrashResponse>(response);
}

export async function fetchSourceProductManagementDetail(
  ownerKey: OwnerKey,
  sourceProductId: string,
): Promise<SourceProductManagementDetailResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}/view`);
  return parseJson<SourceProductManagementDetailResponse>(response);
}

export async function deleteSourceProduct(ownerKey: OwnerKey, sourceProductId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function restoreSourceProduct(ownerKey: OwnerKey, sourceProductId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}/restore`, {
    method: "POST",
  });

  return parseJson<{ ok: true }>(response);
}

export async function permanentlyDeleteSourceProduct(ownerKey: OwnerKey, sourceProductId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}/permanent`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function fetchSourceProductDetail(ownerKey: OwnerKey, sourceProductId: string): Promise<SourceProductDetailResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}`);
  return parseJson<SourceProductDetailResponse>(response);
}

export async function fetchProductCategories(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories`);
  return parseJson<{ items: ProductCategory[] }>(response);
}

export async function createProductCategory(ownerKey: OwnerKey, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<{ category: ProductCategory }>(response);
}

export async function renameProductCategory(ownerKey: OwnerKey, categoryId: string, name: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories/${categoryId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  return parseJson<{ category: ProductCategory }>(response);
}

export async function deleteProductCategory(ownerKey: OwnerKey, categoryId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/categories/${categoryId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function setTrackedProductCategory(ownerKey: OwnerKey, productId: string, categoryId: string | null) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/category`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ categoryId }),
  });

  return parseJson<{ productId: string; userCategory: ProductCategory | null }>(response);
}

export async function createTrackedProduct(
  ownerKey: OwnerKey,
  trendyolUrl: string,
  options: { shopIds?: string[] } = {},
): Promise<CreateTrackedProductResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trendyolUrl, shopIds: options.shopIds ?? [] }),
  });

  return parseJson<CreateTrackedProductResponse>(response);
}

export async function fetchEtsyShops(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/etsy-shops`);
  return parseJson<EtsyShopListResponse>(response);
}

export async function createEtsyShop(
  ownerKey: OwnerKey,
  payload: { name: string; etsyShopUrl: string; description?: string | null },
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/etsy-shops`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{ shop: EtsyShop }>(response);
}

export async function fetchEtsyShopDetail(ownerKey: OwnerKey, shopId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/etsy-shops/${shopId}`);
  return parseJson<EtsyShopDetailResponse>(response);
}

export async function updateProductShops(ownerKey: OwnerKey, productId: string, shopIds: string[]) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-shops`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ shopIds }),
  });

  return parseJson<{ productId: string; shops: EtsyShop[] }>(response);
}

export async function assignProductToShop(ownerKey: OwnerKey, shopId: string, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/etsy-shops/${shopId}/products/${productId}`, {
    method: "POST",
  });

  return parseJson<{ productId: string; shops: EtsyShop[] }>(response);
}

export async function fetchProductDetail(ownerKey: OwnerKey, productId: string): Promise<ProductDetailResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}`);
  const payload = await parseJson<ProductDetailResponse & { tariffAnalysis?: ProductTariffAnalysisSummary | null }>(response);

  return {
    ...payload,
    product: {
      ...payload.product,
      shops: Array.isArray(payload.product?.shops) ? payload.product.shops : [],
    },
    currentState: {
      ...payload.currentState,
      shops: Array.isArray(payload.currentState?.shops) ? payload.currentState.shops : [],
    },
    tariffAnalysis: normalizeTariffAnalysis(payload.tariffAnalysis),
  };
}

export async function runProductTariffAnalysis(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-analysis/run`, {
    method: "POST",
  });

  return parseJson<ProductTariffAnalysisRunResponse>(response);
}

export async function saveProductTariffSelection(
  ownerKey: OwnerKey,
  productId: string,
  payload: ProductTariffSelectionPayload,
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-selection`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<ProductTariffSelectionResponse>(response);
}

export async function searchProductTariffCatalog(ownerKey: OwnerKey, productId: string, query: string) {
  const response = await fetchWithTimeout(
    `/owners/${ownerKey}/products/${productId}/tariff-search?q=${encodeURIComponent(query)}`,
  );

  return parseJson<ProductTariffSearchResponse>(response);
}

export async function submitTariffKnowledgeCandidate(
  ownerKey: OwnerKey,
  productId: string,
  payload: TariffKnowledgeCandidatePayload,
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/tariff-knowledge-candidates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<TariffKnowledgeCandidateResponse>(response);
}

export async function saveProductVariantCostOverride(
  ownerKey: OwnerKey,
  productId: string,
  variantId: string,
  payload: SaveProductVariantCostOverridePayload,
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/variants/${variantId}/cost-overrides`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{ override: { variantId: string } }>(response);
}

export async function setTrackedProductFavorite(ownerKey: OwnerKey, productId: string, isFavorite: boolean) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/favorite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ isFavorite }),
  });

  return parseJson<{ productId: string; isFavorite: boolean }>(response);
}

export async function deleteTrackedProduct(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function fetchSourceProducts(ownerKey: OwnerKey, search?: string | null): Promise<SourceProductListResponse> {
  const searchParams = new URLSearchParams();
  if (search && search.trim()) {
    searchParams.set("search", search.trim());
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : "";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products${suffix}`);
  return parseJson<SourceProductListResponse>(response);
}

export async function createSourceProduct(ownerKey: OwnerKey, payload: CreateSourceProductRequest) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<SourceProductDetailResponse>(response);
}

export async function updateSourceProduct(ownerKey: OwnerKey, sourceProductId: string, payload: PatchSourceProductRequest) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<SourceProductDetailResponse>(response);
}

export async function addSourceProductEtsyLink(
  ownerKey: OwnerKey,
  sourceProductId: string,
  payload: CreateSourceProductEtsyLinkRequest,
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/source-products/${sourceProductId}/etsy-links`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<SourceProductDetailResponse>(response);
}

export async function deleteSourceProductEtsyLink(ownerKey: OwnerKey, sourceProductId: string, etsyLinkId: string) {
  const response = await fetchWithTimeout(
    `/owners/${ownerKey}/source-products/${sourceProductId}/etsy-links/${etsyLinkId}`,
    {
      method: "DELETE",
    },
  );

  if (response.status !== 204) {
    await assertOkResponse(response);
  }
}

export async function fetchTrashView(ownerKey: OwnerKey): Promise<TrashListResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/trash`);
  return parseJson<TrashListResponse>(response);
}

export async function restoreTrackedProduct(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/trash/products/${productId}/restore`, {
    method: "POST",
  });

  return parseJson<{ ok: true }>(response);
}

export async function permanentlyDeleteTrackedProduct(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/trash/products/${productId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    await parseJson<{ error: string }>(response);
  }
}

export async function startManualRefreshRun(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/refresh-runs`, {
    method: "POST",
  });

  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

export async function fetchActiveManualRefreshRun(ownerKey: OwnerKey) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/refresh-runs/active`);
  return parseJson<{ run: ManualRefreshRunSummary | null }>(response);
}

export async function fetchManualRefreshRun(ownerKey: OwnerKey, runId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/refresh-runs/${runId}`);
  return parseJson<{ run: ManualRefreshRunSummary }>(response);
}

export async function retryFailedManualRefreshRun(ownerKey: OwnerKey, runId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/refresh-runs/${runId}/retry-failed`, {
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

export async function downloadProductImage(ownerKey: OwnerKey, productId: string, imageUrl: string) {
  const search = new URLSearchParams({ url: imageUrl });
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/images/download?${search.toString()}`);

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

export async function fetchNotifications(ownerKey: OwnerKey, productId?: string): Promise<{ items: NotificationItem[] }> {
  const search = productId ? `?productId=${encodeURIComponent(productId)}` : "";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/notifications${search}`);
  return parseJson<{ items: NotificationItem[] }>(response);
}

export async function fetchDraft(ownerKey: OwnerKey, productId: string): Promise<{ draft: EtsyDraft; prompt: DraftPromptResponse | null }> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/draft`);
  return parseJson<{ draft: EtsyDraft; prompt: DraftPromptResponse | null }>(response);
}

export async function fetchEtsyPrepWorkspace(ownerKey: OwnerKey, productId: string): Promise<EtsyPrepBootstrapResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep`);
  return parseJson<EtsyPrepBootstrapResponse>(response);
}

export async function fetchEtsyPromptPack(ownerKey: OwnerKey, productId: string): Promise<EtsyPromptPackResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep/prompt-pack`, {
    method: "POST",
  });

  return parseJson<EtsyPromptPackResponse>(response);
}

export async function generateEtsyListingPack(
  ownerKey: OwnerKey,
  productId: string,
): Promise<GenerateListingPackResponse> {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep/generate-listing-pack`, {
    method: "POST",
  });

  return parseConnectorJson<GenerateListingPackResponse>(response);
}

export async function streamEtsyPrepAnalysis(ownerKey: OwnerKey, productId: string) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep/analyze`, {
    method: "POST",
  });

  return assertOkResponse(response);
}

export async function streamEtsyPrepFieldPackage(ownerKey: OwnerKey, productId: string, field: EtsyPrepField) {
  const path = field === "title" ? "generate-title" : field === "description" ? "generate-description" : "generate-tags";
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep/${path}`, {
    method: "POST",
  });

  return assertOkResponse(response);
}

export async function saveEtsyPrepWorkspace(ownerKey: OwnerKey, productId: string, payload: SaveEtsyPrepWorkspacePayload) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/etsy-prep/save`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EtsyDraft>(response);
}

export async function patchDraft(
  ownerKey: OwnerKey,
  productId: string,
  payload: Partial<
    Pick<EtsyDraft, "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes">
  >,
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/draft`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<EtsyDraft>(response);
}

export async function saveGeneratedDraft(
  ownerKey: OwnerKey,
  productId: string,
  payload: {
    overwrite?: boolean;
    generated: Pick<
      EtsyDraft,
      "englishTitle" | "shortDescription" | "longDescription" | "tags" | "materials" | "attributes" | "seoNotes" | "policyNotes"
    >;
  },
) {
  const response = await fetchWithTimeout(`/owners/${ownerKey}/products/${productId}/draft/generate`, {
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
  etsyCostCalculator?: EtsyCostCalculatorStorage | null;
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

