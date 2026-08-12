"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { authClient } from "@/lib/auth-client";

export function LogoutButton() {
  const [confirming, setConfirming] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // The confirmation dialog is portaled to document.body (below) rather than
  // rendered in place, so it isn't trapped inside AppHeader's backdrop-blur
  // — any element with a backdrop-filter/filter establishes a containing
  // block for position: fixed descendants (CSS Filter Effects spec), which
  // confined an in-place "fixed inset-0" overlay to the header's own ~64px
  // box instead of the viewport. Portals need document to exist, so this
  // only renders after mount — server-rendered output has no dialog markup.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // One-time mount detection for the portal target (document.body), which
    // can't exist before mount — not state this effect is meant to keep
    // syncing, so the usual "move it into an event handler" advice doesn't
    // apply here (same exception CustomQuizPicker.tsx documents).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // docs/42-audit-frontend-components.md §5: this dialog had no focus
  // management (no initial focus, nothing restored to the trigger button on
  // close) and no Escape handling — only click-outside and Cancel closed it.
  const triggerButtonRef = useRef<HTMLButtonElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) cancelButtonRef.current?.focus();
  }, [confirming]);

  function closeConfirm() {
    setConfirming(false);
    triggerButtonRef.current?.focus();
  }

  useEffect(() => {
    if (!confirming) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !loggingOut) closeConfirm();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [confirming, loggingOut]);

  async function handleLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    // Real navigation, not router.push() — same reasoning as the login page:
    // a client-side push can replay a stale cached response from before logout.
    window.location.href = "/login";
  }

  return (
    <>
      {/* stopPropagation on every handler here: AppHeader's mobile drawer
          (MobileNav.tsx) closes on any click that bubbles up through it,
          which is right for plain nav Links (navigation already fires
          before the unmount matters) but wrong for this button — closing
          the drawer unmounts LogoutButton itself, discarding `confirming`
          before the dialog ever gets a chance to render. Net effect before
          this fix: tapping "Log out" in the mobile menu did nothing
          visible. Portaled content still bubbles through the *React* tree
          (not the DOM tree) up to that same drawer wrapper, so every
          handler below needs it, not just the initial trigger. */}
      <button
        ref={triggerButtonRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        className="rounded-full bg-danger px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-danger/85"
      >
        Log out
      </button>

      {mounted &&
        confirming &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            onClick={(e) => {
              e.stopPropagation();
              if (!loggingOut) closeConfirm();
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="logout-confirm-heading"
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6 shadow-lg shadow-background/50"
            >
              <div>
                <h2 id="logout-confirm-heading" className="text-lg font-bold">
                  Log out?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You&rsquo;ll need to sign back in to keep playing.
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  ref={cancelButtonRef}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeConfirm();
                  }}
                  disabled={loggingOut}
                  className="rounded-full border border-border-strong px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                  }}
                  disabled={loggingOut}
                  className="rounded-full bg-danger px-4 py-1.5 text-sm font-medium text-accent-foreground transition-colors hover:bg-danger/85 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
