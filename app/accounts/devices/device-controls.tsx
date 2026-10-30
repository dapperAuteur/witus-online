"use client";

import {
  createContext,
  useActionState,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { identityAuthClient } from "@/lib/identity/auth-client";
import {
  revokeDeviceAction,
  revokeOtherDevicesAction,
  type ActionResult,
} from "./actions";

const FOCUS =
  "focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";
const SECONDARY_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-md border border-slate-600 px-4 text-sm font-semibold text-slate-100 hover:border-slate-400 disabled:opacity-60 ${FOCUS}`;
const DANGER_BUTTON = `inline-flex min-h-11 items-center justify-center rounded-md bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-60 ${FOCUS}`;

function Result({
  state,
  focusRef,
}: {
  state: ActionResult | null;
  focusRef?: React.RefObject<HTMLParagraphElement | null>;
}) {
  if (!state) return null;
  return state.ok ? (
    <p ref={focusRef} tabIndex={-1} role="status" aria-live="polite" className={`text-sm text-emerald-300 ${FOCUS}`}>
      {state.data.message}
    </p>
  ) : (
    <p ref={focusRef} tabIndex={-1} role="alert" className={`text-sm text-rose-300 ${FOCUS}`}>
      {state.error}
    </p>
  );
}

/** Date-time in the viewer's own time zone. Server HTML shows UTC until the browser takes over. */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => `${new Date(iso).toISOString().slice(0, 16).replace("T", " ")} UTC`);
  useEffect(() => {
    setText(
      new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)),
    );
  }, [iso]);
  return (
    <time dateTime={iso} suppressHydrationWarning>
      {text}
    </time>
  );
}

const AnnounceContext = createContext<(message: string) => void>(() => {});

/**
 * Holds the page's success message for per-device sign-outs. A signed-out row disappears when the
 * page revalidates, taking its own button and message with it, so the message (and focus) live
 * here, above the list, where they survive the refresh.
 */
export function DeviceAnnouncer({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const ref = useRef<HTMLParagraphElement>(null);
  const announce = useCallback((text: string) => setMessage(text), []);
  useEffect(() => {
    if (message) ref.current?.focus();
  }, [message]);
  return (
    <AnnounceContext.Provider value={announce}>
      <p ref={ref} tabIndex={-1} role="status" aria-live="polite" className={`min-h-5 text-sm text-emerald-300 ${FOCUS}`}>
        {message}
      </p>
      {children}
    </AnnounceContext.Provider>
  );
}

/** "Sign out this device" for one OTHER device. `label` names the device for screen readers. */
export function SignOutDeviceButton({ sessionId, label }: { sessionId: string; label: string }) {
  const [state, formAction, pending] = useActionState(revokeDeviceAction, null);
  const announce = useContext(AnnounceContext);
  useEffect(() => {
    if (state?.ok) announce(`Signed out ${label}.`);
  }, [state, announce, label]);
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="sessionId" value={sessionId} />
      <button type="submit" disabled={pending} aria-label={`Sign out this device: ${label}`} className={SECONDARY_BUTTON}>
        {pending ? "Signing out…" : "Sign out this device"}
      </button>
      {state && !state.ok ? <Result state={state} /> : null}
    </form>
  );
}

/**
 * "Sign out all other devices", with an inline confirmation step (no window.confirm, per the
 * zero-alert rule). Focus moves to the confirm button when the step opens and back to the
 * trigger when it is cancelled.
 */
export function SignOutOtherDevicesButton({ otherCount }: { otherCount: number }) {
  const [state, formAction, pending] = useActionState(revokeOtherDevicesAction, null);
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const restoreFocus = useRef(false);
  const promptId = useId();

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      triggerRef.current?.focus();
    }
  }, [confirming]);

  // After the action answers, the confirmation step closes and its button disappears, so focus
  // goes to the result message instead of falling back to <body>.
  useEffect(() => {
    if (!state) return;
    setConfirming(false);
    resultRef.current?.focus();
  }, [state]);

  if (otherCount === 0 && !state) return null;

  return (
    <div className="flex flex-col items-start gap-3">
      {confirming ? (
        <form
          action={formAction}
          aria-labelledby={promptId}
          className="flex flex-col gap-3 rounded-lg border border-rose-500/40 bg-rose-950/30 p-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              restoreFocus.current = true;
              setConfirming(false);
            }
          }}
        >
          <p id={promptId} className="text-sm text-slate-100">
            Sign out {otherCount === 1 ? "the 1 other device" : `all ${otherCount} other devices`}? Each one
            will need a new email link to sign in with WitUS again. This device stays signed in.
          </p>
          <div className="flex flex-wrap gap-3">
            <button ref={confirmRef} type="submit" disabled={pending} className={DANGER_BUTTON}>
              {pending ? "Signing out…" : "Yes, sign out other devices"}
            </button>
            <button
              type="button"
              disabled={pending}
              className={SECONDARY_BUTTON}
              onClick={() => {
                restoreFocus.current = true;
                setConfirming(false);
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : otherCount > 0 ? (
        <button ref={triggerRef} type="button" className={DANGER_BUTTON} onClick={() => setConfirming(true)}>
          Sign out all other devices
        </button>
      ) : null}
      <Result state={state} focusRef={resultRef} />
    </div>
  );
}

/** Ends the WitUS session on the device in use, then returns to the WitUS sign-in page. */
export function SignOutThisDeviceButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={pending}
        className={SECONDARY_BUTTON}
        onClick={async () => {
          setPending(true);
          setFailed(false);
          const { error } = await identityAuthClient.signOut();
          if (error) {
            setPending(false);
            setFailed(true);
            return;
          }
          window.location.assign("/accounts/sign-in?next=/accounts/devices");
        }}
      >
        {pending ? "Signing out…" : "Sign out"}
      </button>
      {failed ? (
        <p role="alert" className="text-sm text-rose-300">
          Could not sign out. Try again.
        </p>
      ) : null}
    </div>
  );
}
