import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getChapterWithWords, getLevelsOverview } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { getQuizNavigation } from "@/quiz/quiz-navigation";
import { QuizModeGate } from "@/components/quiz/QuizModeGate";

export default async function ChapterQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string; chapter: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  await requireSession();
  const { level: levelSlug, chapter: chapterParam } = await params;
  const { mode } = await searchParams;
  const initialMode =
    mode === "type" || mode === "meaning" || mode === "character" ? mode : null;
  const chapterNumber = Number(chapterParam);
  if (!isLevelSlug(levelSlug) || !Number.isInteger(chapterNumber)) notFound();
  // Canonicalize e.g. "05" -> "5" so a chapter never has two live URLs.
  if (String(chapterNumber) !== chapterParam) {
    redirect(`/hsk/${levelSlug}/chapter/${chapterNumber}/quiz`);
  }

  const [chapter, levels] = await Promise.all([
    getChapterWithWords(levelSlug, chapterNumber),
    getLevelsOverview(),
  ]);
  if (!chapter || chapter.words.length === 0) notFound();

  const backHref = `/hsk/${levelSlug}/chapter/${chapterNumber}`;
  const typeQuizKey = quizKeyFor({ levelSlug, chapterNumber });
  const meaningQuizKey = quizKeyFor({ levelSlug, chapterNumber, mode: "meaning" });
  const characterQuizKey = quizKeyFor({ levelSlug, chapterNumber, mode: "character" });
  const { next, another } = getQuizNavigation(
    { levelSlug, chapterNumber },
    levels.map((level) => ({
      slug: level.slug,
      name: level.name,
      chapterCount: level._count.chapters,
    }))
  );

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Chapter {chapter.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title}
        </h1>
      </div>

      {/* key forces a remount when the mode tab changes, so QuizModeGate's
          internal state doesn't go stale — see docs/32 §2. */}
      <QuizModeGate
        key={initialMode ?? "picker"}
        words={chapter.words}
        backHref={backHref}
        typeQuizKey={typeQuizKey}
        meaningQuizKey={meaningQuizKey}
        characterQuizKey={characterQuizKey}
        meaningVariant="match"
        characterMode
        allowDrillMissed
        nextQuiz={next}
        anotherQuiz={another}
        durationSeconds={600}
        initialMode={initialMode}
      />
    </main>
  );
}
