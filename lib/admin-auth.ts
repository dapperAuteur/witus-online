import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEnv } from "@/lib/env";

/**
 * The single owner check for everything under /admin.
 *
 * app/admin/layout.tsx gates every admin PAGE, but a layout does not run for a
 * route handler, so any file-serving route under /admin has to repeat the check
 * itself. Both call the helpers here so there is one definition of "is this the
 * owner" to keep in step with ADMIN_EMAIL.
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase() === getEnv().ADMIN_EMAIL.toLowerCase();
}

/** True when the current request carries a signed-in session for ADMIN_EMAIL. */
export async function isAdminRequest(): Promise<boolean> {
  const session = await getServerSession(authOptions);
  return isAdminEmail(session?.user?.email);
}
