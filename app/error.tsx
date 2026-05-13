"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <section
      role="alert"
      aria-labelledby="err-heading"
      className="mx-auto flex max-w-3xl flex-col items-start gap-6 px-4 py-16"
    >
      <p
        aria-hidden="true"
        className="font-mono text-xs tracking-[0.3em] text-red-400"
      >
        500
      </p>
      <h1
        id="err-heading"
        className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl"
      >
        Something broke on our side.
      </h1>
      <p className="max-w-prose text-base text-slate-400">
        The page hit an unexpected error. We&rsquo;ve logged it — your data
        is safe and nothing was lost. Try the page again, or pick a different
        route.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-teal-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-100 transition-colors hover:border-teal-400 hover:text-teal-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          Back to home
        </Link>
      </div>

      {error.digest ? (
        <details className="mt-2 max-w-prose">
          <summary className="cursor-pointer text-xs text-slate-500 hover:text-teal-300">
            Diagnostic reference
          </summary>
          <p className="mt-2 text-xs text-slate-500">
            If you contact us about this, paste this id so we can find the
            log:
          </p>
          <p className="mt-1 font-mono text-xs text-slate-300 break-all">
            {error.digest}
          </p>
        </details>
      ) : null}

      <p className="text-xs text-slate-500">
        Still broken after a retry?{" "}
        <Link
          href="/educators/feedback"
          className="underline underline-offset-4 hover:text-teal-300"
        >
          Send a report
        </Link>{" "}
        — include the diagnostic id above if you have one.
      </p>
    </section>
  );
}
