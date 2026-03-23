import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const products = sqliteTable(
  "products",
  {
    id: text("id").primaryKey(),
    trendyolUrl: text("trendyol_url").notNull(),
    sourceProductId: text("source_product_id"),
    title: text("title"),
    brand: text("brand"),
    category: text("category"),
    descriptionRaw: text("description_raw"),
    attributesRaw: text("attributes_raw"),
    imagesRaw: text("images_raw"),
    isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull(),
    parseStatus: text("parse_status").notNull(),
    lastCheckedAt: integer("last_checked_at", { mode: "timestamp_ms" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  },
  (table) => ({
    trendyolUrlUnique: uniqueIndex("products_trendyol_url_unique").on(table.trendyolUrl),
    sourceProductIdIdx: index("products_source_product_id_idx").on(table.sourceProductId),
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
  },
  (table) => ({
    productIdx: index("stock_history_product_id_idx").on(table.productId),
    variantIdx: index("stock_history_variant_id_idx").on(table.variantId),
  }),
);

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    productId: text("product_id"),
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
    lastSeenAt: integer("last_seen_at", { mode: "timestamp_ms" }),
    connectorStatusSnapshot: text("connector_status_snapshot"),
  },
  (table) => ({
    activeIdx: index("ai_profiles_active_idx").on(table.isActive),
  }),
);

export const appSettings = sqliteTable("app_settings", {
  id: text("id").primaryKey(),
  refreshIntervalHours: integer("refresh_interval_hours").notNull().default(5),
  promptPreferencesJson: text("prompt_preferences_json"),
  connectorHealthcheckEnabled: integer("connector_healthcheck_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull().default(sql`(unixepoch() * 1000)`),
});

export const manualRefreshRuns = sqliteTable(
  "manual_refresh_runs",
  {
    id: text("id").primaryKey(),
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

export const schema = {
  products,
  productVariants,
  productCurrentState,
  priceHistory,
  stockHistory,
  notifications,
  etsyDrafts,
  aiProfiles,
  appSettings,
  manualRefreshRuns,
  manualRefreshRunItems,
};

export const schemaTableNames = [
  "products",
  "product_variants",
  "product_current_state",
  "price_history",
  "stock_history",
  "notifications",
  "etsy_drafts",
  "ai_profiles",
  "app_settings",
  "manual_refresh_runs",
  "manual_refresh_run_items",
] as const;
