import "server-only";

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Server-side Cloudflare Turnstile verification.
 *
 * Dev-mode contract: if TURNSTILE_SECRET_KEY is not set we log a warning and
 * return true so local dev works without Cloudflare. In production the key
 * is required and a missing/invalid token returns false.
 */
export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY missing. Skipping verification (dev mode)."
    );
    return true;
  }

  if (!token) return false;

  const body = new URLSearchParams({
    secret,
    response: token,
  });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, {
      method: "POST",
      body,
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn(
        `[turnstile] verify endpoint returned ${res.status}; rejecting.`
      );
      return false;
    }
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      console.warn(
        "[turnstile] verification failed:",
        data["error-codes"]?.join(", ") ?? "no error codes"
      );
    }
    return data.success === true;
  } catch (err) {
    console.warn("[turnstile] verify threw:", err);
    return false;
  }
}

/** The FormData key Turnstile auto-injects into forms containing the widget. */
export const TURNSTILE_FORM_FIELD = "cf-turnstile-response";
