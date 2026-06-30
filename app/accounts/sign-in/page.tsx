import type { Metadata } from "next";
import { IdentityMagicLinkForm } from "@/components/identity/magic-link-form";

export const metadata: Metadata = {
  title: "Sign in with WitUS",
  description: "One WitUS account for the whole ecosystem.",
};

// IdP login page (oidcProvider `loginPage`). Users land here from any ecosystem
// app's "Sign in with WitUS" flow, then are returned to the app after verifying.
export default function AccountsSignInPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-6 px-4 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Sign in with WitUS</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          One account for the whole WitUS ecosystem. We&apos;ll email you a sign-in link.
        </p>
      </div>
      <IdentityMagicLinkForm />
    </main>
  );
}
