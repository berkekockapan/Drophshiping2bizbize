CREATE TABLE "manual_refresh_runs" (
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
);
CREATE INDEX "manual_refresh_runs_status_created_at_idx" ON "manual_refresh_runs" ("status", "created_at");

CREATE TABLE "manual_refresh_run_items" (
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
CREATE INDEX "manual_refresh_run_items_run_status_idx" ON "manual_refresh_run_items" ("run_id", "status");
CREATE INDEX "manual_refresh_run_items_product_id_idx" ON "manual_refresh_run_items" ("product_id");
