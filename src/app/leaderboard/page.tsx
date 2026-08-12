import Link from "next/link";
import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getLevelWithChapters, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { QuizLinkCard } from "@/components/quiz/QuizLinkCard";

export default async function LeaderboardPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; mode?: string }>;
}) {
  await requireSession();
  const { level: levelSlug, mode: modeParam } = await searchParams;
  const mode =
    modeParam === "meaning" ? "meaning" : modeParam === "character" ? "character" : "type";

  if (!levelSlug) {
    const levels = await getLevelsOverview();
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Trophy size={22} className="text-muted-foreground" />
          Leaderboard
        </h1>
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
        <h1 className="mt-2 text-2xl font-bold">{level.name}</h1>
      </div>

      <div className="flex gap-2">
        <Link href={`/leaderboard?level=${levelSlug}&mode=type`} className={tabClasses(mode === "type")}>
          Type pinyin
        </Link>
        <Link
          href={`/leaderboard?level=${levelSlug}&mode=meaning`}
          className={tabClasses(mode === "meaning")}
        >
          English
        </Link>
        <Link
          href={`/leaderboard?level=${levelSlug}&mode=character`}
          className={tabClasses(mode === "character")}
        >
          Character
        </Link>
      </div>

      <QuizLinkCard
        href={`/leaderboard/${quizKeyFor({ levelSlug, mode })}`}
        eyebrow="Full level"
        title="Combined"
        icon={Trophy}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {level.chapters.map((chapter) => (
          <QuizLinkCard
            key={chapter.id}
            href={`/leaderboard/${quizKeyFor({ levelSlug, chapterNumber: chapter.number, mode })}`}
            eyebrow={`Chapter ${chapter.number}`}
            title={chapter.title}
          />
        ))}
      </div>
    </main>
  );
}
