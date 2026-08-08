import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterDialogWords, getChapterWithWords } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { AllWordsTabs } from "@/components/AllWordsTabs";
import { QuizModeGate } from "@/components/QuizModeGate";

// docs/hold/25-chapter-all-words-plan.md's Type pinyin / Match meaning tabs, quizzing
// on a chapter's full dialog vocabulary instead of its curated New Words —
// same QuizModeGate/runners as the New Words quiz, just a different word set
// and its own "-all"/"-all-match" quizKeys so attempts never mix with New
// Words' leaderboard rows. Deliberately no Play Next/Play Another chaining
// yet (see the plan doc's Decisions) — All Words coverage is still partial
// across chapters.
export default async function ChapterAllWordsQuizPage({
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
  if (String(chapterNumber) !== chapterParam) {
    redirect(`/hsk/${levelSlug}/chapter/${chapterNumber}/all/quiz`);
  }

  const [chapter, dialogWords] = await Promise.all([
    getChapterWithWords(levelSlug, chapterNumber),
    getChapterDialogWords(levelSlug, chapterNumber),
  ]);
  if (!chapter || dialogWords.length === 0) notFound();

  const backHref = `/hsk/${levelSlug}/chapter/${chapterNumber}/all`;
  const typeQuizKey = quizKeyFor({ levelSlug, chapterNumber, wordSet: "all" });
  const meaningQuizKey = quizKeyFor({ levelSlug, chapterNumber, wordSet: "all", mode: "meaning" });
  const characterQuizKey = quizKeyFor({
    levelSlug,
    chapterNumber,
    wordSet: "all",
    mode: "character",
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Chapter {chapter.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title} — All Words
        </h1>
      </div>

      <AllWordsTabs
        baseHref={backHref}
        active={
          initialMode === "meaning" ? "meaning" : initialMode === "character" ? "character" : "type"
        }
      />

      {/* docs/32: All Words is scaled like Combined/Custom (a full dialog's
          vocabulary, not a curated ~15-word New Words list — e.g. HSK2 ch.6
          has 61 All Words vs 13 New Words), so it gets the one-word-at-a-
          time choice/candidate-picker flow, not the chapter-scale matching
          board. `key` forces a remount when the mode tab changes so
          QuizModeGate's internal state doesn't go stale (docs/32 §2). */}
      <QuizModeGate
        key={initialMode ?? "picker"}
        words={dialogWords}
        backHref={backHref}
        typeQuizKey={typeQuizKey}
        meaningQuizKey={meaningQuizKey}
        characterQuizKey={characterQuizKey}
        meaningVariant="choice"
        characterVariant="choice"
        allowDrillMissed
        durationSeconds={600}
        initialMode={initialMode}
      />
    </main>
  );
}
