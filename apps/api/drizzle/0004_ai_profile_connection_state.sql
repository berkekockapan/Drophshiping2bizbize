ALTER TABLE "ai_profiles" ADD COLUMN "status" text NOT NULL DEFAULT 'connected';
ALTER TABLE "ai_profiles" ADD COLUMN "last_validated_at" integer;
ALTER TABLE "ai_profiles" ADD COLUMN "last_error" text;
ALTER TABLE "ai_profiles" ADD COLUMN "updated_at" integer NOT NULL DEFAULT (unixepoch() * 1000);
