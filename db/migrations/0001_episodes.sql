CREATE TYPE "public"."episode_status" AS ENUM('draft', 'published');--> statement-breakpoint
CREATE TYPE "public"."podcast_show" AS ENUM('wfc', 'aamsaz');--> statement-breakpoint
CREATE TABLE "episode" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show" "podcast_show" NOT NULL,
	"episode_number" integer NOT NULL,
	"title" text NOT NULL,
	"show_notes" text NOT NULL,
	"show_notes_excerpt" text NOT NULL,
	"artwork_url" text NOT NULL,
	"disctopia_url" text NOT NULL,
	"status" "episode_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "episode_show_number_unique" UNIQUE("show","episode_number")
);
--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE no action;