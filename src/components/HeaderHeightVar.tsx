"use client";

import { useEffect, useRef } from "react";

// Keeps the `--header-height` CSS custom property (globals.css) in sync with
// AppHeader's actual rendered height, so the quiz runners' sticky toolbars
// (`top-[var(--header-height)]`) sit exactly below it instead of relying on
// a hand-picked magic number — see docs/24-responsive-design-plan.md.
// AppHeader is a Server Component, so this wraps it rather than living
// inside it; a ResizeObserver on the wrapper (which has no layout impact of
// its own — a plain block div sized to its single child) catches every case
// that changes the header's height: the mobile-vs-desktop nav layout switch,
// a level list that grows, font loading, etc.
export function HeaderHeightVar({ children }: { children: React.ReactNode }) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const header = wrapperRef.current?.firstElementChild as HTMLElement | null;
    if (!header) return;

    const setVar = () => {
      document.documentElement.style.setProperty("--header-height", `${header.offsetHeight}px`);
    };
    setVar();

    const observer = new ResizeObserver(setVar);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  return <div ref={wrapperRef}>{children}</div>;
}
