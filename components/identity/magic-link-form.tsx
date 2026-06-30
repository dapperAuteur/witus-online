"use client";

import { useState } from "react";
import { identityAuthClient } from "@/lib/identity/auth-client";

/**
 * WitUS Accounts magic-link sign-in. Passes an ABSOLUTE same-origin callbackURL
 * so the post-verify redirect lands back on this host (relative callbacks resolve
 * against the IdP baseURL — the same trap fixed in the learnwitus white-label bug).
 */
export function IdentityMagicLinkForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    // When this page was reached via an OAuth authorize request, better-auth
    // redirected here as `${loginPage}?${original authorize query}`. After sign-in
    // we must return to the authorize endpoint (now with a session) so the OIDC
    // flow continues back to the client app — NOT land on the IdP home page, which
    // would strand the user on accounts.witus.online. Direct sign-ins (no client_id)
    // fall back to home.
    const params = new URLSearchParams(window.location.search);
    const origin = window.location.origin;
    const callbackURL = params.has("client_id")
      ? `${origin}/api/idp/oauth2/authorize?${params.toString()}`
      : `${origin}/`;
    const { error } = await identityAuthClient.signIn.magicLink({ email, callbackURL });
    setStatus(error ? "error" : "sent");
  }

  if (status === "sent") {
    return (
      <p role="status" aria-live="polite" className="rounded-md bg-neutral-100 p-4 dark:bg-neutral-800">
        Check your email for a sign-in link.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="email" className="text-sm font-medium">
        Email
      </label>
      <input
        id="email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="min-h-12 rounded-md border border-neutral-300 px-3 dark:border-neutral-700 dark:bg-neutral-900"
        placeholder="you@example.com"
      />
      <button
        type="submit"
        disabled={status === "sending"}
        className="min-h-12 rounded-md bg-fuchsia-600 px-4 font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60"
      >
        {status === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {status === "error" ? (
        <p role="alert" className="text-sm text-red-600">
          Could not send the link. Please try again.
        </p>
      ) : null}
    </form>
  );
}
