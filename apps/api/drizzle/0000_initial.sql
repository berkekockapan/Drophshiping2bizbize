PRAGMA foreign_keys = ON;

CREATE TABLE "products" (
  "id" text PRIMARY KEY NOT NULL,
  "trendyol_url" text NOT NULL,
  "source_product_id" text,
  "title" text,
  "brand" text,
  "category" text,
  "description_raw" text,
  "attributes_raw" text,
  "images_raw" text,
  "is_favorite" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL,
  "parse_status" text NOT NULL,
  "last_checked_at" integer,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE UNIQUE INDEX "products_trendyol_url_unique" ON "products" ("trendyol_url");
CREATE INDEX "products_source_product_id_idx" ON "products" ("source_product_id");

CREATE TABLE "product_variants" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "variant_key" text NOT NULL,
  "option_1" text,
  "option_2" text,
  "option_3" text,
  "current_stock_state" text NOT NULL,
  "current_price" integer,
  "last_seen_at" integer,
  "raw_payload" text
);
CREATE UNIQUE INDEX "product_variants_product_variant_key_unique" ON "product_variants" ("product_id", "variant_key");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" ("product_id");

CREATE TABLE "product_current_state" (
  "product_id" text PRIMARY KEY NOT NULL,
  "current_price" integer,
  "min_price" integer,
  "max_price" integer,
  "in_stock_variant_count" integer NOT NULL DEFAULT 0,
  "total_variant_count" integer NOT NULL DEFAULT 0,
  "last_change_at" integer,
  "last_checked_at" integer
);

CREATE TABLE "price_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "variant_id" text,
  "previous_price" integer,
  "new_price" integer,
  "changed_at" integer NOT NULL,
  "change_reason" text
);
CREATE INDEX "price_history_product_id_idx" ON "price_history" ("product_id");
CREATE INDEX "price_history_variant_id_idx" ON "price_history" ("variant_id");

CREATE TABLE "stock_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "variant_id" text NOT NULL,
  "previous_stock_state" text,
  "new_stock_state" text NOT NULL,
  "changed_at" integer NOT NULL
);
CREATE INDEX "stock_history_product_id_idx" ON "stock_history" ("product_id");
CREATE INDEX "stock_history_variant_id_idx" ON "stock_history" ("variant_id");

CREATE TABLE "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text,
  "type" text NOT NULL,
  "severity" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "read_at" integer,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE INDEX "notifications_product_id_idx" ON "notifications" ("product_id");
CREATE INDEX "notifications_read_at_idx" ON "notifications" ("read_at");

CREATE TABLE "etsy_drafts" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "english_title" text,
  "short_description" text,
  "long_description" text,
  "tags_json" text,
  "materials_json" text,
  "attributes_json" text,
  "seo_notes" text,
  "policy_notes" text,
  "generated_version" integer NOT NULL DEFAULT 0,
  "edited_version" integer NOT NULL DEFAULT 0,
  "last_generated_at" integer,
  "manual_edits_present" integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX "etsy_drafts_product_id_unique" ON "etsy_drafts" ("product_id");

CREATE TABLE "ai_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "email_masked" text,
  "provider" text NOT NULL,
  "is_active" integer NOT NULL DEFAULT 0,
  "last_seen_at" integer,
  "connector_status_snapshot" text
);
CREATE INDEX "ai_profiles_active_idx" ON "ai_profiles" ("is_active");

CREATE TABLE "app_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "refresh_interval_hours" integer NOT NULL DEFAULT 5,
  "prompt_preferences_json" text,
  "connector_healthcheck_enabled" integer NOT NULL DEFAULT 1,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);
