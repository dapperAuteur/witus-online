CREATE TABLE "operator_task_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_key" text NOT NULL,
	"app" text NOT NULL,
	"title" text NOT NULL,
	"action" text NOT NULL,
	"actor" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operator_task" (
	"key" text PRIMARY KEY NOT NULL,
	"app" text NOT NULL,
	"app_name" text NOT NULL,
	"repo_path" text NOT NULL,
	"number" text,
	"number_int" integer,
	"file" text,
	"title" text NOT NULL,
	"scope" text DEFAULT '' NOT NULL,
	"blocks" text DEFAULT '' NOT NULL,
	"status" text DEFAULT '' NOT NULL,
	"body" text,
	"body_withheld" text,
	"unindexed" boolean DEFAULT false NOT NULL,
	"source_updated_at" timestamp with time zone,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"done_at" timestamp with time zone,
	"done_by" text
);
--> statement-breakpoint
CREATE INDEX "operator_task_event_created_idx" ON "operator_task_event" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "operator_task_app_idx" ON "operator_task" USING btree ("app");