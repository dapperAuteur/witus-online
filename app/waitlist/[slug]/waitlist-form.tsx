"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import TurnstileWidget from "@/components/TurnstileWidget";
import { joinWaitlistAction } from "./actions";
import {
  EMAIL_MAX,
  HONEYPOT_FIELD,
  NAME_MAX,
  USE_MAX,
  type WaitlistResult,
} from "@/lib/waitlist/waitlist.mjs";

const inputClass =
  "w-full min-h-11 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-base sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 aria-invalid:border-rose-400";
const labelClass = "text-sm font-semibold text-slate-100";
const hintClass = "text-xs text-slate-400";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full sm:w-auto items-center justify-center min-h-12 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Joining the waitlist..." : "Join the waitlist"}
    </button>
  );
}

/** Waitlist form for one alpha product. Server-side checks live in ./actions.ts. */
export function WaitlistForm({ slug, productName }: { slug: string; productName: string }) {
  const [state, formAction] = useActionState<WaitlistResult | null, FormData>(joinWaitlistAction, null);
  // Controlled so a failed submit keeps what the person typed (React resets uncontrolled forms).
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [use, setUse] = useState("");
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state?.ok) successRef.current?.focus();
  }, [state]);

  if (state?.ok) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-6 text-sm text-teal-100 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
      >
        <p className="text-base font-semibold text-white mb-1">You&apos;re on the list.</p>
        <p>{state.data.message}</p>
        <p className="mt-4">
          <Link
            href="/"
            className="inline-flex items-center min-h-11 font-semibold text-teal-300 underline underline-offset-2 hover:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
          >
            Back to WitUS
          </Link>
        </p>
      </div>
    );
  }

  const error = state && !state.ok ? state : null;
  const errorFor = (f: "email" | "name" | "use") => (error?.field === f ? error.error : null);
  const describedBy = (f: "email" | "name" | "use", hintId?: string) =>
    [hintId, errorFor(f) ? `waitlist-${f}-error` : null].filter(Boolean).join(" ") || undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="slug" value={slug} />

      {error && !error.field ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
        >
          {error.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-email" className={labelClass}>
          Email <span className="font-normal text-slate-400">(required)</span>
        </label>
        <input
          id="waitlist-email"
          className={inputClass}
          type="email"
          name="email"
          required
          maxLength={EMAIL_MAX}
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={errorFor("email") ? true : undefined}
          aria-describedby={describedBy("email")}
        />
        {errorFor("email") ? (
          <p id="waitlist-email-error" role="alert" className="text-sm text-rose-300">
            {errorFor("email")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-name" className={labelClass}>
          Name <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="waitlist-name"
          className={inputClass}
          type="text"
          name="name"
          maxLength={NAME_MAX}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={errorFor("name") ? true : undefined}
          aria-describedby={describedBy("name")}
        />
        {errorFor("name") ? (
          <p id="waitlist-name-error" role="alert" className="text-sm text-rose-300">
            {errorFor("name")}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="waitlist-use" className={labelClass}>
          What would you use {productName} for? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="waitlist-use"
          className={`${inputClass} min-h-24`}
          name="use"
          rows={3}
          maxLength={USE_MAX}
          value={use}
          onChange={(e) => setUse(e.target.value)}
          aria-invalid={errorFor("use") ? true : undefined}
          aria-describedby={describedBy("use", "waitlist-use-hint")}
        />
        <span id="waitlist-use-hint" className={hintClass}>
          A sentence is plenty. It helps decide who gets in first.
        </span>
        {errorFor("use") ? (
          <p id="waitlist-use-error" role="alert" className="text-sm text-rose-300">
            {errorFor("use")}
          </p>
        ) : null}
      </div>

      {/* Honeypot: hidden from people and screen readers; bots that fill every field get a
          quiet "success" and nothing is sent. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="waitlist-website">Website</label>
        <input id="waitlist-website" type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <TurnstileWidget />

      <p id="waitlist-consent" className="text-xs leading-relaxed text-slate-400">
        By joining, you agree that WitUS may email you about {productName}: when a spot opens and
        to ask about your alpha access. Your details go to the WitUS team inbox only. They are not
        sold, shared, or added to a newsletter. Reply to any of those emails to be taken off the
        list. See the{" "}
        <Link
          href="/privacy"
          className="underline underline-offset-2 text-slate-300 hover:text-white focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 rounded"
        >
          privacy policy
        </Link>
        .
      </p>

      <SubmitButton />
    </form>
  );
}
