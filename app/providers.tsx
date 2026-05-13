"use client";

import { SessionProvider } from "next-auth/react";

// Wraps the app in next-auth's SessionProvider so client components can call
// useSession() to conditionally render auth-aware UI (Header sign-in link,
// admin sign-out button). Server Components remain Server Components — they
// can still be passed as children inside this client subtree.
export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
