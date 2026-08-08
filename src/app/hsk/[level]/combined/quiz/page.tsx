import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getCombinedWords, getLevelName, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { getQuizNavigation } from "@/quiz/quiz-navigation";
import { QuizModeGate } from "@/components/QuizModeGate";

export default async function CombinedQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await params;
  if (!isLevelSlug(levelSlug)) notFound();
  const { mode } = await searchParams;
  const initialMode =
    mode === "type" || mode === "meaning" || mode === "character" ? mode : null;

  const [words, level, levels] = await Promise.all([
    getCombinedWords(levelSlug),
    getLevelName(levelSlug),
    getLevelsOverview(),
  ]);
  if (words.length === 0 || !level) notFound();

  const backHref = `/hsk/${levelSlug}/combined`;
  const typeQuizKey = quizKeyFor({ levelSlug });
  const meaningQuizKey = quizKeyFor({ levelSlug, mode: "meaning" });
  const characterQuizKey = quizKeyFor({ levelSlug, mode: "character" });
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
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← {level.name} Combined
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{level.name} — Combined Quiz</h1>
      </div>

      {/* key forces a remount when the mode tab changes, so QuizModeGate's
          internal state doesn't go stale — see docs/32 §2. */}
      <QuizModeGate
        key={initialMode ?? "picker"}
        words={words}
        backHref={backHref}
        typeQuizKey={typeQuizKey}
        meaningQuizKey={meaningQuizKey}
        characterQuizKey={characterQuizKey}
        meaningVariant="choice"
        characterVariant="choice"
        allowDrillMissed
        nextQuiz={next}
        anotherQuiz={another}
        durationSeconds={durationSeconds}
        initialMode={initialMode}
      />
    </main>
  );
}
