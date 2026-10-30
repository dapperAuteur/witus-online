"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { auth } from "@/lib/identity/auth";
import { currentIdentitySession, ownedSessionToken } from "@/lib/identity/device-sessions";

export type ActionResult =
  | { ok: true; data: { message: string } }
  | { ok: false; error: string; code: string };

const PATH = "/accounts/devices";

/**
 * End one other device's WitUS session. The id comes from the browser, so it is only trusted
 * after `ownedSessionToken` finds it among the CURRENT user's sessions. better-auth's
 * revokeSession (POST /revoke-session, body `{ token }`, 1.6.23) checks ownership again itself.
 */
export async function revokeDeviceAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const sessionId = formData.get("sessionId");
  if (typeof sessionId !== "string" || !sessionId) {
    return { ok: false, error: "That device could not be found.", code: "BAD_REQUEST" };
  }
  try {
    const current = await currentIdentitySession();
    if (!current) {
      return { ok: false, error: "You are signed out. Sign in again to manage devices.", code: "UNAUTHORIZED" };
    }
    if (sessionId === current.sessionId) {
      return {
        ok: false,
        error: "This is the device you are using. Use Sign out to end it.",
        code: "CURRENT_SESSION",
      };
    }
    const owned = await ownedSessionToken(current.userId, sessionId);
    if (!owned) {
      // Already ended (another tab, expiry) or not this user's: the same answer either way.
      revalidatePath(PATH);
      return { ok: false, error: "That device is no longer signed in.", code: "NOT_FOUND" };
    }
    await auth.api.revokeSession({ headers: await headers(), body: { token: owned.token } });
    revalidatePath(PATH);
    return { ok: true, data: { message: "Signed out that device." } };
  } catch {
    return { ok: false, error: "Could not sign out that device. Try again.", code: "INTERNAL" };
  }
}

/**
 * End every WitUS session for this user except the current one, through better-auth's
 * revokeOtherSessions (POST /revoke-other-sessions, no body, 1.6.23).
 */
export async function revokeOtherDevicesAction(
  _prev: ActionResult | null,
  _formData: FormData,
): Promise<ActionResult> {
  try {
    const current = await currentIdentitySession();
    if (!current) {
      return { ok: false, error: "You are signed out. Sign in again to manage devices.", code: "UNAUTHORIZED" };
    }
    await auth.api.revokeOtherSessions({ headers: await headers() });
    revalidatePath(PATH);
    return { ok: true, data: { message: "Signed out all other devices." } };
  } catch {
    return { ok: false, error: "Could not sign out the other devices. Try again.", code: "INTERNAL" };
  }
}
