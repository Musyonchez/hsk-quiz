import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getAcceptedFriendUserIds, getLeaderboard, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { describeQuizKey, parseQuizKey } from "@/quiz/quiz-key";
import { LeaderboardTable } from "@/components/LeaderboardTable";

export default async function LeaderboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizKey: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await requireSession();
  const { quizKey } = await params;
  const { scope: scopeParam } = await searchParams;
  const scope = scopeParam === "friends" ? "friends" : "global";

  const parsed = parseQuizKey(quizKey);
  if (!parsed || !isLevelSlug(parsed.levelSlug)) notFound();

  const levels = await getLevelsOverview();
  const participantIds =
    scope === "friends" ? [...(await getAcceptedFriendUserIds(user.id)), user.id] : undefined;
  const rows = await getLeaderboard(quizKey, participantIds);

  const tabClasses = (active: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "bg-accent-secondary text-accent-secondary-foreground"
        : "border border-border-strong text-foreground hover:bg-surface-raised"
    }`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Leaderboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{describeQuizKey(quizKey, levels)}</h1>
      </div>

      <div className="flex gap-2">
        <Link href={`/leaderboard/${quizKey}?scope=global`} className={tabClasses(scope === "global")}>
          Global
        </Link>
        <Link href={`/leaderboard/${quizKey}?scope=friends`} className={tabClasses(scope === "friends")}>
          Friends
        </Link>
      </div>

      <LeaderboardTable rows={rows} currentUserId={user.id} />
    </main>
  );
}
