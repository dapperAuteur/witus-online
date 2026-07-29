"use client";

import { capture } from "@/lib/analytics/capture";
import { EVENTS } from "@/lib/analytics/events";

/**
 * The CTA anchor inside a ProductCard, split out purely so the click can be recorded.
 *
 * ProductCard stays a Server Component: only this anchor ships JS, rather than the
 * whole card and its ~10-variant accent style map. Worth the extra file — the product
 * directory is the densest part of the page.
 *
 * Why this event matters more than any other on the site: witus.online is the
 * ecosystem's front door, so "which products do people actually want" is the question
 * it exists to answer. That is a RATIO between events, which stays valid despite
 * `persistence: "memory"` inflating absolute visitor counts (see posthog-provider).
 *
 * No preventDefault and no awaiting the request — navigation must never wait on
 * analytics. posthog-js sends via the browser's keepalive/beacon path, which survives
 * the page unload that follows a same-tab click.
 */
export function ProductLink({
  href,
  name,
  slug,
  status,
  external,
  className,
}: {
  href: string;
  name: string;
  slug: string;
  status?: string;
  external?: boolean;
  className?: string;
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      className={className}
      onClick={() => {
        capture(EVENTS.productCardClicked, {
          // `product` is the stable slug, not the display name — display names get
          // reworded and would fragment the same product into several series.
          product: slug,
          status,
          external: Boolean(external),
        });
      }}
    >
      <span>Open {name}</span>
      <span aria-hidden="true" className="ml-2">
        &rarr;
      </span>
      {external && <span className="sr-only"> (opens in new tab)</span>}
    </a>
  );
}
