"use client";

import { useFormStatus } from "react-dom";
import TurnstileWidget from "@/components/TurnstileWidget";
import { downloadAction } from "@/app/educators/actions";

function DownloadButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center min-h-11 px-5 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-sm font-semibold transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 disabled:cursor-wait disabled:opacity-60"
    >
      {pending ? "Preparing download..." : "Download the ELA sample packet"}
      <span aria-hidden="true" className="ml-2">
        &rarr;
      </span>
    </button>
  );
}

interface Props {
  botError?: boolean;
  packetMissing?: boolean;
}

export default function SampleDownloadCard({ botError, packetMissing }: Props) {
  return (
    <form action={downloadAction} className="flex flex-col gap-4">
      {botError && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
        >
          Bot check failed. Please refresh and try again.
        </p>
      )}
      {packetMissing && (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm text-rose-200"
        >
          The packet is temporarily unavailable. Please check back soon.
        </p>
      )}
      <TurnstileWidget />
      <DownloadButton />
      <p className="text-xs text-slate-400">
        Downloads a PDF. Roughly 180&nbsp;KB. No email required.
      </p>
    </form>
  );
}
