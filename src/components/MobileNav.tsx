"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

// The <md drawer for AppHeader's nav links (docs/24-responsive-design-plan.md).
// AppHeader stays a Server Component (it fetches the session + level list), so
// this client component only owns the open/closed toggle — the actual link
// markup is passed in as `children`, pre-rendered server-side same as the
// desktop nav.
export function MobileNav({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-20 border-b border-border bg-surface px-6 py-4 shadow-lg">
          {/* Closes on any click inside — link navigation or the logout
              button both make sense to close the drawer for. */}
          <div className="flex flex-col items-start gap-3" onClick={() => setOpen(false)}>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
