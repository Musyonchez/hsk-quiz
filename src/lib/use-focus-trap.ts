"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Cycles Tab/Shift+Tab between a container's first and last focusable
// elements while `active` is true, so a keyboard user can't tab out of an
// open dialog into the page behind it (docs/56 finding 56-8, tracked since
// docs/52). Both LogoutButton's and CharacterBrowse's dialogs already had
// initial-focus, return-focus-on-close, and Escape-to-close (docs/42 §5) —
// this only adds the missing piece: containing Tab itself once open. It
// doesn't move focus on activation — each dialog already focuses its own
// first element (the Cancel/close button) before this hook's effect runs.
export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const container = containerRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => el.offsetParent !== null);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, containerRef]);
}
