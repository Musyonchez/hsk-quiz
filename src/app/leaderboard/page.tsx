import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getLevelWithChapters, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";

export default async function LeaderboardPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await searchParams;

  if (!levelSlug) {
    const levels = await getLevelsOverview();
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted-foreground">Pick a level, then a chapter or the combined quiz.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {levels.map((level) => (
            <Link
              key={level.id}
              href={`/leaderboard?level=${level.slug}`}
              className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-raised"
            >
              <h2 className="text-xl font-semibold">{level.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{level._count.chapters} chapters</p>
            </Link>
          ))}
        </div>
      </main>
    );
  }

  if (!isLevelSlug(levelSlug)) notFound();
  const level = await getLevelWithChapters(levelSlug);
  if (!level) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/leaderboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Leaderboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{level.name}</h1>
      </div>

      <Link
        href={`/leaderboard/${quizKeyFor({ levelSlug })}`}
        className="rounded-xl border border-border bg-surface p-6 transition-colors hover:border-border-strong hover:bg-surface-raised"
      >
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Full level</p>
        <p className="text-lg font-semibold">Combined</p>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2">
        {level.chapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/leaderboard/${quizKeyFor({ levelSlug, chapterNumber: chapter.number })}`}
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Chapter {chapter.number}
            </p>
            <p className="font-semibold">{chapter.title}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
