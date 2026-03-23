CREATE TABLE "product_refresh_audits" (
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
CREATE INDEX "product_refresh_audits_product_checked_at_idx" ON "product_refresh_audits" ("product_id", "checked_at" DESC);

CREATE TABLE "product_content_history" (
  "id" text PRIMARY KEY NOT NULL,
  "product_id" text NOT NULL,
  "refresh_audit_id" text NOT NULL,
  "field_key" text NOT NULL,
  "previous_value_raw" text,
  "new_value_raw" text,
  "changed_at" integer NOT NULL,
  "created_at" integer NOT NULL
);
CREATE INDEX "product_content_history_product_changed_at_idx" ON "product_content_history" ("product_id", "changed_at" DESC);

ALTER TABLE "price_history" ADD COLUMN "refresh_audit_id" text;
ALTER TABLE "stock_history" ADD COLUMN "refresh_audit_id" text;
