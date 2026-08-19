CREATE TYPE "dispatch_status" AS ENUM ('pending', 'processing', 'accepted', 'retry_wait', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "provider_event_status" AS ENUM ('pending', 'processing', 'processed', 'failed');--> statement-breakpoint

CREATE TABLE "provider_agent_bindings" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "provider_account_id" text NOT NULL,
  "provider_key" text NOT NULL,
  "brand_agent_id" text,
  "external_agent_id" text NOT NULL,
  "region" text,
  "webhook_client_token_encrypted" bytea,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "provider_agent_bindings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade,
  CONSTRAINT "provider_agent_bindings_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX "provider_agent_bindings_account_unique" ON "provider_agent_bindings" USING btree ("provider_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "provider_agent_bindings_external_unique" ON "provider_agent_bindings" USING btree ("provider_key", "external_agent_id");--> statement-breakpoint
CREATE INDEX "provider_agent_bindings_scope_idx" ON "provider_agent_bindings" USING btree ("workspace_id", "environment", "brand_agent_id");--> statement-breakpoint

CREATE TABLE "message_dispatches" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "conversation_message_id" text NOT NULL,
  "provider_account_id" text,
  "provider_key" text NOT NULL,
  "brand_agent_id" text,
  "recipient_phone" text NOT NULL,
  "requested_channel" "channel" NOT NULL,
  "selected_channel" "channel",
  "status" "dispatch_status" DEFAULT 'pending' NOT NULL,
  "provider_request_id" text NOT NULL,
  "provider_message_id" text,
  "capability_snapshot" jsonb,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone,
  "locked_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "message_dispatches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade,
  CONSTRAINT "message_dispatches_conversation_message_id_conversation_messages_id_fk" FOREIGN KEY ("conversation_message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade,
  CONSTRAINT "message_dispatches_provider_account_id_provider_accounts_id_fk" FOREIGN KEY ("provider_account_id") REFERENCES "public"."provider_accounts"("id") ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX "message_dispatches_message_unique" ON "message_dispatches" USING btree ("conversation_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_dispatches_request_unique" ON "message_dispatches" USING btree ("provider_request_id");--> statement-breakpoint
CREATE INDEX "message_dispatches_ready_idx" ON "message_dispatches" USING btree ("status", "next_attempt_at", "created_at");--> statement-breakpoint
CREATE INDEX "message_dispatches_provider_message_idx" ON "message_dispatches" USING btree ("provider_key", "provider_message_id");--> statement-breakpoint

CREATE TABLE "recipient_capabilities" (
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "brand_agent_id" text NOT NULL,
  "provider_key" text NOT NULL,
  "phone_e164" text NOT NULL,
  "reachable" boolean NOT NULL,
  "features" text[] DEFAULT '{}'::text[] NOT NULL,
  "checked_at" timestamp with time zone NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  CONSTRAINT "recipient_capabilities_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX "recipient_capabilities_unique" ON "recipient_capabilities" USING btree ("workspace_id", "environment", "brand_agent_id", "provider_key", "phone_e164");--> statement-breakpoint
CREATE INDEX "recipient_capabilities_expiry_idx" ON "recipient_capabilities" USING btree ("expires_at");--> statement-breakpoint

CREATE TABLE "provider_webhook_events" (
  "id" text PRIMARY KEY NOT NULL,
  "workspace_id" text NOT NULL,
  "environment" "environment" NOT NULL,
  "provider_key" text NOT NULL,
  "brand_agent_id" text,
  "provider_event_id" text NOT NULL,
  "dedupe_key" text NOT NULL,
  "event_kind" text NOT NULL,
  "sender_phone" text,
  "provider_message_id" text,
  "payload" jsonb NOT NULL,
  "status" "provider_event_status" DEFAULT 'pending' NOT NULL,
  "attempts" integer DEFAULT 0 NOT NULL,
  "next_attempt_at" timestamp with time zone,
  "received_at" timestamp with time zone DEFAULT now() NOT NULL,
  "locked_at" timestamp with time zone,
  "processed_at" timestamp with time zone,
  "last_error" text,
  CONSTRAINT "provider_webhook_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX "provider_webhook_events_dedupe_unique" ON "provider_webhook_events" USING btree ("dedupe_key");--> statement-breakpoint
CREATE INDEX "provider_webhook_events_ready_idx" ON "provider_webhook_events" USING btree ("status", "next_attempt_at", "received_at");--> statement-breakpoint
CREATE INDEX "provider_webhook_events_message_idx" ON "provider_webhook_events" USING btree ("provider_key", "provider_message_id");--> statement-breakpoint

CREATE INDEX "conversation_messages_provider_idx" ON "conversation_messages" USING btree ("provider_key", "provider_message_id");
