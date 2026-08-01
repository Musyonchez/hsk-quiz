import Link from "next/link";
import { requireSession } from "@/lib/require-session";
import { getLevelsOverview, getMostRecentAttempt } from "@/lib/queries";

export default async function DashboardPage() {
  const user = await requireSession();
  const [levels, recentAttempt] = await Promise.all([
    getLevelsOverview(),
    getMostRecentAttempt(user.id),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-bold">HSK Quiz</h1>
        <p className="mt-1 text-muted-foreground">
          Type the pinyin for HSK 1 and HSK 2 vocabulary, by chapter or the
          full level.
        </p>
      </div>

      {recentAttempt && (
        <p className="text-sm text-muted-foreground">
          Last played: {recentAttempt.quizKey} — {recentAttempt.score}/
          {recentAttempt.total}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {levels.map((level) => (
          <Link
            key={level.id}
            href={`/hsk/${level.slug}`}
            className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <h2 className="text-xl font-semibold">{level.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {level._count.chapters} chapters
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
