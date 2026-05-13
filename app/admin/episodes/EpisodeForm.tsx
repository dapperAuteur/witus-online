"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createEpisodeAction,
  updateEpisodeAction,
  type FormState,
} from "./actions";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";
const labelClass = "text-sm font-semibold text-slate-100";
const hintClass = "text-xs text-slate-400";
const errorClass = "text-xs text-red-400";

export type EpisodeDefaults = {
  show?: "wfc" | "aamsaz";
  episodeNumber?: number;
  title?: string;
  showNotes?: string;
  showNotesExcerpt?: string;
  artworkUrl?: string;
  disctopiaUrl?: string;
};

const initialState: FormState = { status: "idle" };

export function EpisodeForm({
  mode,
  episodeId,
  defaults,
}: {
  mode: "create" | "edit";
  episodeId?: string;
  defaults?: EpisodeDefaults;
}) {
  const action =
    mode === "edit" && episodeId
      ? updateEpisodeAction.bind(null, episodeId)
      : createEpisodeAction;
  const [state, formAction] = useActionState<FormState, FormData>(
    action,
    initialState
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label htmlFor="show" className={labelClass}>
            Show
          </label>
          <select
            id="show"
            name="show"
            required
            defaultValue={defaults?.show ?? "wfc"}
            className={inputClass}
          >
            <option value="wfc">World&rsquo;s Fastest Centenarian</option>
            <option value="aamsaz">African American Museum of Southern Arizona</option>
          </select>
          {state.fieldErrors?.show ? (
            <p className={errorClass}>{state.fieldErrors.show}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="episodeNumber" className={labelClass}>
            Episode #
          </label>
          <input
            id="episodeNumber"
            name="episodeNumber"
            type="number"
            min={1}
            required
            defaultValue={defaults?.episodeNumber ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.episodeNumber ? (
            <p className={errorClass}>{state.fieldErrors.episodeNumber}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="title" className={labelClass}>
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={300}
          defaultValue={defaults?.title ?? ""}
          className={inputClass}
        />
        {state.fieldErrors?.title ? (
          <p className={errorClass}>{state.fieldErrors.title}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="showNotesExcerpt" className={labelClass}>
          Show-notes excerpt
        </label>
        <textarea
          id="showNotesExcerpt"
          name="showNotesExcerpt"
          required
          rows={3}
          maxLength={600}
          defaultValue={defaults?.showNotesExcerpt ?? ""}
          className={inputClass}
        />
        <p className={hintClass}>
          ≤ 600 chars. Used as the body of long-form social captions (LinkedIn).
        </p>
        {state.fieldErrors?.showNotesExcerpt ? (
          <p className={errorClass}>{state.fieldErrors.showNotesExcerpt}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="showNotes" className={labelClass}>
          Show notes (full)
        </label>
        <textarea
          id="showNotes"
          name="showNotes"
          required
          rows={8}
          maxLength={20000}
          defaultValue={defaults?.showNotes ?? ""}
          className={inputClass}
        />
        {state.fieldErrors?.showNotes ? (
          <p className={errorClass}>{state.fieldErrors.showNotes}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="artworkUrl" className={labelClass}>
            Artwork URL (https)
          </label>
          <input
            id="artworkUrl"
            name="artworkUrl"
            type="url"
            required
            defaultValue={defaults?.artworkUrl ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.artworkUrl ? (
            <p className={errorClass}>{state.fieldErrors.artworkUrl}</p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="disctopiaUrl" className={labelClass}>
            Disctopia episode URL
          </label>
          <input
            id="disctopiaUrl"
            name="disctopiaUrl"
            type="url"
            required
            defaultValue={defaults?.disctopiaUrl ?? ""}
            className={inputClass}
          />
          {state.fieldErrors?.disctopiaUrl ? (
            <p className={errorClass}>{state.fieldErrors.disctopiaUrl}</p>
          ) : null}
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <SubmitButton mode={mode} />
    </form>
  );
}

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  const label =
    mode === "edit"
      ? pending
        ? "Saving…"
        : "Save changes"
      : pending
        ? "Creating…"
        : "Create episode";
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
    >
      {label}
    </button>
  );
}
