"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import TurnstileWidget from "@/components/TurnstileWidget";
import { pilotSignupAction, type FormState } from "@/app/educators/actions";

const ROLES = [
  "Teacher",
  "Department chair",
  "Curriculum coordinator",
  "Principal / administrator",
  "Other",
];

const SUBJECTS = ["Geography", "Social Studies", "Economics", "ELA", "Other"];

const GRADES = ["9", "10", "11", "12", "Other"];

const TIMELINES = [
  "This term",
  "Next term",
  "Next school year",
  "Still exploring",
];

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
      {pending ? "Sending to BAM..." : "Apply to pilot the curriculum"}
      <span aria-hidden="true" className="ml-2">
        &rarr;
      </span>
    </button>
  );
}

export default function PilotSignupForm() {
  const [state, formAction] = useActionState<FormState, FormData>(
    pilotSignupAction,
    { status: "idle" }
  );

  if (state.status === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-teal-500/40 bg-teal-500/10 p-6 text-sm text-teal-100"
      >
        <p className="text-base font-semibold text-white mb-1">Thanks.</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Name</span>
          <input className={inputClass} type="text" name="name" required autoComplete="name" />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Email</span>
          <input className={inputClass} type="email" name="email" required autoComplete="email" />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Role</span>
        <select className={inputClass} name="role" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>School</span>
          <input className={inputClass} type="text" name="school" required />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>District</span>
          <input className={inputClass} type="text" name="district" required />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Country</span>
        <input
          className={inputClass}
          type="text"
          name="country"
          required
          placeholder="United States, Mexico, Kenya, ..."
          autoComplete="country-name"
        />
        <span className={hintClass}>
          BVC ships with Indiana Academic Standards alignment notes. Tell BAM your country so follow-up materials fit.
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Subjects you teach</legend>
        <span className={hintClass}>Select all that apply.</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
          {SUBJECTS.map((s) => (
            <label
              key={s}
              className="inline-flex items-center gap-2 text-sm text-slate-200"
            >
              <input
                type="checkbox"
                name="subjects"
                value={s}
                className="h-4 w-4 rounded border-slate-600 bg-slate-950 accent-teal-400"
              />
              {s}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={labelClass}>Grade levels</legend>
        <span className={hintClass}>Select all that apply.</span>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Years teaching</span>
          <input
            className={inputClass}
            type="number"
            name="years-teaching"
            required
            min={0}
            max={60}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className={labelClass}>Timeline</span>
          <select className={inputClass} name="timeline" required defaultValue="">
            <option value="" disabled>
              When would you pilot?
            </option>
            {TIMELINES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Students per class (optional)</span>
        <input
          className={inputClass}
          type="text"
          name="students-per-class"
          placeholder="e.g. 25"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>How did you hear about BVC? (optional)</span>
        <input className={inputClass} type="text" name="how-heard" />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>
          Commodities or episodes most relevant to your course (optional)
        </span>
        <textarea className={inputClass} name="commodity-interests" rows={3} />
      </label>

      <label className="flex flex-col gap-2">
        <span className={labelClass}>Anything else BAM should know? (optional)</span>
        <textarea className={inputClass} name="other" rows={3} />
      </label>

      <TurnstileWidget />
      <SubmitButton />
    </form>
  );
}
