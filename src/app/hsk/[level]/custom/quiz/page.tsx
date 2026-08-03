import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getLevelName, getWordsForChapters } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { QuizRunner } from "@/components/QuizRunner";

function parseChapterNumbers(raw: string | undefined): number[] {
  if (!raw) return [];
  const numbers = raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(numbers)];
}

export default async function CustomQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ level: string }>;
  searchParams: Promise<{ chapters?: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await params;
  if (!isLevelSlug(levelSlug)) notFound();

  const { chapters } = await searchParams;
  const chapterNumbers = parseChapterNumbers(chapters);
  const backHref = "/custom-quiz";

  if (chapterNumbers.length < 2) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
        <div>
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            ← Custom Quiz
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Not enough chapters selected</h1>
        </div>
        <p className="text-muted-foreground">
          Pick at least 2 chapters from the custom quiz picker to build a quiz.
        </p>
      </main>
    );
  }

  const [level, words] = await Promise.all([
    getLevelName(levelSlug),
    getWordsForChapters(levelSlug, chapterNumbers),
  ]);
  if (!level || words.length === 0) notFound();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Custom Quiz
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {level.name} — Custom Quiz
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chapters {chapterNumbers.sort((a, b) => a - b).join(", ")}
        </p>
      </div>

      <QuizRunner
        words={words}
        backHref={backHref}
        trackAttempt={false}
        allowDrillMissed
      />
    </main>
  );
}
