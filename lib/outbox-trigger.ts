import "server-only";
import { after } from "next/server";
import { sendToOutbox, type OutboxPlatform } from "./sender-outbox";

/**
 * Fire one outbox draft per platform from a single ingest slug.
 *
 * Layered gates run BEFORE any network call:
 *   1. Master kill-switch (OUTBOX_TRIGGER_ENABLED env).
 *   2. BAM-only gate. Witus-online intentionally compares EMAIL (against
 *      ADMIN_EMAIL) rather than user-id (as the canonical INTEGRATE.md Step 2
 *      recipe does) — see plan file ~/.claude/plans/please-review-plans-
 *      ecosystem-10-witus-o-glowing-biscuit.md. The signIn callback in
 *      lib/auth.ts already rejects every non-admin email at auth time, so
 *      this is the single source of truth.
 *   3. Per-user opt-in (later) — see witus-outbox plans/future/per-user-opt-in.md.
 *
 * `as_draft: true` by default — operator reviews + schedules from
 * /outbox/[id] before anything goes live.
 */
export function fireOutboxDrafts(args: {
  ingestUrl: string;
  sourceSlug: string;
  hmacSecret: string;
  triggerUserEmail: string | null | undefined;
  adminEmail: string;
  externalRefBase: string;
  captions: Partial<Record<OutboxPlatform, string>>;
  mediaUrls?: string[];
  platforms?: readonly OutboxPlatform[];
  scheduledAt?: Date;
  asDraft?: boolean;
}): void {
  // Gate 1: kill-switch.
  if (process.env.OUTBOX_TRIGGER_ENABLED !== "true") return;
  // Gate 2: BAM-only — email comparison (witus.online deviation from canonical recipe).
  const triggerEmail = args.triggerUserEmail?.toLowerCase();
  const adminEmail = args.adminEmail.toLowerCase();
  if (!triggerEmail || triggerEmail !== adminEmail) return;

  const platforms =
    args.platforms ?? (["twitter", "bluesky", "linkedin"] as const);
  const placeholderTime =
    args.scheduledAt ?? new Date(Date.now() + 7 * 24 * 60 * 60_000);
  const asDraft = args.asDraft ?? true;

  after(async () => {
    for (const platform of platforms) {
      const caption = args.captions[platform];
      if (!caption) {
        console.error("[outbox-trigger] missing caption", {
          source: args.sourceSlug,
          platform,
          external_ref_base: args.externalRefBase,
        });
        continue;
      }
      const result = await sendToOutbox({
        outboxUrl: args.ingestUrl,
        sourceSlug: args.sourceSlug,
        hmacSecret: args.hmacSecret,
        submission: {
          external_ref: `${args.externalRefBase}-${platform}`,
          platform,
          caption,
          media_urls: args.mediaUrls ?? [],
          scheduled_at: placeholderTime.toISOString(),
          as_draft: asDraft,
        },
      });
      if (!result.ok) {
        // Log only metadata. NEVER caption / media URLs / secret / signature.
        console.error("[outbox-trigger] failed", {
          source: args.sourceSlug,
          platform,
          external_ref_base: args.externalRefBase,
          http_status: result.status,
        });
      }
    }
  });
}
