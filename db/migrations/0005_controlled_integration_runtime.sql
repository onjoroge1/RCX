CREATE TYPE "integration_dispatch_status" AS ENUM ('pending', 'processing', 'retry_wait', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint

ALTER TABLE "integration_connections" ADD COLUMN "base_url" text;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN "allowed_methods" text[];--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN "allowed_path_prefixes" text[];--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN "operation_bindings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN "request_timeout_ms" integer DEFAULT 10000 NOT NULL;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD COLUMN "max_response_bytes" integer DEFAULT 1048576 NOT NULL;--> statement-breakpoint

CREATE TABLE "integration_dispatches" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "connection_id" text NOT NULL,
  "journey_effect_id" text NOT NULL,
  "run_id" text NOT NULL,
  "step_id" text NOT NULL,
  "node_id" text NOT NULL,
  "idempotency_key" text NOT NULL,
  "operation" text NOT NULL,
  "base_url_snapshot" text NOT NULL,
  "method" text NOT NULL,
  "path" text NOT NULL,
  "request" jsonb,
  "external_id_path" text,
  "status" "integration_dispatch_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "max_attempts" integer DEFAULT 4 NOT NULL,
  "next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_at" timestamp with time zone,
  "lock_token" text,
  "response_status" integer,
  "response" jsonb,
  "external_id" text,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "completed_at" timestamp with time zone,
  CONSTRAINT "integration_dispatches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade,
  CONSTRAINT "integration_dispatches_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE restrict
);--> statement-breakpoint
CREATE UNIQUE INDEX "integration_dispatches_effect_unique" ON "integration_dispatches" USING btree ("journey_effect_id");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_dispatches_idempotency_unique" ON "integration_dispatches" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "integration_dispatches_worker_idx" ON "integration_dispatches" USING btree ("status", "next_attempt_at", "locked_at");--> statement-breakpoint
CREATE INDEX "integration_dispatches_connection_idx" ON "integration_dispatches" USING btree ("connection_id", "created_at" DESC);
