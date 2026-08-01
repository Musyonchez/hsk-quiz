"use client";

import { useState } from "react";

export function LogoutButton() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    // Real navigation, not router.push() — same reasoning as the login page:
    // a client-side push can replay a stale cached response from before logout.
    window.location.href = "/login";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loggingOut}
      className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
    >
      {loggingOut ? "Logging out…" : "Log out"}
    </button>
  );
}
