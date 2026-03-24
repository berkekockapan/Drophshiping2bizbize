ALTER TABLE "ai_profiles" ADD COLUMN "status" text NOT NULL DEFAULT 'connected';
ALTER TABLE "ai_profiles" ADD COLUMN "last_validated_at" integer;
ALTER TABLE "ai_profiles" ADD COLUMN "last_error" text;
ALTER TABLE "ai_profiles" ADD COLUMN "updated_at" integer NOT NULL DEFAULT 0;
UPDATE "ai_profiles" SET "updated_at" = (unixepoch() * 1000) WHERE "updated_at" = 0;
