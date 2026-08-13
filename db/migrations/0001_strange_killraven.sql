-- Rename phone_e_164 -> phone_e164 on the three tables that carry a phone number.
-- drizzle's snake_case casing splits `phoneE164` into `phone_e_164`; the schema now
-- names these columns explicitly.
--
-- Hand-corrected: drizzle-kit generated ADD COLUMN + DROP COLUMN for "suppressions"
-- rather than a rename, which would have discarded the existing rows and failed
-- outright, since ADD COLUMN ... NOT NULL has no default on a populated table.
ALTER TABLE "contacts" RENAME COLUMN "phone_e_164" TO "phone_e164";--> statement-breakpoint
ALTER TABLE "brand_test_devices" RENAME COLUMN "phone_e_164" TO "phone_e164";--> statement-breakpoint
ALTER TABLE "suppressions" RENAME COLUMN "phone_e_164" TO "phone_e164";--> statement-breakpoint
DROP INDEX "contacts_phone_unique";--> statement-breakpoint
DROP INDEX "suppressions_unique";--> statement-breakpoint
DROP INDEX "brand_test_devices_unique";--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_phone_unique" ON "contacts" USING btree ("workspace_id","environment","phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_unique" ON "suppressions" USING btree ("workspace_id","environment","phone_e164");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_test_devices_unique" ON "brand_test_devices" USING btree ("brand_agent_id","phone_e164");
