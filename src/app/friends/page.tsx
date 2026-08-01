import { Users } from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { getFriendsData } from "@/lib/queries";
import { UserBadge } from "@/components/UserBadge";
import { FriendRequestRow } from "@/components/FriendRequestRow";
import { AddFriendForm } from "@/components/AddFriendForm";

export default async function FriendsPage() {
  const user = await requireSession();
  const { friends, incoming, outgoing } = await getFriendsData(user.id);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Users size={22} className="text-muted-foreground" />
          Friends
        </h1>
        <p className="mt-1 text-muted-foreground">
          Add a friend to compare scores on the friends leaderboard.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Add a friend</h2>
        <AddFriendForm />
      </section>

      {incoming.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Pending requests</h2>
          <div className="flex flex-col gap-2">
            {incoming.map((req) => (
              <FriendRequestRow
                key={req.requestId}
                requestId={req.requestId}
                displayName={req.user.displayName}
              />
            ))}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-muted-foreground">Waiting on</h2>
          <div className="flex flex-col gap-2">
            {outgoing.map((req) => (
              <div
                key={req.requestId}
                className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3"
              >
                <UserBadge displayName={req.user.displayName} />
                <span className="text-sm text-muted-foreground">waiting</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Your friends</h2>
        {friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="rounded-lg border border-border bg-surface px-4 py-3"
              >
                <UserBadge displayName={friend.displayName} />
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
