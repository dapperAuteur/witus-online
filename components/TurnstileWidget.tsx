"use client";

import Script from "next/script";

/**
 * Cloudflare Turnstile widget. Renders a `.cf-turnstile` div that the
 * Turnstile script auto-detects and replaces. When the widget sits inside
 * a <form>, Turnstile injects a hidden `cf-turnstile-response` input with
 * the verification token. Server actions read that token from FormData.
 *
 * Dev-mode contract: if NEXT_PUBLIC_TURNSTILE_SITE_KEY is missing we
 * render a small dev-skip notice instead, and the server-side verifier
 * returns true so local dev works.
 */
export default function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  if (!siteKey) {
    return (
      <p className="text-xs italic text-amber-300">
        Turnstile site key not configured. Bot check skipped (dev mode).
      </p>
    );
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        async
        defer
      />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="dark" />
    </>
  );
}
