"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { sectionLinks } from "@/components/headerLinks";

/**
 * Phone-width menu (below the `sm` breakpoint). At 320px the header cannot hold the wordmark plus
 * six links, so the page scrolled sideways (found 2026-10-29). The section links and Admin move in
 * here; "Apps" and "Sign in"/"Sign out" stay in the bar so the sign-in control is never hidden
 * (docs/shared-ui-ux-dx.md, "Sign-in control"). Closes on Escape, on a link tap, and on navigation.
 */
export function HeaderMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { status } = useSession();

  // Close on navigation (the header persists across routes). Adjusting state during render is
  // React's recommended pattern here, instead of an effect.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const itemClass =
    "flex items-center min-h-11 px-4 text-slate-200 hover:text-white hover:bg-slate-900 focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white";

  return (
    <div className="sm:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center min-h-11 px-2 hover:text-white transition-colors focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white rounded"
      >
        {open ? "Close" : "Menu"}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute left-0 right-0 top-full z-40 border-b border-slate-800 bg-slate-950"
      >
        <ul className="py-2">
          {sectionLinks.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className={itemClass} onClick={() => setOpen(false)}>
                {l.label}
              </Link>
            </li>
          ))}
          {status === "authenticated" && (
            <li>
              <Link href="/admin" className={itemClass} onClick={() => setOpen(false)}>
                Admin
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
