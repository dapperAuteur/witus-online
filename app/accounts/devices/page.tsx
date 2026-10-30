import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuthUrl } from "@/lib/identity/env";
import {
  currentIdentitySession,
  listConnectedApps,
  listDevices,
  type DeviceRow,
} from "@/lib/identity/device-sessions";
import { describeLocation, parseUserAgent } from "@/lib/identity/devices.mjs";
import {
  DeviceAnnouncer,
  LocalTime,
  SignOutDeviceButton,
  SignOutOtherDevicesButton,
  SignOutThisDeviceButton,
} from "./device-controls";

export const metadata: Metadata = {
  title: "Your devices",
  description: "See which devices are signed in to your WitUS account and sign out the ones you don't recognize.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const SELF = "/accounts/devices";

function deviceLabel(row: DeviceRow): string {
  const { browser, os } = parseUserAgent(row.userAgent);
  return `${browser} on ${os}`;
}

function Meta({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="text-slate-400 sm:w-36 sm:shrink-0">{term}</dt>
      <dd className="text-slate-200 break-words">{children}</dd>
    </div>
  );
}

/**
 * "Your devices" — every WitUS sign-in for the current user, with what we know about each device,
 * and controls to end the ones that aren't theirs (BAM, 2026-10-29). Lives on the IdP host
 * (accounts.witus.online): the better-auth session cookie is host-only there.
 */
export default async function DevicesPage() {
  // On production the IdP cookie exists only on the accounts host, so this page on www would
  // always look signed out. Send it to the accounts host. Local dev and previews serve both from
  // one origin and are left alone.
  const host = ((await headers()).get("host") ?? "").toLowerCase();
  const accountsOrigin = betterAuthUrl();
  if (process.env.VERCEL_ENV === "production" && host !== new URL(accountsOrigin).host) {
    redirect(`${accountsOrigin}${SELF}`);
  }

  const current = await currentIdentitySession();
  if (!current) redirect(`/accounts/sign-in?next=${encodeURIComponent(SELF)}`);

  const [devices, apps] = await Promise.all([
    listDevices(current.userId, current.sessionId),
    listConnectedApps(current.userId),
  ]);
  const otherCount = devices.filter((d) => !d.isCurrent).length;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-slate-400">WitUS Accounts</p>
      <h1 className="mb-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl">Your devices</h1>
      <p className="mb-3 max-w-2xl leading-relaxed text-slate-400">
        Every device and browser that is signed in to your WitUS account right now. If you don&apos;t
        recognize one, sign it out.
      </p>
      <p className="mb-10 max-w-2xl text-sm leading-relaxed text-slate-400">
        Signing out a device here stops it from using &ldquo;Sign in with WitUS&rdquo; without a new
        email link, but it does not sign it out of WitUS apps it is already signed in to, because each
        app keeps its own session.
      </p>

      <section aria-labelledby="devices-heading" className="mb-14">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <h2 id="devices-heading" className="text-xl font-bold text-white">
            Signed-in devices ({devices.length})
          </h2>
          <SignOutOtherDevicesButton otherCount={otherCount} />
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-400">
          Location is approximate. It is looked up from the IP address when the device signed in and
          can be off by a city or more, especially on mobile networks and VPNs.
        </p>
        <DeviceAnnouncer>
          <ul className="flex flex-col gap-4">
            {devices.map((d) => {
              const label = deviceLabel(d);
              const { deviceType } = parseUserAgent(d.userAgent);
              return (
                <li
                  key={d.id}
                  className={`rounded-xl border p-5 ${d.isCurrent ? "border-teal-500/60 bg-teal-950/20" : "border-slate-700 bg-slate-900/50"}`}
                >
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-white">{label}</h3>
                    {d.isCurrent ? (
                      <span className="rounded-full bg-teal-400/15 px-2 py-0.5 text-xs font-semibold text-teal-200">
                        This device
                      </span>
                    ) : null}
                  </div>
                  <dl className="mb-4 flex flex-col gap-2 text-sm">
                    {deviceType !== "unknown" ? (
                      <Meta term="Device type">{deviceType[0].toUpperCase() + deviceType.slice(1)}</Meta>
                    ) : null}
                    <Meta term="Approximate location">{describeLocation(d)}</Meta>
                    <Meta term="IP address">
                      {d.ipAddress ? <span className="font-mono">{d.ipAddress}</span> : "Not recorded"}
                    </Meta>
                    <Meta term="Signed in">
                      <LocalTime iso={d.createdAt.toISOString()} />
                    </Meta>
                    <Meta term="Last renewed">
                      <LocalTime iso={d.updatedAt.toISOString()} />
                    </Meta>
                    <Meta term="Expires">
                      <LocalTime iso={d.expiresAt.toISOString()} />
                    </Meta>
                    {d.userAgent ? (
                      <Meta term="Browser details">
                        <span className="text-xs text-slate-400">{d.userAgent}</span>
                      </Meta>
                    ) : null}
                  </dl>
                  {d.isCurrent ? <SignOutThisDeviceButton /> : <SignOutDeviceButton sessionId={d.id} label={label} />}
                </li>
              );
            })}
          </ul>
        </DeviceAnnouncer>
      </section>

      <section aria-labelledby="apps-heading">
        <h2 id="apps-heading" className="mb-2 text-xl font-bold text-white">
          Connected apps
        </h2>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-slate-400">
          WitUS apps you have signed in to with your WitUS account, and when each last received a
          sign-in from it. To sign out of an app, use that app&apos;s own Sign out.
        </p>
        {apps.length === 0 ? (
          <p className="text-sm text-slate-400">You haven&apos;t used WitUS to sign in to any app yet.</p>
        ) : (
          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-700 bg-slate-900/50">
            {apps.map((a) => (
              <li key={a.clientId} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-semibold text-white">{a.name}</span>
                <span className="text-sm text-slate-400">
                  Last sign-in <LocalTime iso={a.lastIssuedAt.toISOString()} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
