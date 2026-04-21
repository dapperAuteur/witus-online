"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import TurnstileWidget from "@/components/TurnstileWidget";
import { feedbackAction } from "@/app/educators/feedback/actions";
import type { FormState } from "@/app/educators/actions";
import { PACKETS } from "@/lib/packets";

const SUBJECTS = ["Geography", "Social Studies", "Economics", "ELA", "Other"];
const GRADES = ["9", "10", "11", "12", "Other"];
const RECOMMEND = ["Yes", "Yes, with changes", "No"];
const RATINGS = [1, 2, 3, 4, 5];

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

const labelClass = "text-sm font-semibold text-slate-100";
const hintClass = "text-xs text-slate-400";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Sending feedback..." : "Send feedback to BAM"}
      <span aria-hidden="true" className="ml-2">
        &rarr;
      </span>
    </button>
  );
}

export default function FeedbackForm({
  initialPacket,
}: {
  initialPacket?: string;
}) {
  const [state, formAction] = useActionState<FormState, FormData>(
    feedbackAction,
    { status: "idle" }
  );

  const defaultPacket = PACKETS.some((p) => p.id === initialPacket)
    ? initialPacket
    : PACKETS[0]?.id ?? "";

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-6 text-sm text-teal-100"
      >
        <p className="text-base font-semibold text-white mb-1">Got it.</p>
        <p>{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
        >
          {state.error}
        </p>
      )}

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Which packet did you use?</span>
        <select
          className={inputClass}
          name="packet"
          required
          defaultValue={defaultPacket}
        >
          {PACKETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <span className={hintClass}>
          The QR code on the packet prefilled this. Change it if you used a
          different one.
        </span>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Subject you taught it in</span>
          <select
            className={inputClass}
            name="subject-taught"
            required
            defaultValue=""
          >
            <option value="" disabled>
              Choose one
            </option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Country</span>
          <input
            className={inputClass}
            type="text"
            name="country"
            required
            autoComplete="country-name"
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Grade level(s)</legend>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-1">
          {GRADES.map((g) => (
            <label
              key={g}
              className="inline-flex items-center gap-2 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                name="grades"
                value={g}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-teal-400"
              />
              {g}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>How many students?</span>
        <input
          className={inputClass}
          type="text"
          name="students"
          required
          placeholder="e.g. 24"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>What worked well?</span>
        <textarea
          className={inputClass}
          name="what-worked"
          required
          rows={4}
          placeholder="Specific moments, student reactions, parts of the packet that landed."
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>What did not work?</span>
        <textarea
          className={inputClass}
          name="what-didnt"
          required
          rows={4}
          placeholder="Confusing parts, pacing issues, missing context, tech hiccups, anything you had to work around."
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Would you recommend it?</legend>
        <div className="flex flex-wrap gap-3 mt-1">
          {RECOMMEND.map((r) => (
            <label
              key={r}
              className="inline-flex items-center gap-2 text-sm text-slate-200"
            >
              <input
                type="radio"
                name="recommend"
                value={r}
                className="h-4 w-4 border-slate-600 bg-slate-950 accent-teal-400"
              />
              {r}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Overall rating</legend>
        <div className="flex flex-wrap gap-3 mt-1">
          {RATINGS.map((r) => (
            <label
              key={r}
              className="inline-flex items-center gap-2 text-sm text-slate-200"
            >
              <input
                type="radio"
                name="rating"
                value={String(r)}
                className="h-4 w-4 border-slate-600 bg-slate-950 accent-teal-400"
              />
              {r}
            </label>
          ))}
        </div>
        <span className={hintClass}>1 = scrap this. 5 = teach it again.</span>
      </fieldset>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Name (optional)</span>
          <input className={inputClass} type="text" name="name" autoComplete="name" />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Email (optional)</span>
          <input className={inputClass} type="email" name="email" autoComplete="email" />
          <span className={hintClass}>
            Leave blank if you do not want follow-up. Your feedback still
            reaches BAM either way.
          </span>
        </label>
      </div>

      <TurnstileWidget />
      <SubmitButton />
    </form>
  );
}
