import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull().default("berke"),
    trendyolUrl: text("trendyol_url").notNull(),
    sourceProductId: text("source_product_id"),
    title: text("title"),
    brand: text("brand"),
    category: text("category"),
    userCategoryId: text("user_category_id"),
    descriptionRaw: text("description_raw"),
    attributesRaw: text("attributes_raw"),
    imagesRaw: text("images_raw"),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull(),
    parseStatus: text("parse_status").notNull(),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deletedReason: text("deleted_reason"),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerTrendyolActiveUnique: uniqueIndex("products_owner_trendyol_active_unique")
      .on(table.ownerKey, table.trendyolUrl)
      .where(sql`${table.deletedAt} is null`),
    ownerDeletedCreatedIdx: index("products_owner_deleted_created_idx").on(table.ownerKey, table.deletedAt, table.createdAt),
    ownerCategoryCreatedIdx: index("products_owner_category_created_idx").on(
      table.ownerKey,
      table.userCategoryId,
      table.createdAt,
    ),
    sourceProductIdIdx: index("products_source_product_id_idx").on(table.sourceProductId),
  }),
);

export const productCategories = sqliteTable(
  "product_categories",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerNameUnique: uniqueIndex("product_categories_owner_name_unique").on(table.ownerKey, table.name),
    ownerNameIdx: index("product_categories_owner_name_idx").on(table.ownerKey, table.name),
  }),
);

export const sourceProducts = sqliteTable(
  "source_products",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    sourceTitle: text("source_title").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceUrlNormalized: text("source_url_normalized").notNull(),
    sourcePlatform: text("source_platform").notNull(),
    note: text("note"),
    sourceCategoryId: text("source_category_id"),
    userCategoryId: text("user_category_id"),
    sortOrder: integer("sort_order"),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    deletedReason: text("deleted_reason"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerSourceUrlUnique: uniqueIndex("source_products_owner_source_url_unique").on(
      table.ownerKey,
      table.sourceUrlNormalized,
    ),
    ownerUpdatedAtIdx: index("source_products_owner_updated_at_idx").on(table.ownerKey, table.updatedAt),
    ownerActiveCategorySortIdx: index("source_products_owner_active_category_sort_idx").on(
      table.ownerKey,
      table.deletedAt,
      table.sourceCategoryId,
      table.sortOrder,
      table.createdAt,
    ),
    ownerDeletedIdx: index("source_products_owner_deleted_idx").on(table.ownerKey, table.deletedAt, table.createdAt),
  }),
);

export const sourceProductCategories = sqliteTable(
  "source_product_categories",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerNameUnique: uniqueIndex("source_product_categories_owner_name_unique").on(table.ownerKey, table.name),
    ownerNameIdx: index("source_product_categories_owner_name_idx").on(table.ownerKey, table.name),
  }),
);

export const sourceProductEtsyLinks = sqliteTable(
  "source_product_etsy_links",
  {
    id: text("id").primaryKey(),
    sourceProductId: text("source_product_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    etsyUrl: text("etsy_url").notNull(),
    etsyUrlNormalized: text("etsy_url_normalized").notNull(),
    etsyListingId: text("etsy_listing_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerEtsyUrlUnique: uniqueIndex("source_product_etsy_links_owner_etsy_url_unique").on(
      table.ownerKey,
      table.etsyUrlNormalized,
    ),
    sourceProductCreatedIdx: index("source_product_etsy_links_source_product_id_idx").on(
      table.sourceProductId,
      table.createdAt,
    ),
    ownerListingIdx: index("source_product_etsy_links_owner_listing_id_idx").on(table.ownerKey, table.etsyListingId),
  }),
);

export const productEtsyLinks = sqliteTable(
  "product_etsy_links",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    etsyUrl: text("etsy_url").notNull(),
    etsyUrlNormalized: text("etsy_url_normalized").notNull(),
    etsyListingId: text("etsy_listing_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerEtsyUrlUnique: uniqueIndex("product_etsy_links_owner_etsy_url_unique").on(
      table.ownerKey,
      table.etsyUrlNormalized,
    ),
    productCreatedIdx: index("product_etsy_links_product_id_idx").on(table.productId, table.createdAt),
    ownerListingIdx: index("product_etsy_links_owner_listing_id_idx").on(table.ownerKey, table.etsyListingId),
  }),
);

export const sourceProductEtsyShops = sqliteTable(
  "source_product_etsy_shops",
  {
    sourceProductId: text("source_product_id").notNull(),
    shopId: text("shop_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    sourceProductShopPk: uniqueIndex("source_product_etsy_shops_source_product_shop_pk").on(
      table.sourceProductId,
      table.shopId,
    ),
    ownerSourceProductIdx: index("source_product_etsy_shops_owner_source_product_idx").on(
      table.ownerKey,
      table.sourceProductId,
    ),
    shopCreatedIdx: index("source_product_etsy_shops_shop_created_idx").on(table.shopId, table.createdAt),
  }),
);

export const etsyShops = sqliteTable(
  "etsy_shops",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    name: text("name").notNull(),
    etsyShopUrl: text("etsy_shop_url").notNull(),
    description: text("description"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerNameUnique: uniqueIndex("etsy_shops_owner_name_unique").on(table.ownerKey, table.name),
    ownerCreatedIdx: index("etsy_shops_owner_created_idx").on(table.ownerKey, table.createdAt),
  }),
);

export const productEtsyShops = sqliteTable(
  "product_etsy_shops",
  {
    productId: text("product_id").notNull(),
    shopId: text("shop_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    productShopPk: uniqueIndex("product_etsy_shops_product_shop_pk").on(table.productId, table.shopId),
    shopCreatedIdx: index("product_etsy_shops_shop_created_idx").on(table.shopId, table.createdAt),
    ownerProductIdx: index("product_etsy_shops_owner_product_idx").on(table.ownerKey, table.productId),
  }),
);

export const productVariants = sqliteTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    variantKey: text("variant_key").notNull(),
    option1: text("option_1"),
    option2: text("option_2"),
    option3: text("option_3"),
    currentStockState: text("current_stock_state").notNull(),
    currentPrice: integer("current_price"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    rawPayload: text("raw_payload"),
  },
  (table) => ({
    productVariantUnique: uniqueIndex("product_variants_product_variant_key_unique").on(table.productId, table.variantKey),
    productIdx: index("product_variants_product_id_idx").on(table.productId),
  }),
);

export const productLinkedVariants = sqliteTable(
  "product_linked_variants",
  {
    id: text("id").primaryKey(),
    parentProductId: text("parent_product_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    trendyolUrl: text("trendyol_url").notNull(),
    trendyolUrlNormalized: text("trendyol_url_normalized").notNull(),
    sourceProductId: text("source_product_id"),
    title: text("title").notNull(),
    brand: text("brand"),
    descriptionRaw: text("description_raw"),
    attributesRaw: text("attributes_raw"),
    imagesRaw: text("images_raw"),
    currentPrice: integer("current_price"),
    currentStockState: text("current_stock_state").notNull(),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerUrlUnique: uniqueIndex("product_linked_variants_owner_url_unique").on(
      table.ownerKey,
      table.trendyolUrlNormalized,
    ),
    parentCreatedIdx: index("product_linked_variants_parent_created_idx").on(table.parentProductId, table.createdAt),
    ownerParentIdx: index("product_linked_variants_owner_parent_idx").on(table.ownerKey, table.parentProductId),
  }),
);

export const productCurrentState = sqliteTable("product_current_state", {
  productId: text("product_id").primaryKey(),
  currentPrice: integer("current_price"),
  minPrice: integer("min_price"),
  maxPrice: integer("max_price"),
  inStockVariantCount: integer("in_stock_variant_count").notNull().default(0),
  totalVariantCount: integer("total_variant_count").notNull().default(0),
  lastChangeAt: integer("last_change_at", { mode: "timestamp_ms" }),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
});

export const priceHistory = sqliteTable(
  "price_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id"),
    previousPrice: integer("previous_price"),
    newPrice: integer("new_price"),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
    changeReason: text("change_reason"),
    refreshAuditId: text("refresh_audit_id"),
  },
  (table) => ({
    productIdx: index("price_history_product_id_idx").on(table.productId),
    variantIdx: index("price_history_variant_id_idx").on(table.variantId),
  }),
);

export const stockHistory = sqliteTable(
  "stock_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    variantId: text("variant_id").notNull(),
    previousStockState: text("previous_stock_state"),
    newStockState: text("new_stock_state").notNull(),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
    refreshAuditId: text("refresh_audit_id"),
  },
  (table) => ({
    productIdx: index("stock_history_product_id_idx").on(table.productId),
    variantIdx: index("stock_history_variant_id_idx").on(table.variantId),
  }),
);

export const productRefreshAudits = sqliteTable(
  "product_refresh_audits",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    source: text("source").notNull(),
    manualRefreshRunId: text("manual_refresh_run_id"),
    status: text("status").notNull(),
    changeCount: integer("change_count").notNull().default(0),
    changedFieldsJson: text("changed_fields_json"),
    errorMessage: text("error_message"),
    checkedAt: integer("checked_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    productCheckedAtIdx: index("product_refresh_audits_product_checked_at_idx").on(table.productId, table.checkedAt),
  }),
);

export const productContentHistory = sqliteTable(
  "product_content_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    refreshAuditId: text("refresh_audit_id").notNull(),
    fieldKey: text("field_key").notNull(),
    previousValueRaw: text("previous_value_raw"),
    newValueRaw: text("new_value_raw"),
    changedAt: integer("changed_at", { mode: "timestamp_ms" }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    productChangedAtIdx: index("product_content_history_product_changed_at_idx").on(table.productId, table.changedAt),
  }),
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    productId: text("product_id"),
    ownerKey: text("owner_key").notNull().default("berke"),
    type: text("type").notNull(),
    severity: text("severity").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    readAt: integer("read_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    productIdx: index("notifications_product_id_idx").on(table.productId),
    readIdx: index("notifications_read_at_idx").on(table.readAt),
    ownerCreatedIdx: index("notifications_owner_created_idx").on(table.ownerKey, table.createdAt),
  }),
);

export const etsyDrafts = sqliteTable(
  "etsy_drafts",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    englishTitle: text("english_title"),
    shortDescription: text("short_description"),
    longDescription: text("long_description"),
    tagsJson: text("tags_json"),
    materialsJson: text("materials_json"),
    attributesJson: text("attributes_json"),
    seoNotes: text("seo_notes"),
    policyNotes: text("policy_notes"),
    generatedVersion: integer("generated_version").notNull().default(0),
    editedVersion: integer("edited_version").notNull().default(0),
    lastGeneratedAt: integer("last_generated_at", { mode: "timestamp_ms" }),
    manualEditsPresent: integer("manual_edits_present", { mode: "boolean" }).notNull().default(false),
  },
  (table) => ({
    productUnique: uniqueIndex("etsy_drafts_product_id_unique").on(table.productId),
  }),
);

export const aiProfiles = sqliteTable(
  "ai_profiles",
  {
    id: text("id").primaryKey(),
    label: text("label").notNull(),
    emailMasked: text("email_masked"),
    provider: text("provider").notNull(),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("connected"),
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    lastValidatedAt: integer("last_validated_at", { mode: "timestamp_ms" }),
    lastError: text("last_error"),
    connectorStatusSnapshot: text("connector_status_snapshot"),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    activeIdx: index("ai_profiles_active_idx").on(table.isActive),
  }),
);

export const aiOpenAiCredentials = sqliteTable("ai_openai_credentials", {
  profileId: text("profile_id").primaryKey(),
  accessTokenEncrypted: text("access_token_encrypted").notNull(),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  idTokenEncrypted: text("id_token_encrypted"),
  apiKeyEncrypted: text("api_key_encrypted"),
  tokenType: text("token_type"),
  scope: text("scope"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const aiOpenAiConnectionAttempts = sqliteTable(
  "ai_openai_connection_attempts",
  {
    id: text("id").primaryKey(),
    provider: text("provider").notNull().default("openai"),
    profileId: text("profile_id"),
    status: text("status").notNull(),
    error: text("error"),
    oauthState: text("oauth_state"),
    codeVerifier: text("code_verifier"),
    nonce: text("nonce"),
    redirectUri: text("redirect_uri").notNull(),
    authorizationUrl: text("authorization_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    oauthStateUnique: uniqueIndex("ai_openai_connection_attempts_oauth_state_unique").on(table.oauthState),
  }),
);

export const aiOpenAiWorkspaces = sqliteTable(
  "ai_openai_workspaces",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name").notNull(),
    isSelected: integer("is_selected", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    profileExternalUnique: uniqueIndex("ai_openai_workspaces_profile_external_unique").on(table.profileId, table.externalId),
    profileSelectedIdx: index("ai_openai_workspaces_profile_selected_idx").on(table.profileId, table.isSelected),
  }),
);

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(),
  refreshIntervalHours: integer("refresh_interval_hours").notNull().default(5),
  promptPreferencesJson: text("prompt_preferences_json"),
  connectorHealthcheckEnabled: integer("connector_healthcheck_enabled", { mode: "boolean" }).notNull().default(true),
  aiTargetBaseUrl: text("ai_target_base_url"),
  aiTargetManagementKey: text("ai_target_management_key"),
  aiTargetLabel: text("ai_target_label"),
  aiTargetApiKey: text("ai_target_api_key"),
  etsyCostCalculatorJson: text("etsy_cost_calculator_json"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const manualRefreshRuns = sqliteTable(
  "manual_refresh_runs",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull().default("berke"),
    scope: text("scope").notNull(),
    sourceRunId: text("source_run_id"),
    status: text("status").notNull(),
    totalCount: integer("total_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    runningCount: integer("running_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failedCount: integer("failed_count").notNull().default(0),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    statusCreatedAtIdx: index("manual_refresh_runs_status_created_at_idx").on(table.status, table.createdAt),
    ownerStatusCreatedIdx: index("manual_refresh_runs_owner_status_created_idx").on(
      table.ownerKey,
      table.status,
      table.createdAt,
    ),
  }),
);

export const manualRefreshRunItems = sqliteTable(
  "manual_refresh_run_items",
  {
    id: text("id").primaryKey(),
    runId: text("run_id").notNull(),
    productId: text("product_id").notNull(),
    status: text("status").notNull(),
    attemptCount: integer("attempt_count").notNull().default(0),
    errorMessage: text("error_message"),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    runStatusIdx: index("manual_refresh_run_items_run_status_idx").on(table.runId, table.status),
    productIdx: index("manual_refresh_run_items_product_id_idx").on(table.productId),
  }),
);

export const tariffClassificationCatalog = sqliteTable(
  "tariff_classification_catalog",
  {
    id: text("id").primaryKey(),
    canonicalHs6: text("canonical_hs6").notNull(),
    profileName: text("profile_name"),
    title: text("title").notNull(),
    description: text("description"),
    keywordsJson: text("keywords_json"),
    sourceType: text("source_type").notNull(),
    sourceVersion: text("source_version").notNull(),
    confidenceMode: text("confidence_mode").notNull().default("low_confidence"),
    masterEntryId: text("master_entry_id"),
    defaultShipentegraUsd: real("default_shipentegra_usd"),
    effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }),
    effectiveTo: integer("effective_to", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    canonicalHs6Idx: index("tariff_classification_catalog_hs6_idx").on(table.canonicalHs6),
  }),
);

export const tariffMasterUsEntries = sqliteTable("tariff_master_us_entries", {
  id: text("id").primaryKey(),
  htsCode8: text("hts_code_8").notNull(),
  htsCode10: text("hts_code_10").notNull(),
  description: text("description").notNull(),
  generalDutyRate: real("general_duty_rate").notNull(),
  additionalDutyRate: real("additional_duty_rate").notNull().default(0),
  combinedDutyRate: real("combined_duty_rate").notNull(),
  dutySummary: text("duty_summary").notNull(),
  sourceRevision: text("source_revision").notNull(),
  sourceUrl: text("source_url"),
  effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }),
  effectiveTo: integer("effective_to", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const tariffClassificationUsProfiles = sqliteTable(
  "tariff_classification_us_profiles",
  {
    id: text("id").primaryKey(),
    catalogId: text("catalog_id").notNull(),
    htsusCode: text("htsus_code").notNull(),
    generalDutyRate: real("general_duty_rate").notNull(),
    additionalDutyRate: real("additional_duty_rate").notNull().default(0),
    combinedDutyRate: real("combined_duty_rate").notNull(),
    summaryText: text("summary_text").notNull(),
    revisionLabel: text("revision_label").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    catalogUnique: uniqueIndex("tariff_classification_us_profiles_catalog_id_unique").on(table.catalogId),
  }),
);

export const productVariantCostOverrides = sqliteTable("product_variant_cost_overrides", {
  variantId: text("variant_id").primaryKey(),
  productId: text("product_id").notNull(),
  ownerKey: text("owner_key").notNull(),
  manualProductCostAmount: real("manual_product_cost_amount"),
  manualProductCostCurrency: text("manual_product_cost_currency"),
  manualShippingCostAmount: real("manual_shipping_cost_amount"),
  manualShippingCostCurrency: text("manual_shipping_cost_currency"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const productTariffAnalysisRuns = sqliteTable(
  "product_tariff_analysis_runs",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    status: text("status").notNull(),
    usedAi: integer("used_ai", { mode: "boolean" }).notNull().default(false),
    inputSnapshotJson: text("input_snapshot_json").notNull(),
    resultSnapshotJson: text("result_snapshot_json"),
    engineVersion: text("engine_version").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  },
  (table) => ({
    productCreatedIdx: index("product_tariff_analysis_runs_product_created_idx").on(table.productId, table.createdAt),
    ownerProductCreatedIdx: index("product_tariff_analysis_runs_owner_product_created_idx").on(
      table.ownerKey,
      table.productId,
      table.createdAt,
    ),
  }),
);

export const productTariffSelection = sqliteTable(
  "product_tariff_selection",
  {
    productId: text("product_id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    catalogId: text("catalog_id").notNull(),
    usProfileId: text("us_profile_id"),
    selectionSource: text("selection_source").notNull(),
    selectedBy: text("selected_by").notNull(),
    selectedAt: integer("selected_at", { mode: "timestamp_ms" }).notNull(),
    analysisRunId: text("analysis_run_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerCatalogIdx: index("product_tariff_selection_owner_catalog_idx").on(table.ownerKey, table.catalogId),
  }),
);

export const tariffKnowledgeCandidates = sqliteTable(
  "tariff_knowledge_candidates",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    catalogId: text("catalog_id").notNull(),
    usProfileId: text("us_profile_id"),
    candidateSource: text("candidate_source").notNull(),
    payloadJson: text("payload_json").notNull(),
    status: text("status").notNull(),
    submittedBy: text("submitted_by").notNull(),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => ({
    ownerStatusSubmittedIdx: index("tariff_knowledge_candidates_owner_status_submitted_idx").on(
      table.ownerKey,
      table.status,
      table.submittedAt,
    ),
  }),
);

export const promptLibraryPages = sqliteTable(
  "prompt_library_pages",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerActiveSortIdx: index("prompt_library_pages_owner_active_sort_idx").on(
      table.ownerKey,
      table.deletedAt,
      table.sortOrder,
      table.updatedAt,
    ),
  }),
);

export const promptLibraryCards = sqliteTable(
  "prompt_library_cards",
  {
    id: text("id").primaryKey(),
    pageId: text("page_id").notNull(),
    ownerKey: text("owner_key").notNull(),
    cardType: text("card_type").notNull().default("normal"),
    title: text("title").notNull(),
    promptMarkdown: text("prompt_markdown").notNull().default(""),
    imageR2Key: text("image_r2_key"),
    imageContentType: text("image_content_type"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    ownerPageActiveSortIdx: index("prompt_library_cards_owner_page_active_sort_idx").on(
      table.ownerKey,
      table.pageId,
      table.deletedAt,
      table.cardType,
      table.sortOrder,
      table.updatedAt,
    ),
    oneActiveMasterPerPage: uniqueIndex("prompt_library_cards_one_active_master_per_page")
      .on(table.pageId)
      .where(sql`${table.cardType} = 'master' and ${table.deletedAt} is null`),
  }),
);

export const promptLibraryRevisions = sqliteTable(
  "prompt_library_revisions",
  {
    id: text("id").primaryKey(),
    ownerKey: text("owner_key").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    entityCreatedIdx: index("prompt_library_revisions_entity_created_idx").on(
      table.entityType,
      table.entityId,
      table.createdAt,
    ),
  }),
);

export const schema = {
  products,
  productVariants,
  productCurrentState,
  priceHistory,
  stockHistory,
  productRefreshAudits,
  productContentHistory,
  notifications,
  etsyDrafts,
  aiProfiles,
  aiOpenAiCredentials,
  aiOpenAiConnectionAttempts,
  aiOpenAiWorkspaces,
  appSettings,
  manualRefreshRuns,
  manualRefreshRunItems,
  productCategories,
  tariffClassificationCatalog,
  tariffMasterUsEntries,
  tariffClassificationUsProfiles,
  productVariantCostOverrides,
  productTariffAnalysisRuns,
  productTariffSelection,
  tariffKnowledgeCandidates,
  sourceProducts,
  sourceProductCategories,
  sourceProductEtsyLinks,
  sourceProductEtsyShops,
  etsyShops,
  productEtsyShops,
  promptLibraryPages,
  promptLibraryCards,
  promptLibraryRevisions,
};

export const schemaTableNames = [
  "products",
  "source_products",
  "source_product_categories",
  "source_product_etsy_links",
  "source_product_etsy_shops",
  "etsy_shops",
  "product_etsy_shops",
  "product_variants",
  "product_current_state",
  "price_history",
  "stock_history",
  "product_refresh_audits",
  "product_content_history",
  "notifications",
  "etsy_drafts",
  "ai_profiles",
  "ai_openai_credentials",
  "ai_openai_connection_attempts",
  "ai_openai_workspaces",
  "app_settings",
  "manual_refresh_runs",
  "manual_refresh_run_items",
  "product_categories",
  "tariff_classification_catalog",
  "tariff_master_us_entries",
  "tariff_classification_us_profiles",
  "product_variant_cost_overrides",
  "product_tariff_analysis_runs",
  "product_tariff_selection",
  "tariff_knowledge_candidates",
  "prompt_library_pages",
  "prompt_library_cards",
  "prompt_library_revisions",
] as const;
