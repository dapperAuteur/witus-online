import "server-only";
import { sendMail } from "@/lib/mailgun";

/** From address for WitUS Accounts mail, via the shared mg.witus.online domain. */
function accountsFrom(): string {
  const domain = process.env.MAILGUN_DOMAIN ?? "witus.online";
  return `WitUS Accounts <accounts@${domain}>`;
}

/** Send a "Sign in with WitUS" magic link. In dev (no Mailgun env) sendMail logs. */
export async function sendIdentityMagicLink(email: string, url: string): Promise<void> {
  const result = await sendMail({
    to: email,
    from: accountsFrom(),
    subject: "Your WitUS sign-in link",
    text: `Sign in to your WitUS account:\n${url}\n\nThis link expires shortly. If you didn't request it, ignore this email.`,
  });
  if (!result.ok) {
    throw new Error(`[witus-accounts] magic-link send failed: ${result.detail}`);
  }
}
