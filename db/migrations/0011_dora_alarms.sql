CREATE TABLE "dora_alarms" (
	"app" text NOT NULL,
	"sha" text NOT NULL,
	"kind" text NOT NULL,
	"failed_at" timestamp with time zone NOT NULL,
	"sent_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dora_alarms_app_sha_kind_pk" PRIMARY KEY("app","sha","kind")
);
--> statement-breakpoint
CREATE INDEX "dora_alarms_unresolved_idx" ON "dora_alarms" USING btree ("resolved_at");