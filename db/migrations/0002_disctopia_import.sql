ALTER TABLE "episode" DROP CONSTRAINT "episode_show_number_unique";--> statement-breakpoint
ALTER TABLE "episode" ALTER COLUMN "episode_number" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "episode" ADD COLUMN "disctopia_guid" text;--> statement-breakpoint
ALTER TABLE "episode" ADD CONSTRAINT "episode_disctopia_guid_unique" UNIQUE("disctopia_guid");