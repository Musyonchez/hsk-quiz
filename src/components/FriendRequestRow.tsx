"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserBadge } from "./UserBadge";
import { pillClasses } from "./pill-classes";

export function FriendRequestRow({
  requestId,
  displayName,
}: {
  requestId: number;
  displayName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState<"accept" | "ignore" | null>(null);

  async function respond(action: "accept" | "ignore") {
    setSubmitting(action);
    await fetch(`/api/friends/requests/${requestId}/${action}`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3">
      <UserBadge displayName={displayName} />
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
    </div>
  );
}
