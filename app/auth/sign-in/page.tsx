"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const callbackUrl =
      new URLSearchParams(window.location.search).get("callbackUrl") ?? "/admin";
    const result = await signIn("email", {
      email,
      callbackUrl,
      redirect: false,
    });
    if (result?.error) {
      setPending(false);
      setError("Could not start sign-in. Check the email address and try again.");
      return;
    }
    if (result?.url) {
      window.location.href = result.url;
      return;
    }
    window.location.href = "/auth/verify-request";
  }

  return (
    <main
      id="main"
      className="flex flex-1 items-center justify-center px-4 py-10"
    >
      <div className="w-full max-w-sm space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-100">
            Sign in to witus.online
          </h1>
          <p className="text-sm text-slate-400">
            Enter the admin email address. A single-use sign-in link will be
            emailed to you.
          </p>
        </header>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-slate-100"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              aria-describedby={error ? "sign-in-error" : undefined}
              aria-invalid={error ? true : undefined}
              className={inputClass}
            />
          </div>

          {error ? (
            <p
              id="sign-in-error"
              role="alert"
              className="text-sm text-red-400"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending || email.length === 0}
            className="inline-flex w-full items-center justify-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
          >
            {pending ? "Sending link…" : "Email me a sign-in link"}
          </button>
        </form>

        <p className="text-center text-xs uppercase tracking-wide text-slate-500">or</p>

        <button
          type="button"
          onClick={() => {
            const callbackUrl =
              new URLSearchParams(window.location.search).get("callbackUrl") ?? "/admin";
            void signIn("witus", { callbackUrl });
          }}
          className="inline-flex w-full items-center justify-center min-h-11 px-5 py-2.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-100 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
        >
          Sign in with WitUS
        </button>
      </div>
    </main>
  );
}
