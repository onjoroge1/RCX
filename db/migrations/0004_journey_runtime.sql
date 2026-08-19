CREATE TYPE "journey_wait_status" AS ENUM ('pending', 'resolved', 'timed_out', 'cancelled');--> statement-breakpoint
CREATE TYPE "journey_wait_kind" AS ENUM ('timer', 'event');--> statement-breakpoint
CREATE TYPE "journey_effect_status" AS ENUM ('pending', 'completed', 'failed');--> statement-breakpoint

ALTER TABLE "journey_nodes" ADD COLUMN "message_version_id" text;--> statement-breakpoint
ALTER TABLE "journey_nodes" ADD CONSTRAINT "journey_nodes_message_version_id_message_versions_id_fk" FOREIGN KEY ("message_version_id") REFERENCES "public"."message_versions"("id") ON DELETE restrict;--> statement-breakpoint

ALTER TABLE "journey_runs" ADD COLUMN "trigger_key" text;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD COLUMN "locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD COLUMN "lock_token" text;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "journey_runs_lock_idx" ON "journey_runs" USING btree ("status", "locked_at");--> statement-breakpoint
CREATE UNIQUE INDEX "journey_runs_trigger_unique" ON "journey_runs" USING btree ("workspace_id", "environment", "journey_id", "trigger_key");--> statement-breakpoint

ALTER TABLE "journey_run_steps" ADD COLUMN "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "journey_run_steps" ADD COLUMN "last_attempt_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "journey_run_steps_active_idx" ON "journey_run_steps" USING btree ("run_id", "status", "sequence");--> statement-breakpoint

CREATE TABLE "journey_run_waits" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "run_id" text NOT NULL,
  "step_id" text NOT NULL,
  "node_id" text,
  "kind" "journey_wait_kind" NOT NULL,
  "event_key" text,
  "match" jsonb,
  "listen_after" timestamp with time zone DEFAULT now() NOT NULL,
  "timeout_at" timestamp with time zone,
  "status" "journey_wait_status" DEFAULT 'pending' NOT NULL,
  "resolution_event_id" text,
  "resolution" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "resolved_at" timestamp with time zone,
  CONSTRAINT "journey_run_waits_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade,
  CONSTRAINT "journey_run_waits_run_id_journey_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."journey_runs"("id") ON DELETE cascade,
  CONSTRAINT "journey_run_waits_step_id_journey_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."journey_run_steps"("id") ON DELETE cascade,
  CONSTRAINT "journey_run_waits_node_id_journey_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX "journey_run_waits_step_unique" ON "journey_run_waits" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "journey_run_waits_event_idx" ON "journey_run_waits" USING btree ("status", "event_key", "listen_after");--> statement-breakpoint
CREATE INDEX "journey_run_waits_timeout_idx" ON "journey_run_waits" USING btree ("status", "timeout_at");--> statement-breakpoint

CREATE TABLE "journey_effects" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "run_id" text NOT NULL,
  "step_id" text NOT NULL,
  "effect_key" text NOT NULL,
  "kind" text NOT NULL,
  "status" "journey_effect_status" DEFAULT 'pending' NOT NULL,
  "idempotency_key" text NOT NULL,
  "external_id" text,
  "request" jsonb,
  "result" jsonb,
  "error" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "journey_effects_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade,
  CONSTRAINT "journey_effects_run_id_journey_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."journey_runs"("id") ON DELETE cascade,
  CONSTRAINT "journey_effects_step_id_journey_run_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."journey_run_steps"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX "journey_effects_step_key_unique" ON "journey_effects" USING btree ("step_id", "effect_key");--> statement-breakpoint
CREATE UNIQUE INDEX "journey_effects_idempotency_unique" ON "journey_effects" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "journey_effects_run_idx" ON "journey_effects" USING btree ("run_id", "status");--> statement-breakpoint

CREATE INDEX "platform_events_key_idx" ON "platform_events" USING btree ("workspace_id", "environment", "key", "occurred_at");
