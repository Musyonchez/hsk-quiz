"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserBadge } from "./UserBadge";
import { pillClasses } from "@/components/pill-classes";

export function FriendRequestRow({
  requestId,
  displayName,
}: {
  requestId: number;
  displayName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "ignore" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(action: "accept" | "ignore") {
    setError(null);
    setSubmitting(action);

    let res: Response;
    try {
      res = await fetch(`/api/friends/requests/${requestId}/${action}`, { method: "POST" });
    } catch {
      setSubmitting(null);
      setError("Couldn't reach the server — try again.");
      return;
    }

    setSubmitting(null);

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "That didn't work — try again.");
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
      <UserBadge displayName={displayName} />
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => respond("accept")}
            disabled={submitting !== null}
            className={pillClasses("primary", submitting !== null, "sm")}
          >
            Accept
          </button>
          <button
            type="button"
            onClick={() => respond("ignore")}
            disabled={submitting !== null}
            className={pillClasses("secondary", submitting !== null, "sm")}
          >
            Ignore
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </div>
  );
}
