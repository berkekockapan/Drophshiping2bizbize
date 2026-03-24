CREATE TABLE "ai_openai_credentials" (
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

CREATE TABLE "ai_openai_connection_attempts" (
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

CREATE UNIQUE INDEX "ai_openai_connection_attempts_oauth_state_unique"
  ON "ai_openai_connection_attempts" ("oauth_state");

CREATE TABLE "ai_openai_workspaces" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "external_id" text NOT NULL,
  "display_name" text NOT NULL,
  "is_selected" integer NOT NULL DEFAULT 0,
  "created_at" integer NOT NULL DEFAULT (unixepoch() * 1000),
  "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000)
);

CREATE UNIQUE INDEX "ai_openai_workspaces_profile_external_unique"
  ON "ai_openai_workspaces" ("profile_id", "external_id");

CREATE INDEX "ai_openai_workspaces_profile_selected_idx"
  ON "ai_openai_workspaces" ("profile_id", "is_selected");
