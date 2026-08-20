ALTER TABLE "integration_dispatches" ADD COLUMN "provider_key_snapshot" text;--> statement-breakpoint
UPDATE "integration_dispatches" AS d
SET "provider_key_snapshot" = c."provider_key"
FROM "integration_connections" AS c
WHERE c."id" = d."connection_id";--> statement-breakpoint
ALTER TABLE "integration_dispatches" ALTER COLUMN "provider_key_snapshot" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_dispatches" ADD COLUMN "body_encoding" text DEFAULT 'json' NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_dispatches" ADD CONSTRAINT "integration_dispatches_body_encoding_check" CHECK ("body_encoding" IN ('json', 'form'));
