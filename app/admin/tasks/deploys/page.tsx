import { Suspense } from "react";
import { getEnv } from "@/lib/env";
import { loadDeploysOverview, type AppDeploy, type DeployInfo } from "@/lib/ops/deploys";
import { LoadingRow } from "../../loading-row";
import { RefreshButton } from "../refresh-button";
import { ago } from "../time";

export const dynamic = "force-dynamic";

const LABEL: Record<AppDeploy["state"], string> = {
  failed: "Deploy failed",
  behind: "Behind main",
  error: "Could not read",
  "in-progress": "Building",
  live: "Live on main",
  none: "No production deploys",
};

const TONE: Record<string, string> = {
  red: "border-red-700 bg-red-950/70 text-red-200",
  amber: "border-amber-700 bg-amber-950/60 text-amber-200",
  green: "border-emerald-800 bg-emerald-950/60 text-emerald-200",
  grey: "border-slate-700 bg-slate-900 text-slate-300",
};

const link = "underline decoration-slate-600 underline-offset-2 hover:text-teal-300 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300";

function Sha({ repo, sha }: { repo: string; sha: string }) {
  return (
    <a href={`https://github.com/${repo}/commit/${sha}`} target="_blank" rel="noopener noreferrer" className={`font-mono ${link}`}>
      {sha.slice(0, 7)}
      <span className="sr-only"> (opens in new tab)</span>
    </a>
  );
}

function DeployLine({ label, repo, d }: { label: string; repo: string; d: DeployInfo }) {
  return (
    <p className="break-words">
      <span className="text-slate-400">{label}: </span>
      <Sha repo={repo} sha={d.sha} /> · {d.state} {ago(d.statusAt)}
      {d.logUrl ? (
        <>
          {" · "}
          <a href={d.logUrl} target="_blank" rel="noopener noreferrer" className={link}>
            Vercel<span className="sr-only"> deployment (opens in new tab)</span>
          </a>
        </>
      ) : null}
    </p>
  );
}

function NoToken() {
  return (
    <p className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
      Deploys are not being read: <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> is not set (task 132).
    </p>
  );
}

/** The heading, explanation and Refresh button render at once; the GitHub read streams in below. */
export default function DeploysPage() {
  if (!getEnv().GITHUB_ROADMAP_TOKEN) return <NoToken />;

  return (
    <div className="space-y-6">
      <section aria-labelledby="deploys-heading" className="space-y-3">
        <h2 id="deploys-heading" className="text-xl font-semibold tracking-tight text-slate-100">
          Production deploys
        </h2>
        <p className="text-sm text-slate-300">
          Merged is not done until this is green. Read from GitHub&apos;s deployments (Vercel records each
          one there), cached five minutes. A repo with no GitHub deployments is read from the commit status
          Vercel posts on main instead, and its row says so.
        </p>
        <RefreshButton />
      </section>
      <Suspense fallback={<LoadingRow label="Reading production deploys from GitHub…" />}>
        <DeployRows />
      </Suspense>
    </div>
  );
}

/** The slow part: every repo's verdict (lib/ops/deploys.ts, one cached read). */
async function DeployRows() {
  const overview = await loadDeploysOverview();
  if (!overview.tokenSet) return <NoToken />;
  const red = overview.apps.filter((a) => a.tone === "red").length;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-slate-300">
          {red === 0 ? "No app is failed or behind main." : `${red} app${red === 1 ? " is" : "s are"} failed or behind main.`}
        </p>
        {overview.missingPermissions.length > 0 ? (
          <p role="alert" className="rounded-lg border border-amber-600 bg-amber-950/40 p-4 text-sm text-amber-100">
            The GitHub token cannot read {overview.missingPermissions.map((p) => p.toLowerCase()).join(" or ")}. Edit{" "}
            <span className="font-mono">GITHUB_ROADMAP_TOKEN</span> on GitHub (Fine-grained tokens, the roadmap token, Edit)
            and add{" "}
            {overview.missingPermissions.map((p, i) => (
              <span key={p}>
                {i > 0 ? " and " : null}
                <strong>Repository permissions, {p}: Read-only</strong>
              </span>
            ))}
            . No Vercel change is needed ({overview.missingPermissions.map((p) => (p === "Deployments" ? "task 141" : "task 152")).join(", ")}).
          </p>
        ) : null}
      </div>

      <ul className="space-y-2">
        {overview.apps.map((a) => (
          <li key={a.repo} className="rounded-lg border border-slate-800 px-3 py-3 text-sm">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-xs font-semibold ${TONE[a.tone] ?? TONE.grey}`}>
                {LABEL[a.state]}
                {a.state === "behind" && a.behindBy ? ` by ${a.behindBy}` : ""}
              </span>
              <span className="min-w-0 break-words font-semibold text-slate-100">{a.app.name}</span>
              <a
                href={a.source === "commit-status" ? `https://github.com/${a.repo}/commits/main` : `https://github.com/${a.repo}/deployments`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-xs text-slate-400 ${link}`}
              >
                {a.repo.split("/")[1]}
                <span className="sr-only">
                  {a.source === "commit-status" ? " commits on main" : " deployments"} on GitHub (opens in new tab)
                </span>
              </a>
              {a.source === "commit-status" ? <span className="text-xs text-slate-400">from Vercel&apos;s commit status</span> : null}
            </div>
            <div className="mt-2 space-y-1 text-slate-300">
              {a.latest ? <DeployLine label="Newest" repo={a.repo} d={a.latest} /> : null}
              {a.live ? <DeployLine label="Live" repo={a.repo} d={a.live} /> : null}
              {a.state === "failed" && !a.live ? (
                <p className="text-red-200">
                  {a.source === "commit-status"
                    ? "No Vercel success on main's newest five commits."
                    : "No successful production deploy in the last five."}
                </p>
              ) : null}
              {a.latest?.description && a.tone !== "green" ? <p className="break-words text-slate-400">{a.latest.description}</p> : null}
              {a.mainSha ? (
                <p>
                  <span className="text-slate-400">main: </span>
                  <Sha repo={a.repo} sha={a.mainSha} />
                </p>
              ) : null}
              {a.error ? <p className="break-words text-amber-200">{a.error}</p> : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
