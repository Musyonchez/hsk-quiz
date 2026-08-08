import { UserBadge } from "./UserBadge";
import type { LeaderboardRow } from "@/lib/queries";

export function LeaderboardTable({
  rows,
  currentUserId,
}: {
  rows: LeaderboardRow[];
  currentUserId: number;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        No attempts yet — be the first to play this quiz.
      </p>
    );
  }

  return (
    // See VocabTable.tsx's VocabTableGroup for why the scroll wrapper/border
    // split (docs/hold/24-responsive-design-plan.md).
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-md text-sm">
        <thead className="bg-surface-raised text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Rank</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const isYou = row.userId === currentUserId;
            const percent = row.total > 0 ? Math.round((row.score / row.total) * 100) : 0;
            return (
              <tr
                key={row.userId}
                className={
                  isYou
                    ? "border-t border-border border-l-4 border-l-current-row bg-current-row-surface"
                    : "border-t border-border"
                }
              >
                <td className="px-3 py-2 font-semibold tabular-nums">{index + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <UserBadge displayName={row.displayName} />
                    {isYou && <span className="text-xs text-muted-foreground">(you)</span>}
                  </div>
                </td>
                <td className="px-3 py-2 tabular-nums">
                  {row.score}/{row.total} ({percent}%)
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
