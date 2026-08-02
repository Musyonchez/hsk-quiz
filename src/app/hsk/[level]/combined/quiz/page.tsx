import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getCombinedWords, getLevelName, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { getQuizNavigation } from "@/quiz/quiz-navigation";
import { QuizRunner } from "@/components/QuizRunner";

export default async function CombinedQuizPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await params;
  if (!isLevelSlug(levelSlug)) notFound();

  const [words, level, levels] = await Promise.all([
    getCombinedWords(levelSlug),
    getLevelName(levelSlug),
    getLevelsOverview(),
  ]);
  if (words.length === 0 || !level) notFound();

  const backHref = `/hsk/${levelSlug}/combined`;
  const quizKey = quizKeyFor({ levelSlug });
  const { next, another } = getQuizNavigation(
    { levelSlug, chapterNumber: null },
    levels.map((l) => ({ slug: l.slug, name: l.name, chapterCount: l._count.chapters }))
  );
  // Combined quizzes cover the level's entire cumulative word list (177 for
  // HSK1, 335 for HSK2, 661 for HSK3), far more than a single chapter's
  // handful of words — the default 10-minute chapter-quiz clock isn't
  // enough time to type that many words, so each level gets a longer,
  // roughly count-scaled allowance instead.
  const combinedDurationMinutes: Record<string, number> = { "1": 20, "2": 30, "3": 40 };
  const durationSeconds = (combinedDurationMinutes[levelSlug] ?? 10) * 60;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← {level.name} Combined
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{level.name} — Combined Quiz</h1>
      </div>

      <QuizRunner
        words={words}
        backHref={backHref}
        quizKey={quizKey}
        nextQuiz={next}
        anotherQuiz={another}
        durationSeconds={durationSeconds}
      />
    </main>
  );
}
