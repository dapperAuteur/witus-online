import * as Sentry from "@sentry/nextjs";
import type { Instrumentation } from "next";

// Next.js instrumentation hook. Loads the right Sentry config per runtime, and reports server-side
// App Router errors via onRequestError. Everything is inert without a SENTRY_DSN (see the configs).
//
// No src/ directory in this repo, so both this file and the sentry.*.config.ts files live at the
// project root and the imports below are siblings.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./sentry.server.config");
  if (process.env.NEXT_RUNTIME === "edge") await import("./sentry.edge.config");
}

// Captures errors thrown while rendering/serving a request. We tag the request HOST because this
// deployment answers on more than one (witus.online is the marketing site, accounts.witus.online is
// the IdP), and knowing which one crashed is the first triage question. The host is not PII and
// costs no DB lookup in the error path. captureRequestError does the rest.
export const onRequestError: Instrumentation.onRequestError = (err, request, context) => {
  const raw = request.headers as unknown;
  let host: string | undefined;
  if (raw instanceof Headers) host = raw.get("host") ?? raw.get("x-forwarded-host") ?? undefined;
  else if (raw && typeof raw === "object") {
    const h = raw as Record<string, unknown>;
    const v = h.host ?? h["x-forwarded-host"];
    if (typeof v === "string") host = v;
  }
  Sentry.withScope((scope) => {
    if (host) scope.setTag("request.host", host);
    Sentry.captureRequestError(err, request, context);
  });
};
