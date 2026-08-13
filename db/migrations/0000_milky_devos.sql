CREATE TYPE "public"."actor_type" AS ENUM('user', 'api_key', 'system', 'integration', 'platform_admin');--> statement-breakpoint
CREATE TYPE "public"."api_key_status" AS ENUM('active', 'revoked', 'expired');--> statement-breakpoint
CREATE TYPE "public"."audience_source" AS ENUM('segment', 'contact_list', 'csv_upload', 'crm_query', 'test_audience');--> statement-breakpoint
CREATE TYPE "public"."audit_result" AS ENUM('success', 'failure', 'denied');--> statement-breakpoint
CREATE TYPE "public"."campaign_status" AS ENUM('draft', 'scheduled', 'sending', 'paused', 'completed', 'cancelled', 'failed');--> statement-breakpoint
CREATE TYPE "public"."carrier_review_state" AS ENUM('not_started', 'pending', 'approved');--> statement-breakpoint
CREATE TYPE "public"."channel" AS ENUM('rcs', 'sms', 'mms');--> statement-breakpoint
CREATE TYPE "public"."channel_preference" AS ENUM('rcs_with_sms_fallback', 'rcs_only', 'sms_only');--> statement-breakpoint
CREATE TYPE "public"."checklist_item_status" AS ENUM('not_started', 'in_progress', 'complete', 'pending', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."connection_state" AS ENUM('connected', 'warning', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."consent_source" AS ENUM('import', 'api', 'integration', 'keyword_reply', 'preference_center', 'agent', 'web_form');--> statement-breakpoint
CREATE TYPE "public"."consent_state" AS ENUM('opted_in', 'opted_out', 'unknown', 'pending');--> statement-breakpoint
CREATE TYPE "public"."contact_record_type" AS ENUM('vehicle', 'order', 'invoice', 'work_order', 'booking', 'payment', 'subscription', 'account');--> statement-breakpoint
CREATE TYPE "public"."conversation_event_kind" AS ENUM('assigned', 'takeover', 'returned_to_automation', 'status_changed', 'note_added', 'escalated', 'opted_out', 'payment_completed', 'booking_created');--> statement-breakpoint
CREATE TYPE "public"."conversation_status" AS ENUM('automated', 'waiting_customer', 'needs_agent', 'agent_active', 'resolved');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('queued', 'sent', 'delivered', 'read', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."edge_kind" AS ENUM('default', 'branch', 'error', 'timeout');--> statement-breakpoint
CREATE TYPE "public"."environment" AS ENUM('test', 'live');--> statement-breakpoint
CREATE TYPE "public"."event_status" AS ENUM('succeeded', 'failed', 'retrying', 'pending');--> statement-breakpoint
CREATE TYPE "public"."failure_reason" AS ENUM('unsupported_capability', 'invalid_number', 'provider_rejected', 'webhook_timeout', 'integration_error', 'consent_missing', 'message_validation', 'action_expired');--> statement-breakpoint
CREATE TYPE "public"."flow_node_kind" AS ENUM('system', 'business', 'customer', 'typing', 'receipt', 'chips', 'sms', 'rich_card', 'carousel', 'payment', 'booking_confirmed', 'brand_sheet', 'quote', 'tracker');--> statement-breakpoint
CREATE TYPE "public"."flow_stage" AS ENUM('trigger', 'context', 'decision', 'action', 'confirmation', 'recovery');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."integration_category" AS ENUM('crm', 'payments', 'scheduling', 'support', 'commerce', 'developer');--> statement-breakpoint
CREATE TYPE "public"."journey_node_kind" AS ENUM('start', 'message', 'logic', 'integration', 'human', 'end');--> statement-breakpoint
CREATE TYPE "public"."journey_node_type" AS ENUM('api_event', 'webhook', 'schedule', 'contact_event', 'crm_field_changed', 'payment_due', 'order_status', 'send_message', 'present_replies', 'send_fallback', 'request_free_text', 'wait', 'condition', 'split', 'capability_check', 'time_window', 'http_request', 'create_booking', 'generate_payment_link', 'update_crm', 'create_ticket', 'publish_event', 'assign_agent', 'pause_automation', 'notify_team', 'approval', 'goal', 'end');--> statement-breakpoint
CREATE TYPE "public"."journey_run_status" AS ENUM('active', 'waiting', 'completed', 'failed', 'exited', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."journey_status" AS ENUM('draft', 'published', 'paused', 'archived');--> statement-breakpoint
CREATE TYPE "public"."launch_state" AS ENUM('test', 'ready', 'live');--> statement-breakpoint
CREATE TYPE "public"."lead_status" AS ENUM('new', 'contacted', 'qualified', 'closed', 'spam');--> statement-breakpoint
CREATE TYPE "public"."mapping_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('active', 'invited', 'suspended', 'removed');--> statement-breakpoint
CREATE TYPE "public"."message_action_kind" AS ENUM('open_url', 'dial', 'create_calendar_event', 'view_location', 'share_location', 'postback', 'suggested_reply');--> statement-breakpoint
CREATE TYPE "public"."message_actor" AS ENUM('customer', 'automation', 'agent', 'system');--> statement-breakpoint
CREATE TYPE "public"."message_direction" AS ENUM('inbound', 'outbound');--> statement-breakpoint
CREATE TYPE "public"."message_status" AS ENUM('draft', 'testing', 'approved', 'live', 'archived');--> statement-breakpoint
CREATE TYPE "public"."outcome_kind" AS ENUM('booking', 'payment', 'purchase', 'approval', 'resolution', 'qualified_lead', 'custom');--> statement-breakpoint
CREATE TYPE "public"."recipient_status" AS ENUM('pending', 'sent', 'delivered', 'read', 'acted', 'failed', 'suppressed');--> statement-breakpoint
CREATE TYPE "public"."run_step_status" AS ENUM('pending', 'running', 'succeeded', 'failed', 'skipped');--> statement-breakpoint
CREATE TYPE "public"."segment_kind" AS ENUM('dynamic', 'static', 'system');--> statement-breakpoint
CREATE TYPE "public"."timezone_mode" AS ENUM('workspace', 'contact');--> statement-breakpoint
CREATE TYPE "public"."use_case_category" AS ENUM('transactional', 'support', 'marketing', 'authentication', 'booking', 'payments', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."variable_source" AS ENUM('contact_field', 'contact_attribute', 'record_field', 'journey_output', 'manual');--> statement-breakpoint
CREATE TYPE "public"."variable_type" AS ENUM('text', 'number', 'currency', 'datetime', 'url');--> statement-breakpoint
CREATE TYPE "public"."verification_state" AS ENUM('not_started', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."webhook_delivery_status" AS ENUM('pending', 'succeeded', 'failed', 'retrying', 'dead');--> statement-breakpoint
CREATE TYPE "public"."webhook_status" AS ENUM('active', 'disabled', 'failing');--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"country" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "workspace_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"email" text NOT NULL,
	"role_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_at" timestamp with time zone,
	"invited_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_members" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role_id" text NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"default_environment" "environment" DEFAULT 'test' NOT NULL,
	"last_active_at" timestamp with time zone,
	"invited_by" text,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"default_country" text DEFAULT 'US' NOT NULL,
	"default_language" text DEFAULT 'en' NOT NULL,
	"data_retention_days" integer DEFAULT 365 NOT NULL,
	"data_region" text DEFAULT 'us' NOT NULL,
	"default_reply_domain" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"suspended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "workspaces_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"key" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"group" text NOT NULL,
	"show_in_matrix" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" text NOT NULL,
	"permission_key" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_key_pk" PRIMARY KEY("role_id","permission_key")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"session_token" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	"active_workspace_id" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL,
	"email_verified" timestamp with time zone,
	"image" text,
	"password_hash" text,
	"job_title" text,
	"country" text,
	"default_workspace_id" text,
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"last_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tokens" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "verification_tokens_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"contact_id" text NOT NULL,
	"state" "consent_state" NOT NULL,
	"source" "consent_source" NOT NULL,
	"keyword" text,
	"channel" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" text,
	"evidence" jsonb
);
--> statement-breakpoint
CREATE TABLE "consent_settings" (
	"workspace_id" text PRIMARY KEY NOT NULL,
	"opt_out_keywords" text[] DEFAULT ARRAY['STOP','UNSUBSCRIBE','CANCEL','END','QUIT'] NOT NULL,
	"opt_in_keywords" text[] DEFAULT ARRAY['START','YES','UNSTOP'] NOT NULL,
	"help_keywords" text[] DEFAULT ARRAY['HELP','INFO'] NOT NULL,
	"suppression_policy" text DEFAULT 'workspace' NOT NULL,
	"quiet_hours_start" time,
	"quiet_hours_end" time,
	"quiet_hours_timezone" text,
	"marketing_requires_explicit" boolean DEFAULT true NOT NULL,
	"preference_center_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_imports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"filename" text NOT NULL,
	"row_count" integer DEFAULT 0 NOT NULL,
	"imported_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"status" "import_status" DEFAULT 'pending' NOT NULL,
	"uploaded_by" text,
	"error_report" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_records" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"contact_id" text NOT NULL,
	"record_type" "contact_record_type" NOT NULL,
	"external_id" text,
	"source_connection_id" text,
	"title" text NOT NULL,
	"summary" text,
	"status" text,
	"amount" numeric(14, 2),
	"currency" text,
	"occurred_at" timestamp with time zone,
	"url" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"external_id" text,
	"source_system" text,
	"source_connection_id" text,
	"first_name" text,
	"last_name" text,
	"display_name" text GENERATED ALWAYS AS (trim(both ' ' from coalesce(first_name, '') || ' ' || coalesce(last_name, ''))) STORED,
	"phone_e_164" text NOT NULL,
	"country" text,
	"language" text DEFAULT 'en' NOT NULL,
	"timezone" text,
	"rcs_capable" boolean DEFAULT false NOT NULL,
	"rcs_capability_checked_at" timestamp with time zone,
	"rcs_features" text[],
	"consent_state" "consent_state" DEFAULT 'unknown' NOT NULL,
	"last_interaction_at" timestamp with time zone,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "segment_members" (
	"segment_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	"added_by" text
);
--> statement-breakpoint
CREATE TABLE "segments" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"kind" "segment_kind" DEFAULT 'dynamic' NOT NULL,
	"description" text,
	"definition" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_size" integer,
	"computed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppressions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"phone_e_164" text NOT NULL,
	"reason" text NOT NULL,
	"source" "consent_source",
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_agent_countries" (
	"brand_agent_id" text NOT NULL,
	"country" text NOT NULL,
	"carrier_review_state" "carrier_review_state" DEFAULT 'not_started' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_agent_use_cases" (
	"brand_agent_id" text NOT NULL,
	"use_case" "use_case_category" NOT NULL,
	"sample_message_id" text,
	"approved" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_agents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"legal_name" text NOT NULL,
	"display_name" text NOT NULL,
	"logo_url" text,
	"banner_url" text,
	"brand_color" text,
	"website_url" text,
	"privacy_url" text,
	"terms_url" text,
	"support_phone" text,
	"support_email" text,
	"description" text,
	"verification_state" "verification_state" DEFAULT 'not_started' NOT NULL,
	"carrier_review_state" "carrier_review_state" DEFAULT 'not_started' NOT NULL,
	"launch_state" "launch_state" DEFAULT 'test' NOT NULL,
	"fallback_active" boolean DEFAULT true NOT NULL,
	"fallback_sender_id" text,
	"production_traffic_enabled" boolean DEFAULT false NOT NULL,
	"submitted_at" timestamp with time zone,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "brand_checklist_items" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_agent_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"status" "checklist_item_status" DEFAULT 'not_started' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"completed_by" text,
	"blocked_reason" text
);
--> statement-breakpoint
CREATE TABLE "brand_test_devices" (
	"id" text PRIMARY KEY NOT NULL,
	"brand_agent_id" text NOT NULL,
	"phone_e_164" text NOT NULL,
	"label" text,
	"capability" text,
	"added_by_user_id" text,
	"last_tested_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "message_actions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_version_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" "message_action_kind" NOT NULL,
	"label" text NOT NULL,
	"postback_key" text,
	"url" text,
	"conversion_goal_id" text
);
--> statement-breakpoint
CREATE TABLE "message_variables" (
	"id" text PRIMARY KEY NOT NULL,
	"message_version_id" text NOT NULL,
	"key" text NOT NULL,
	"type" "variable_type" DEFAULT 'text' NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"default_value" text,
	"sample_value" text,
	"source_path" text
);
--> statement-breakpoint
CREATE TABLE "message_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"version" integer NOT NULL,
	"content" jsonb NOT NULL,
	"content_schema_version" integer DEFAULT 1 NOT NULL,
	"sms_fallback" text,
	"channels" "channel"[] NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "message_status" DEFAULT 'draft' NOT NULL,
	"current_version_id" text,
	"category" text,
	"created_from_template_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "saved_replies" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"body" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"use_case" text,
	"category" text,
	"channels" "channel"[] NOT NULL,
	"content" jsonb NOT NULL,
	"sms_fallback" text,
	"preview_image_url" text,
	"is_platform" boolean DEFAULT false NOT NULL,
	"status" "message_status" DEFAULT 'approved' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "variable_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"type" "variable_type" DEFAULT 'text' NOT NULL,
	"source" "variable_source" NOT NULL,
	"source_path" text,
	"sample_value" text
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"kind" "outcome_kind" NOT NULL,
	"value_source" text,
	"default_value" numeric(14, 2)
);
--> statement-breakpoint
CREATE TABLE "journey_edges" (
	"id" text PRIMARY KEY NOT NULL,
	"journey_version_id" text NOT NULL,
	"from_node_id" text NOT NULL,
	"to_node_id" text NOT NULL,
	"label" text,
	"kind" "edge_kind" DEFAULT 'default' NOT NULL,
	"condition" jsonb,
	"ordinal" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "journey_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"journey_version_id" text NOT NULL,
	"key" text NOT NULL,
	"kind" "journey_node_kind" NOT NULL,
	"type" "journey_node_type" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"position_x" integer DEFAULT 0 NOT NULL,
	"position_y" integer DEFAULT 0 NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"timeout_seconds" integer,
	"retry_policy" jsonb,
	"message_id" text,
	"connection_id" text,
	"goal_id" text
);
--> statement-breakpoint
CREATE TABLE "journey_publications" (
	"journey_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"version_id" text NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_by" text,
	CONSTRAINT "journey_publications_journey_id_environment_pk" PRIMARY KEY("journey_id","environment")
);
--> statement-breakpoint
CREATE TABLE "journey_run_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"node_id" text,
	"sequence" integer NOT NULL,
	"status" "run_step_status" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"input" jsonb,
	"output" jsonb,
	"error" jsonb
);
--> statement-breakpoint
CREATE TABLE "journey_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"journey_id" text NOT NULL,
	"journey_version_id" text NOT NULL,
	"contact_id" text,
	"conversation_id" text,
	"status" "journey_run_status" DEFAULT 'active' NOT NULL,
	"current_node_id" text,
	"context" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resume_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text
);
--> statement-breakpoint
CREATE TABLE "journey_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"journey_id" text NOT NULL,
	"version" integer NOT NULL,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "journeys" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"status" "journey_status" DEFAULT 'draft' NOT NULL,
	"trigger_summary" text,
	"current_version_id" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outcomes" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"goal_id" text,
	"kind" "outcome_kind" NOT NULL,
	"contact_id" text,
	"conversation_id" text,
	"journey_run_id" text,
	"journey_id" text,
	"campaign_id" text,
	"message_id" text,
	"value" numeric(14, 2),
	"currency" text DEFAULT 'USD',
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attributes" jsonb
);
--> statement-breakpoint
CREATE TABLE "conversation_events" (
	"id" text PRIMARY KEY NOT NULL,
	"conversation_id" text NOT NULL,
	"kind" "conversation_event_kind" NOT NULL,
	"actor_user_id" text,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"conversation_id" text NOT NULL,
	"sequence" bigint NOT NULL,
	"direction" "message_direction" NOT NULL,
	"actor" "message_actor" NOT NULL,
	"actor_user_id" text,
	"content_type" text DEFAULT 'text' NOT NULL,
	"body" text,
	"content" jsonb,
	"message_version_id" text,
	"journey_node_id" text,
	"channel" "channel" DEFAULT 'rcs' NOT NULL,
	"provider_key" text,
	"provider_message_id" text,
	"is_internal_note" boolean DEFAULT false NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" "failure_reason"
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"contact_id" text NOT NULL,
	"brand_agent_id" text,
	"channel" "channel" DEFAULT 'rcs' NOT NULL,
	"status" "conversation_status" DEFAULT 'automated' NOT NULL,
	"intent" text,
	"journey_id" text,
	"journey_run_id" text,
	"assignee_user_id" text,
	"automation_paused" boolean DEFAULT false NOT NULL,
	"last_message_at" timestamp with time zone,
	"last_message_preview" text,
	"unread_count" integer DEFAULT 0 NOT NULL,
	"spam_flagged" boolean DEFAULT false NOT NULL,
	"tags" text[],
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"resolved_by" text
);
--> statement-breakpoint
CREATE TABLE "message_delivery_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"conversation_message_id" text,
	"campaign_recipient_id" text,
	"channel" "channel" NOT NULL,
	"status" "delivery_status" NOT NULL,
	"failure_reason" "failure_reason",
	"provider_status_raw" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_audiences" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"campaign_id" text NOT NULL,
	"source" "audience_source" NOT NULL,
	"segment_id" text,
	"contact_import_id" text,
	"query" jsonb,
	"snapshot_size" integer DEFAULT 0 NOT NULL,
	"valid_phone_count" integer DEFAULT 0 NOT NULL,
	"consent_qualified_count" integer DEFAULT 0 NOT NULL,
	"rcs_estimated_count" integer DEFAULT 0 NOT NULL,
	"sms_estimated_count" integer DEFAULT 0 NOT NULL,
	"suppressed_count" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "campaign_recipients" (
	"id" text PRIMARY KEY NOT NULL,
	"campaign_id" text NOT NULL,
	"contact_id" text NOT NULL,
	"status" "recipient_status" DEFAULT 'pending' NOT NULL,
	"channel_used" "channel",
	"conversation_id" text,
	"sent_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"acted_at" timestamp with time zone,
	"failure_reason" "failure_reason"
);
--> statement-breakpoint
CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"name" text NOT NULL,
	"status" "campaign_status" DEFAULT 'draft' NOT NULL,
	"message_id" text,
	"message_version_id" text,
	"brand_agent_id" text,
	"channel_preference" "channel_preference" DEFAULT 'rcs_with_sms_fallback' NOT NULL,
	"scheduled_at" timestamp with time zone,
	"timezone_mode" timezone_mode DEFAULT 'workspace' NOT NULL,
	"respect_quiet_hours" boolean DEFAULT true NOT NULL,
	"rate_limit_per_minute" integer,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_connections" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"provider_key" text NOT NULL,
	"state" "connection_state" DEFAULT 'connected' NOT NULL,
	"account_label" text,
	"external_account_id" text,
	"credentials_encrypted" "bytea",
	"scopes" text[],
	"connected_by" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_event_at" timestamp with time zone,
	"last_success_at" timestamp with time zone,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"avg_latency_ms" integer,
	"health_message" text,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "integration_event_subscriptions" (
	"connection_id" text NOT NULL,
	"event_key" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"connection_id" text NOT NULL,
	"event_key" text NOT NULL,
	"external_id" text,
	"status" "event_status" NOT NULL,
	"duration_ms" integer,
	"attempt" integer DEFAULT 1 NOT NULL,
	"payload" jsonb,
	"error" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_field_mappings" (
	"id" text PRIMARY KEY NOT NULL,
	"connection_id" text NOT NULL,
	"direction" "mapping_direction" NOT NULL,
	"source_field" text NOT NULL,
	"target_field" text NOT NULL,
	"transform" jsonb
);
--> statement-breakpoint
CREATE TABLE "integration_providers" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" "integration_category" NOT NULL,
	"description" text,
	"logo_url" text,
	"short_label" text,
	"auth_type" text DEFAULT 'oauth2' NOT NULL,
	"available_events" text[],
	"docs_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_available" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"last_four" text NOT NULL,
	"scopes" text[],
	"status" "api_key_status" DEFAULT 'active' NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"revoked_by" text
);
--> statement-breakpoint
CREATE TABLE "api_request_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"correlation_id" text NOT NULL,
	"method" text NOT NULL,
	"path" text NOT NULL,
	"route_pattern" text,
	"status_code" integer NOT NULL,
	"duration_ms" integer NOT NULL,
	"api_key_id" text,
	"ip" "inet",
	"user_agent" text,
	"request_body" jsonb,
	"response_body" jsonb,
	"provider_request" jsonb,
	"provider_response" jsonb,
	"retry_of_id" text,
	"contact_id" text,
	"conversation_id" text,
	"redacted" boolean DEFAULT false NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"key" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"payload" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"provider_key" text NOT NULL,
	"brand_agent_id" text,
	"credentials_encrypted" "bytea",
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"endpoint_id" text NOT NULL,
	"event_id" text,
	"event_key" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" "webhook_delivery_status" DEFAULT 'pending' NOT NULL,
	"request_body" jsonb,
	"request_headers" jsonb,
	"response_status" integer,
	"response_body" text,
	"duration_ms" integer,
	"error" text,
	"scheduled_for" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoint_events" (
	"endpoint_id" text NOT NULL,
	"event_pattern" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"url" text NOT NULL,
	"description" text,
	"status" "webhook_status" DEFAULT 'active' NOT NULL,
	"signing_secret_encrypted" "bytea",
	"signing_secret_rotated_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"consecutive_failures" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attention_dismissals" (
	"workspace_id" text NOT NULL,
	"user_id" text NOT NULL,
	"item_key" text NOT NULL,
	"dismissed_until" timestamp with time zone,
	CONSTRAINT "attention_dismissals_workspace_id_user_id_item_key_pk" PRIMARY KEY("workspace_id","user_id","item_key")
);
--> statement-breakpoint
CREATE TABLE "metric_action_daily" (
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"day" date NOT NULL,
	"action_label" text NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "metric_action_daily_workspace_id_environment_day_action_label_pk" PRIMARY KEY("workspace_id","environment","day","action_label")
);
--> statement-breakpoint
CREATE TABLE "metric_failure_daily" (
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"day" date NOT NULL,
	"reason" "failure_reason" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "metric_failure_daily_workspace_id_environment_day_reason_pk" PRIMARY KEY("workspace_id","environment","day","reason")
);
--> statement-breakpoint
CREATE TABLE "metric_journey_daily" (
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"day" date NOT NULL,
	"journey_id" text NOT NULL,
	"entered" integer DEFAULT 0 NOT NULL,
	"completed" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"waiting" integer DEFAULT 0 NOT NULL,
	"median_duration_seconds" integer,
	"fallback_share" numeric(6, 4),
	"opt_outs" integer DEFAULT 0 NOT NULL,
	"value" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "metric_journey_daily_workspace_id_environment_day_journey_id_pk" PRIMARY KEY("workspace_id","environment","day","journey_id")
);
--> statement-breakpoint
CREATE TABLE "metric_messaging_daily" (
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"day" date NOT NULL,
	"brand_agent_id" text DEFAULT '' NOT NULL,
	"journey_id" text DEFAULT '' NOT NULL,
	"campaign_id" text DEFAULT '' NOT NULL,
	"channel" "channel" NOT NULL,
	"sent" integer DEFAULT 0 NOT NULL,
	"delivered" integer DEFAULT 0 NOT NULL,
	"read" integer DEFAULT 0 NOT NULL,
	"actions" integer DEFAULT 0 NOT NULL,
	"replies" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"opted_out" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "metric_messaging_daily_workspace_id_environment_day_brand_agent_id_journey_id_campaign_id_channel_pk" PRIMARY KEY("workspace_id","environment","day","brand_agent_id","journey_id","campaign_id","channel")
);
--> statement-breakpoint
CREATE TABLE "metric_outcome_daily" (
	"workspace_id" text NOT NULL,
	"environment" "environment" NOT NULL,
	"day" date NOT NULL,
	"journey_id" text DEFAULT '' NOT NULL,
	"kind" "outcome_kind" NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"value" numeric(14, 2) DEFAULT '0' NOT NULL,
	CONSTRAINT "metric_outcome_daily_workspace_id_environment_day_journey_id_kind_pk" PRIMARY KEY("workspace_id","environment","day","journey_id","kind")
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text,
	"environment" "environment",
	"actor_type" "actor_type" DEFAULT 'user' NOT NULL,
	"actor_user_id" text,
	"actor_api_key_id" text,
	"actor_label" text,
	"action" text NOT NULL,
	"resource_type" text,
	"resource_id" text,
	"resource_label" text,
	"result" "audit_result" DEFAULT 'success' NOT NULL,
	"ip" "inet",
	"location_label" text,
	"user_agent" text,
	"before" jsonb,
	"after" jsonb,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_access_grants" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"granted_to_user_id" text NOT NULL,
	"reason" text NOT NULL,
	"granted_by" text,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "demo_flow_nodes" (
	"id" text PRIMARY KEY NOT NULL,
	"step_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"kind" "flow_node_kind" NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_flow_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"flow_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"stage" "flow_stage" NOT NULL,
	"label" text NOT NULL,
	"system_note" text NOT NULL,
	"customer_choice" text
);
--> statement-breakpoint
CREATE TABLE "demo_flows" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"use_case" text NOT NULL,
	"summary" text NOT NULL,
	"brand_label" text NOT NULL,
	"outcome" text NOT NULL,
	"sms_fallback" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_flows_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" text PRIMARY KEY NOT NULL,
	"first_name" text,
	"last_name" text,
	"email" text NOT NULL,
	"company" text,
	"country" text,
	"role" text,
	"message" text,
	"source_page" text,
	"utm" jsonb,
	"status" "lead_status" DEFAULT 'new' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"monthly_price" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"is_custom_pricing" boolean DEFAULT false NOT NULL,
	"included_messages" integer,
	"features" text[] NOT NULL,
	"cta_label" text NOT NULL,
	"cta_href" text NOT NULL,
	"highlighted" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	CONSTRAINT "marketing_plans_key_unique" UNIQUE("key")
);
--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_invitations" ADD CONSTRAINT "workspace_invitations_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_permissions_key_fk" FOREIGN KEY ("permission_key") REFERENCES "public"."permissions"("key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_settings" ADD CONSTRAINT "consent_settings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_imports" ADD CONSTRAINT "contact_imports_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_records" ADD CONSTRAINT "contact_records_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contact_records" ADD CONSTRAINT "contact_records_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_members" ADD CONSTRAINT "segment_members_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_members" ADD CONSTRAINT "segment_members_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segment_members" ADD CONSTRAINT "segment_members_added_by_users_id_fk" FOREIGN KEY ("added_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "segments" ADD CONSTRAINT "segments_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppressions" ADD CONSTRAINT "suppressions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_agent_countries" ADD CONSTRAINT "brand_agent_countries_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_agent_use_cases" ADD CONSTRAINT "brand_agent_use_cases_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_agents" ADD CONSTRAINT "brand_agents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_checklist_items" ADD CONSTRAINT "brand_checklist_items_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_checklist_items" ADD CONSTRAINT "brand_checklist_items_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_test_devices" ADD CONSTRAINT "brand_test_devices_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "brand_test_devices" ADD CONSTRAINT "brand_test_devices_added_by_user_id_users_id_fk" FOREIGN KEY ("added_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_actions" ADD CONSTRAINT "message_actions_message_version_id_message_versions_id_fk" FOREIGN KEY ("message_version_id") REFERENCES "public"."message_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_variables" ADD CONSTRAINT "message_variables_message_version_id_message_versions_id_fk" FOREIGN KEY ("message_version_id") REFERENCES "public"."message_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_versions" ADD CONSTRAINT "message_versions_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_versions" ADD CONSTRAINT "message_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_replies" ADD CONSTRAINT "saved_replies_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "variable_definitions" ADD CONSTRAINT "variable_definitions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_edges" ADD CONSTRAINT "journey_edges_journey_version_id_journey_versions_id_fk" FOREIGN KEY ("journey_version_id") REFERENCES "public"."journey_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_edges" ADD CONSTRAINT "journey_edges_from_node_id_journey_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_edges" ADD CONSTRAINT "journey_edges_to_node_id_journey_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_nodes" ADD CONSTRAINT "journey_nodes_journey_version_id_journey_versions_id_fk" FOREIGN KEY ("journey_version_id") REFERENCES "public"."journey_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_nodes" ADD CONSTRAINT "journey_nodes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_publications" ADD CONSTRAINT "journey_publications_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_publications" ADD CONSTRAINT "journey_publications_version_id_journey_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."journey_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_publications" ADD CONSTRAINT "journey_publications_published_by_users_id_fk" FOREIGN KEY ("published_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_run_steps" ADD CONSTRAINT "journey_run_steps_run_id_journey_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."journey_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_run_steps" ADD CONSTRAINT "journey_run_steps_node_id_journey_nodes_id_fk" FOREIGN KEY ("node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_journey_version_id_journey_versions_id_fk" FOREIGN KEY ("journey_version_id") REFERENCES "public"."journey_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_runs" ADD CONSTRAINT "journey_runs_current_node_id_journey_nodes_id_fk" FOREIGN KEY ("current_node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_versions" ADD CONSTRAINT "journey_versions_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journey_versions" ADD CONSTRAINT "journey_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "journeys" ADD CONSTRAINT "journeys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_journey_run_id_journey_runs_id_fk" FOREIGN KEY ("journey_run_id") REFERENCES "public"."journey_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcomes" ADD CONSTRAINT "outcomes_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_events" ADD CONSTRAINT "conversation_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_message_version_id_message_versions_id_fk" FOREIGN KEY ("message_version_id") REFERENCES "public"."message_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_journey_node_id_journey_nodes_id_fk" FOREIGN KEY ("journey_node_id") REFERENCES "public"."journey_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_journey_id_journeys_id_fk" FOREIGN KEY ("journey_id") REFERENCES "public"."journeys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_journey_run_id_journey_runs_id_fk" FOREIGN KEY ("journey_run_id") REFERENCES "public"."journey_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery_events" ADD CONSTRAINT "message_delivery_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_delivery_events" ADD CONSTRAINT "message_delivery_events_conversation_message_id_conversation_messages_id_fk" FOREIGN KEY ("conversation_message_id") REFERENCES "public"."conversation_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_segment_id_segments_id_fk" FOREIGN KEY ("segment_id") REFERENCES "public"."segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_audiences" ADD CONSTRAINT "campaign_audiences_contact_import_id_contact_imports_id_fk" FOREIGN KEY ("contact_import_id") REFERENCES "public"."contact_imports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaign_recipients" ADD CONSTRAINT "campaign_recipients_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_message_version_id_message_versions_id_fk" FOREIGN KEY ("message_version_id") REFERENCES "public"."message_versions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_brand_agent_id_brand_agents_id_fk" FOREIGN KEY ("brand_agent_id") REFERENCES "public"."brand_agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "campaigns" ADD CONSTRAINT "campaigns_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_provider_key_integration_providers_key_fk" FOREIGN KEY ("provider_key") REFERENCES "public"."integration_providers"("key") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_connected_by_users_id_fk" FOREIGN KEY ("connected_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_event_subscriptions" ADD CONSTRAINT "integration_event_subscriptions_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_events" ADD CONSTRAINT "integration_events_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_field_mappings" ADD CONSTRAINT "integration_field_mappings_connection_id_integration_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."integration_connections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_revoked_by_users_id_fk" FOREIGN KEY ("revoked_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_request_logs" ADD CONSTRAINT "api_request_logs_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_events" ADD CONSTRAINT "platform_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_accounts" ADD CONSTRAINT "provider_accounts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_event_id_platform_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."platform_events"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoint_events" ADD CONSTRAINT "webhook_endpoint_events_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_dismissals" ADD CONSTRAINT "attention_dismissals_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attention_dismissals" ADD CONSTRAINT "attention_dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_action_daily" ADD CONSTRAINT "metric_action_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_failure_daily" ADD CONSTRAINT "metric_failure_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_journey_daily" ADD CONSTRAINT "metric_journey_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_messaging_daily" ADD CONSTRAINT "metric_messaging_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_outcome_daily" ADD CONSTRAINT "metric_outcome_daily_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_api_key_id_api_keys_id_fk" FOREIGN KEY ("actor_api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_granted_to_user_id_users_id_fk" FOREIGN KEY ("granted_to_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_access_grants" ADD CONSTRAINT "support_access_grants_granted_by_users_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_flow_nodes" ADD CONSTRAINT "demo_flow_nodes_step_id_demo_flow_steps_id_fk" FOREIGN KEY ("step_id") REFERENCES "public"."demo_flow_steps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_flow_steps" ADD CONSTRAINT "demo_flow_steps_flow_id_demo_flows_id_fk" FOREIGN KEY ("flow_id") REFERENCES "public"."demo_flows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_invitations_workspace_idx" ON "workspace_invitations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_invitations_token_idx" ON "workspace_invitations" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_members_unique" ON "workspace_members" USING btree ("workspace_id","user_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_idx" ON "workspace_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "workspaces_org_idx" ON "workspaces" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "roles_workspace_idx" ON "roles" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "consent_events_contact_idx" ON "consent_events" USING btree ("contact_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contact_records_contact_idx" ON "contact_records" USING btree ("contact_id","record_type");--> statement-breakpoint
CREATE INDEX "contact_records_external_idx" ON "contact_records" USING btree ("workspace_id","environment","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_phone_unique" ON "contacts" USING btree ("workspace_id","environment","phone_e_164");--> statement-breakpoint
CREATE INDEX "contacts_recent_idx" ON "contacts" USING btree ("workspace_id","environment","last_interaction_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contacts_consent_idx" ON "contacts" USING btree ("workspace_id","environment","consent_state");--> statement-breakpoint
CREATE UNIQUE INDEX "segment_members_unique" ON "segment_members" USING btree ("segment_id","contact_id");--> statement-breakpoint
CREATE INDEX "segment_members_contact_idx" ON "segment_members" USING btree ("contact_id");--> statement-breakpoint
CREATE UNIQUE INDEX "segments_slug_unique" ON "segments" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "suppressions_unique" ON "suppressions" USING btree ("workspace_id","environment","phone_e_164");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_agent_countries_unique" ON "brand_agent_countries" USING btree ("brand_agent_id","country");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_agent_use_cases_unique" ON "brand_agent_use_cases" USING btree ("brand_agent_id","use_case");--> statement-breakpoint
CREATE INDEX "brand_agents_workspace_idx" ON "brand_agents" USING btree ("workspace_id","environment");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_checklist_unique" ON "brand_checklist_items" USING btree ("brand_agent_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "brand_test_devices_unique" ON "brand_test_devices" USING btree ("brand_agent_id","phone_e_164");--> statement-breakpoint
CREATE INDEX "message_actions_version_idx" ON "message_actions" USING btree ("message_version_id");--> statement-breakpoint
CREATE UNIQUE INDEX "message_variables_unique" ON "message_variables" USING btree ("message_version_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "message_versions_unique" ON "message_versions" USING btree ("message_id","version");--> statement-breakpoint
CREATE INDEX "messages_workspace_idx" ON "messages" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "saved_replies_workspace_idx" ON "saved_replies" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE UNIQUE INDEX "variable_definitions_unique" ON "variable_definitions" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_unique" ON "goals" USING btree ("workspace_id","key");--> statement-breakpoint
CREATE INDEX "journey_edges_from_idx" ON "journey_edges" USING btree ("journey_version_id","from_node_id");--> statement-breakpoint
CREATE UNIQUE INDEX "journey_nodes_key_unique" ON "journey_nodes" USING btree ("journey_version_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "journey_run_steps_unique" ON "journey_run_steps" USING btree ("run_id","sequence");--> statement-breakpoint
CREATE INDEX "journey_runs_journey_idx" ON "journey_runs" USING btree ("workspace_id","environment","journey_id","status");--> statement-breakpoint
CREATE INDEX "journey_runs_contact_idx" ON "journey_runs" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "journey_runs_resume_idx" ON "journey_runs" USING btree ("status","resume_at");--> statement-breakpoint
CREATE UNIQUE INDEX "journey_versions_unique" ON "journey_versions" USING btree ("journey_id","version");--> statement-breakpoint
CREATE INDEX "journeys_workspace_idx" ON "journeys" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "outcomes_reporting_idx" ON "outcomes" USING btree ("workspace_id","environment","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "outcomes_journey_idx" ON "outcomes" USING btree ("workspace_id","environment","journey_id");--> statement-breakpoint
CREATE INDEX "outcomes_kind_idx" ON "outcomes" USING btree ("workspace_id","environment","kind");--> statement-breakpoint
CREATE INDEX "conversation_events_conversation_idx" ON "conversation_events" USING btree ("conversation_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversation_messages_thread_idx" ON "conversation_messages" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE INDEX "conversations_queue_idx" ON "conversations" USING btree ("workspace_id","environment","status","last_message_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "conversations_assignee_idx" ON "conversations" USING btree ("assignee_user_id","status");--> statement-breakpoint
CREATE INDEX "conversations_contact_idx" ON "conversations" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "delivery_events_reporting_idx" ON "message_delivery_events" USING btree ("workspace_id","environment","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "delivery_events_status_idx" ON "message_delivery_events" USING btree ("workspace_id","environment","status");--> statement-breakpoint
CREATE INDEX "delivery_events_message_idx" ON "message_delivery_events" USING btree ("conversation_message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "campaign_recipients_unique" ON "campaign_recipients" USING btree ("campaign_id","contact_id");--> statement-breakpoint
CREATE INDEX "campaign_recipients_status_idx" ON "campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "campaigns_workspace_idx" ON "campaigns" USING btree ("workspace_id","environment","status");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_connections_unique" ON "integration_connections" USING btree ("workspace_id","environment","provider_key");--> statement-breakpoint
CREATE UNIQUE INDEX "integration_event_subs_unique" ON "integration_event_subscriptions" USING btree ("connection_id","event_key");--> statement-breakpoint
CREATE INDEX "integration_events_conn_idx" ON "integration_events" USING btree ("connection_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "integration_field_mappings_conn_idx" ON "integration_field_mappings" USING btree ("connection_id");--> statement-breakpoint
CREATE UNIQUE INDEX "api_keys_prefix_unique" ON "api_keys" USING btree ("prefix");--> statement-breakpoint
CREATE INDEX "api_keys_workspace_idx" ON "api_keys" USING btree ("workspace_id","environment","status");--> statement-breakpoint
CREATE INDEX "api_request_logs_recent_idx" ON "api_request_logs" USING btree ("workspace_id","environment","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "api_request_logs_correlation_idx" ON "api_request_logs" USING btree ("correlation_id");--> statement-breakpoint
CREATE INDEX "platform_events_dispatch_idx" ON "platform_events" USING btree ("workspace_id","environment","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "provider_accounts_workspace_idx" ON "provider_accounts" USING btree ("workspace_id","environment");--> statement-breakpoint
CREATE INDEX "webhook_deliveries_endpoint_idx" ON "webhook_deliveries" USING btree ("endpoint_id","scheduled_for" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "webhook_deliveries_status_idx" ON "webhook_deliveries" USING btree ("workspace_id","environment","status");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_endpoint_events_unique" ON "webhook_endpoint_events" USING btree ("endpoint_id","event_pattern");--> statement-breakpoint
CREATE INDEX "webhook_endpoints_workspace_idx" ON "webhook_endpoints" USING btree ("workspace_id","environment");--> statement-breakpoint
CREATE INDEX "metric_messaging_day_idx" ON "metric_messaging_daily" USING btree ("workspace_id","environment","day" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "metric_outcome_day_idx" ON "metric_outcome_daily" USING btree ("workspace_id","environment","day" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_recent_idx" ON "audit_log" USING btree ("workspace_id","occurred_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("workspace_id","actor_user_id");--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("workspace_id","resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_log_action_idx" ON "audit_log" USING btree ("workspace_id","action");--> statement-breakpoint
CREATE INDEX "support_access_grants_active_idx" ON "support_access_grants" USING btree ("granted_to_user_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_flow_nodes_unique" ON "demo_flow_nodes" USING btree ("step_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "demo_flow_steps_unique" ON "demo_flow_steps" USING btree ("flow_id","ordinal");--> statement-breakpoint
CREATE INDEX "leads_created_idx" ON "leads" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "leads_status_idx" ON "leads" USING btree ("status");