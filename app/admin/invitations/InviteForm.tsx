"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { createInvitationAction, type FormState } from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
const labelClass = "text-sm font-semibold text-slate-100";
const hintClass = "text-xs text-slate-400";

const initialState: FormState = { status: "idle" };

export function InviteForm() {
  const [state, action] = useActionState<FormState, FormData>(
    createInvitationAction,
    initialState
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="email" className={labelClass}>
            Email to invite
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            inputMode="email"
            autoComplete="off"
            placeholder="guest@example.com"
            className={inputClass}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="expiresInDays" className={labelClass}>
            Expires in (days)
          </label>
          <input
            id="expiresInDays"
            name="expiresInDays"
            type="number"
            min={1}
            max={365}
            defaultValue={30}
            className={inputClass}
          />
          <p className={hintClass}>Default 30. Max 365.</p>
        </div>
      </div>

      {state.status === "error" ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
      {state.status === "success" ? (
        <p
          role="status"
          className="rounded-lg border border-teal-500/30 bg-teal-500/10 px-4 py-3 text-sm text-teal-200"
        >
          {state.message}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Sending invite…" : "Invite"}
    </button>
  );
}
