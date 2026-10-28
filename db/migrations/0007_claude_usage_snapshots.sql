CREATE TABLE "claude_usage_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"machine" text NOT NULL,
	"coverage_start" timestamp with time zone,
	"coverage_end" timestamp with time zone,
	"responses" integer DEFAULT 0 NOT NULL,
	"input_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_write_5m_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_write_1h_tokens" bigint DEFAULT 0 NOT NULL,
	"cache_read_tokens" bigint DEFAULT 0 NOT NULL,
	"output_tokens" bigint DEFAULT 0 NOT NULL,
	"list_price_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
	"mistake_price_usd" numeric(12, 4) DEFAULT '0' NOT NULL,
	"mistake_share" numeric(9, 6) DEFAULT '0' NOT NULL,
	"detail" jsonb
);
