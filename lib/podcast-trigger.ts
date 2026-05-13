import "server-only";
import type { OutboxPlatform } from "./sender-outbox";
import { fireOutboxDrafts } from "./outbox-trigger";
import { getEnv } from "./env";

export type PodcastShow = "wfc" | "aamsaz";

type ShowConfig = {
  slugEnvKey: string;
  secretEnvKey: string;
  productName: string;
};

const SHOW_CONFIG: Record<PodcastShow, ShowConfig> = {
  wfc: {
    slugEnvKey: "OUTBOX_PODCAST_WFC_SLUG",
    secretEnvKey: "OUTBOX_PODCAST_WFC_SECRET",
    productName: "World's Fastest Centenarian",
  },
  aamsaz: {
    slugEnvKey: "OUTBOX_PODCAST_AAMSAZ_SLUG",
    secretEnvKey: "OUTBOX_PODCAST_AAMSAZ_SECRET",
    productName: "African American Museum of Southern Arizona Podcast",
  },
};

const PLATFORMS: readonly OutboxPlatform[] = ["linkedin", "twitter", "bluesky"];

export interface PodcastEpisodeTriggerArgs {
  show: PodcastShow;
  triggerUserEmail: string | null | undefined;
  episodeId: string;
  episodeNumber: number;
  title: string;
  showNotesExcerpt: string;
  artworkUrl: string;
  disctopiaUrl: string;
}

export function firePodcastEpisodePublished(args: PodcastEpisodeTriggerArgs): void {
  // Cheap-gate the kill-switch BEFORE reading any podcast env, so dev mode
  // with the flag off never trips on missing OUTBOX_PODCAST_*_SECRET.
  if (process.env.OUTBOX_TRIGGER_ENABLED !== "true") return;

  const ingestUrl = process.env.OUTBOX_INGEST_URL;
  if (!ingestUrl) {
    console.error("[podcast-trigger] missing OUTBOX_INGEST_URL");
    return;
  }

  const cfg = SHOW_CONFIG[args.show];
  const slug = process.env[cfg.slugEnvKey];
  const secret = process.env[cfg.secretEnvKey];
  if (!slug || !secret) {
    console.error("[podcast-trigger] missing slug or secret for show", {
      show: args.show,
      slug_env_key: cfg.slugEnvKey,
      secret_env_key: cfg.secretEnvKey,
    });
    return;
  }

  const longForm = buildLongFormCaption(args, cfg.productName);
  const oneLiner = buildOneLinerCaption(args, cfg.productName);

  const captions: Partial<Record<OutboxPlatform, string>> = {
    linkedin: longForm,
    twitter: oneLiner,
    bluesky: oneLiner,
  };

  fireOutboxDrafts({
    ingestUrl,
    sourceSlug: slug,
    hmacSecret: secret,
    triggerUserEmail: args.triggerUserEmail,
    adminEmail: getEnv().ADMIN_EMAIL,
    externalRefBase: `episode-${args.episodeId}`,
    captions,
    mediaUrls: [args.artworkUrl],
    platforms: PLATFORMS,
  });
}

function buildLongFormCaption(
  args: PodcastEpisodeTriggerArgs,
  productName: string
): string {
  return [
    `New ${productName} episode (#${args.episodeNumber}): "${args.title}"`,
    "",
    args.showNotesExcerpt,
    "",
    `Listen: ${args.disctopiaUrl}`,
  ].join("\n");
}

function buildOneLinerCaption(
  args: PodcastEpisodeTriggerArgs,
  productName: string
): string {
  return `New ${productName} episode: "${args.title}". ${args.disctopiaUrl}`;
}
