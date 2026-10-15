CREATE TABLE "service_snapshot" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_slug" text NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"usage_cost" numeric(12, 4) DEFAULT '0' NOT NULL,
	"base_fee" numeric(10, 2),
	"lines" jsonb,
	"detail" jsonb,
	"source" text NOT NULL,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service" (
	"slug" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"vendor" text NOT NULL,
	"category" text DEFAULT 'infrastructure' NOT NULL,
	"plan" text,
	"billed_via" text DEFAULT 'direct' NOT NULL,
	"base_fee_monthly" numeric(10, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"account_url" text,
	"usage_source" text DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"used_by" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"last_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_snapshot" ADD CONSTRAINT "service_snapshot_service_slug_service_slug_fk" FOREIGN KEY ("service_slug") REFERENCES "public"."service"("slug") ON DELETE cascade ON UPDATE no action;