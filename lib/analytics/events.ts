/**
 * Event taxonomy for witus.online.
 *
 * The ecosystem shares ONE PostHog project, separated by the `app` property that
 * posthog-provider registers on load. Two rules keep that project readable, and both
 * are cheap now and expensive to retrofit once data has landed:
 *
 *   1. `snake_case`, object first, verb in past tense — `product_card_clicked`.
 *   2. NEVER put the app name in the event name. `witus_online_signin_started` is
 *      wrong: it makes the same action from two apps look like two events and kills
 *      the cross-app comparison that sharing a project exists to enable. The `app`
 *      property already carries that.
 *
 * Shared lifecycle events (the SHARED_EVENTS block) use identical names in every
 * ecosystem app, so "where do people fall out of sign-in" is answerable across all of
 * them at once. Do not rename these here without renaming them everywhere.
 *
 * See plans/26-posthog-ecosystem-rollout.md for the full contract.
 */

/** Matches this app's slug in lib/identity/clients.ts. Every event carries it. */
export const ANALYTICS_APP = "online";

/**
 * Events with identical names across every ecosystem app. Names are contractual.
 */
export const SHARED_EVENTS = {
  signinStarted: "signin_started",
  signinSucceeded: "signin_succeeded",
  signinFailed: "signin_failed",
} as const;

/**
 * Events specific to witus.online. This site is the ecosystem's front door, so its
 * job is to answer one question: which products do people actually want? That makes
 * product-directory click-through the highest-value number the whole rollout produces
 * — it is a ratio between events, which stays valid even though `persistence: "memory"`
 * distorts absolute visitor counts.
 */
export const EVENTS = {
  /** A product card in the directory was clicked. Carries `product` + `status`. */
  productCardClicked: "product_card_clicked",
  /** An explicit route view. capture_pageview is off — Next's client router would
   *  fire it once and then lie — so route changes are reported deliberately. */
  routeViewed: "route_viewed",
  ...SHARED_EVENTS,
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];
