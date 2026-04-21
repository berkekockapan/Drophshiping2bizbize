PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE d1_migrations(
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		name       TEXT UNIQUE,
		applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(1,'0000_initial.sql','2026-04-21 12:26:25');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(2,'0001_products_is_favorite.sql','2026-04-21 12:26:25');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(3,'0002_manual_refresh_runs.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(4,'0003_product_refresh_change_history.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(5,'0004_ai_profile_connection_state.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(6,'0005_ai_openai_oauth_cloud.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(7,'0006_ai_target_settings.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(8,'0007_owner_scoped_products.sql','2026-04-21 12:26:26');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(9,'0008_product_categories.sql','2026-04-21 12:26:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(10,'0009_etsy_cost_calculator_settings.sql','2026-04-21 12:26:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(11,'0010_tariff_classification.sql','2026-04-21 12:26:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(12,'0011_etsy_cost_accuracy.sql','2026-04-21 12:26:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(13,'0012_source_products.sql','2026-04-21 12:26:27');
INSERT INTO "d1_migrations" ("id","name","applied_at") VALUES(14,'0013_source_products_management.sql','2026-04-21 12:26:27');
CREATE TABLE IF NOT EXISTS "products" (
  "id" text PRIMARY KEY NOT NULL,
  "trendyol_url" text NOT NULL,
  "source_product_id" text,
  "title" text,
  "brand" text,
  "category" text,
  "description_raw" text,
  "attributes_raw" text,
  "images_raw" text,
  "status" text NOT NULL,
  "parse_status" text NOT NULL,
  "last_checked_at" integer,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
, is_favorite integer NOT NULL DEFAULT 0, owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan')), deleted_at integer, deleted_reason text, user_category_id text);
CREATE TABLE IF NOT EXISTS "product_variants" (
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
CREATE TABLE IF NOT EXISTS "product_current_state" (
  "product_id" text PRIMARY KEY NOT NULL,
  "current_price" integer,
  "min_price" integer,
  "max_price" integer,
  "in_stock_variant_count" integer NOT NULL DEFAULT 0,
  "total_variant_count" integer NOT NULL DEFAULT 0,
  "last_change_at" integer,
  "last_checked_at" integer
);
CREATE TABLE IF NOT EXISTS "price_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "variant_id" text,
  "previous_price" integer,
  "new_price" integer,
  "changed_at" integer NOT NULL,
  "change_reason" text
, "refresh_audit_id" text);
CREATE TABLE IF NOT EXISTS "stock_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "variant_id" text NOT NULL,
  "previous_stock_state" text,
  "new_stock_state" text NOT NULL,
  "changed_at" integer NOT NULL
, "refresh_audit_id" text);
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text,
  "type" text NOT NULL,
  "severity" text NOT NULL,
  "title" text NOT NULL,
  "body" text NOT NULL,
  "read_at" integer,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
, owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan')));
CREATE TABLE IF NOT EXISTS "etsy_drafts" (
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
CREATE TABLE IF NOT EXISTS "ai_profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "label" text NOT NULL,
  "email_masked" text,
  "provider" text NOT NULL,
  "is_active" integer NOT NULL DEFAULT 0,
  "last_seen_at" integer,
  "connector_status_snapshot" text
, "status" text NOT NULL DEFAULT 'connected', "last_validated_at" integer, "last_error" text, "updated_at" integer NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS "app_settings" (
  "id" text PRIMARY KEY NOT NULL,
  "refresh_interval_hours" integer NOT NULL DEFAULT 5,
  "prompt_preferences_json" text,
  "connector_healthcheck_enabled" integer NOT NULL DEFAULT 1,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
, "ai_target_base_url" text, "ai_target_management_key" text, "ai_target_label" text, "ai_target_api_key" text, etsy_cost_calculator_json text);
CREATE TABLE IF NOT EXISTS "manual_refresh_runs" (
  "id" text PRIMARY KEY NOT NULL,
  "scope" text NOT NULL,
  "source_run_id" text,
  "status" text NOT NULL,
  "total_count" integer NOT NULL DEFAULT 0,
  "pending_count" integer NOT NULL DEFAULT 0,
  "running_count" integer NOT NULL DEFAULT 0,
  "success_count" integer NOT NULL DEFAULT 0,
  "failed_count" integer NOT NULL DEFAULT 0,
  "started_at" integer,
  "finished_at" integer,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
, owner_key text not null default 'berke' check (owner_key in ('berke', 'kaan')));
CREATE TABLE IF NOT EXISTS "manual_refresh_run_items" (
  "id" text PRIMARY KEY NOT NULL,
  "run_id" text NOT NULL,
  "product_id" text NOT NULL,
  "status" text NOT NULL,
  "attempt_count" integer NOT NULL DEFAULT 0,
  "error_message" text,
  "started_at" integer,
  "finished_at" integer,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "product_refresh_audits" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "source" text NOT NULL,
  "manual_refresh_run_id" text,
  "status" text NOT NULL,
  "change_count" integer NOT NULL DEFAULT 0,
  "changed_fields_json" text,
  "error_message" text,
  "checked_at" integer NOT NULL,
  "created_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "product_content_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "refresh_audit_id" text NOT NULL,
  "field_key" text NOT NULL,
  "previous_value_raw" text,
  "new_value_raw" text,
  "changed_at" integer NOT NULL,
  "created_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "ai_openai_credentials" (
  "profile_id" text PRIMARY KEY NOT NULL,
  "access_token_encrypted" text NOT NULL,
  "refresh_token_encrypted" text,
  "id_token_encrypted" text,
  "api_key_encrypted" text,
  "token_type" text,
  "scope" text,
  "access_token_expires_at" integer,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE IF NOT EXISTS "ai_openai_connection_attempts" (
  "id" text PRIMARY KEY NOT NULL,
  "provider" text NOT NULL DEFAULT 'openai',
  "profile_id" text,
  "status" text NOT NULL,
  "error" text,
  "oauth_state" text,
  "code_verifier" text,
  "nonce" text,
  "redirect_uri" text NOT NULL,
  "authorization_url" text,
  "created_at" integer NOT NULL,
  "updated_at" integer NOT NULL
);
CREATE TABLE IF NOT EXISTS "ai_openai_workspaces" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "external_id" text NOT NULL,
  "display_name" text NOT NULL,
  "is_selected" integer NOT NULL DEFAULT 0,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);
CREATE TABLE product_categories (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  created_at integer not null,
  updated_at integer not null
);
CREATE TABLE tariff_classification_catalog (
  id text primary key,
  canonical_hs6 text not null,
  title text not null,
  description text,
  keywords_json text,
  source_type text not null,
  source_version text not null,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
, profile_name text, confidence_mode text not null default 'low_confidence', master_entry_id text, default_shipentegra_usd real);
CREATE TABLE tariff_classification_us_profiles (
  id text primary key,
  catalog_id text not null,
  htsus_code text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  summary_text text not null,
  revision_label text not null,
  created_at integer not null,
  updated_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id)
);
CREATE TABLE product_tariff_analysis_runs (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  status text not null,
  used_ai integer not null default 0,
  input_snapshot_json text not null,
  result_snapshot_json text,
  engine_version text not null,
  created_at integer not null,
  completed_at integer
);
CREATE TABLE product_tariff_selection (
  product_id text primary key,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  selection_source text not null,
  selected_by text not null,
  selected_at integer not null,
  analysis_run_id text,
  created_at integer not null,
  updated_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id),
  foreign key (us_profile_id) references tariff_classification_us_profiles(id),
  foreign key (analysis_run_id) references product_tariff_analysis_runs(id)
);
CREATE TABLE tariff_knowledge_candidates (
  id text primary key,
  product_id text not null,
  owner_key text not null,
  catalog_id text not null,
  us_profile_id text,
  candidate_source text not null,
  payload_json text not null,
  status text not null,
  submitted_by text not null,
  submitted_at integer not null,
  foreign key (catalog_id) references tariff_classification_catalog(id),
  foreign key (us_profile_id) references tariff_classification_us_profiles(id)
);
CREATE TABLE tariff_master_us_entries (
  id text primary key,
  hts_code_8 text not null,
  hts_code_10 text not null,
  description text not null,
  general_duty_rate real not null,
  additional_duty_rate real not null default 0,
  combined_duty_rate real not null,
  duty_summary text not null,
  source_revision text not null,
  source_url text,
  effective_from integer,
  effective_to integer,
  created_at integer not null,
  updated_at integer not null
);
CREATE TABLE product_variant_cost_overrides (
  variant_id text primary key,
  product_id text not null,
  owner_key text not null,
  manual_product_cost_amount real,
  manual_product_cost_currency text,
  manual_shipping_cost_amount real,
  manual_shipping_cost_currency text,
  created_at integer not null,
  updated_at integer not null
);
CREATE TABLE source_products (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  source_title text not null,
  source_url text not null,
  source_url_normalized text not null,
  source_platform text not null check (source_platform in ('SHOPIER', 'CUSTOM_SITE', 'OTHER')),
  note text,
  created_at integer not null default (unixepoch() * 1000),
  updated_at integer not null default (unixepoch() * 1000)
, source_category_id text, sort_order integer, deleted_at integer, deleted_reason text);
CREATE TABLE source_product_etsy_links (
  id text primary key,
  source_product_id text not null,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  etsy_url text not null,
  etsy_url_normalized text not null,
  etsy_listing_id text,
  created_at integer not null default (unixepoch() * 1000)
);
CREATE TABLE source_product_categories (
  id text primary key,
  owner_key text not null check (owner_key in ('berke', 'kaan')),
  name text not null check (length(trim(name)) > 0),
  created_at integer not null,
  updated_at integer not null
);
DELETE FROM sqlite_sequence;
INSERT INTO "sqlite_sequence" ("name","seq") VALUES('d1_migrations',14);
CREATE INDEX "products_source_product_id_idx" ON "products" ("source_product_id");
CREATE UNIQUE INDEX "product_variants_product_variant_key_unique" ON "product_variants" ("product_id", "variant_key");
CREATE INDEX "product_variants_product_id_idx" ON "product_variants" ("product_id");
CREATE INDEX "price_history_product_id_idx" ON "price_history" ("product_id");
CREATE INDEX "price_history_variant_id_idx" ON "price_history" ("variant_id");
CREATE INDEX "stock_history_product_id_idx" ON "stock_history" ("product_id");
CREATE INDEX "stock_history_variant_id_idx" ON "stock_history" ("variant_id");
CREATE INDEX "notifications_product_id_idx" ON "notifications" ("product_id");
CREATE INDEX "notifications_read_at_idx" ON "notifications" ("read_at");
CREATE UNIQUE INDEX "etsy_drafts_product_id_unique" ON "etsy_drafts" ("product_id");
CREATE INDEX "ai_profiles_active_idx" ON "ai_profiles" ("is_active");
CREATE INDEX "manual_refresh_runs_status_created_at_idx" ON "manual_refresh_runs" ("status", "created_at");
CREATE INDEX "manual_refresh_run_items_run_status_idx" ON "manual_refresh_run_items" ("run_id", "status");
CREATE INDEX "manual_refresh_run_items_product_id_idx" ON "manual_refresh_run_items" ("product_id");
CREATE INDEX "product_refresh_audits_product_checked_at_idx" ON "product_refresh_audits" ("product_id", "checked_at" DESC);
CREATE INDEX "product_content_history_product_changed_at_idx" ON "product_content_history" ("product_id", "changed_at" DESC);
CREATE UNIQUE INDEX "ai_openai_connection_attempts_oauth_state_unique"
  ON "ai_openai_connection_attempts" ("oauth_state");
CREATE UNIQUE INDEX "ai_openai_workspaces_profile_external_unique"
  ON "ai_openai_workspaces" ("profile_id", "external_id");
CREATE INDEX "ai_openai_workspaces_profile_selected_idx"
  ON "ai_openai_workspaces" ("profile_id", "is_selected");
CREATE UNIQUE INDEX products_owner_trendyol_active_unique
  on products(owner_key, trendyol_url)
  where deleted_at is null;
CREATE INDEX products_owner_deleted_created_idx
  on products(owner_key, deleted_at, created_at);
CREATE INDEX notifications_owner_created_idx on notifications(owner_key, created_at);
CREATE INDEX manual_refresh_runs_owner_status_created_idx on manual_refresh_runs(owner_key, status, created_at);
CREATE INDEX products_owner_category_created_idx
  on products(owner_key, user_category_id, created_at);
CREATE UNIQUE INDEX product_categories_owner_name_unique
  on product_categories(owner_key, lower(trim(name)));
CREATE INDEX product_categories_owner_name_idx
  on product_categories(owner_key, lower(trim(name)));
CREATE INDEX tariff_classification_catalog_hs6_idx
  on tariff_classification_catalog (canonical_hs6);
CREATE UNIQUE INDEX tariff_classification_us_profiles_catalog_id_unique
  on tariff_classification_us_profiles (catalog_id);
CREATE INDEX product_tariff_analysis_runs_product_created_idx
  on product_tariff_analysis_runs (product_id, created_at desc);
CREATE INDEX product_tariff_analysis_runs_owner_product_created_idx
  on product_tariff_analysis_runs (owner_key, product_id, created_at desc);
CREATE INDEX product_tariff_selection_owner_catalog_idx
  on product_tariff_selection (owner_key, catalog_id);
CREATE INDEX tariff_knowledge_candidates_owner_status_submitted_idx
  on tariff_knowledge_candidates (owner_key, status, submitted_at desc);
CREATE UNIQUE INDEX source_products_owner_source_url_unique
  on source_products (owner_key, source_url_normalized);
CREATE INDEX source_products_owner_updated_at_idx
  on source_products (owner_key, updated_at);
CREATE UNIQUE INDEX source_product_etsy_links_owner_etsy_url_unique
  on source_product_etsy_links (owner_key, etsy_url_normalized);
CREATE INDEX source_product_etsy_links_source_product_id_idx
  on source_product_etsy_links (source_product_id, created_at desc);
CREATE INDEX source_product_etsy_links_owner_listing_id_idx
  on source_product_etsy_links (owner_key, etsy_listing_id);
CREATE UNIQUE INDEX source_product_categories_owner_name_unique
  on source_product_categories(owner_key, lower(trim(name)));
CREATE INDEX source_product_categories_owner_name_idx
  on source_product_categories(owner_key, lower(trim(name)));
CREATE INDEX source_products_owner_active_category_sort_idx
  on source_products(owner_key, deleted_at, source_category_id, sort_order, created_at);
CREATE INDEX source_products_owner_deleted_idx
  on source_products(owner_key, deleted_at, created_at);
