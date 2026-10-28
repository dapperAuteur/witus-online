CREATE TABLE "claude_usage_responses" (
	"message_id" text PRIMARY KEY NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"machine" text NOT NULL,
	"project" text NOT NULL,
	"session" text NOT NULL,
	"is_sub" boolean NOT NULL,
	"model" text NOT NULL,
	"input_tokens" bigint NOT NULL,
	"cache_write_5m_tokens" bigint NOT NULL,
	"cache_write_1h_tokens" bigint NOT NULL,
	"cache_read_tokens" bigint NOT NULL,
	"output_tokens" bigint NOT NULL,
	"archived_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "claude_usage_responses_ts_idx" ON "claude_usage_responses" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "claude_usage_responses_session_ts_idx" ON "claude_usage_responses" USING btree ("session","ts");