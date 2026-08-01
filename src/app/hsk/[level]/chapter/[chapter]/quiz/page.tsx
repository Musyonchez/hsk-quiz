import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterWithWords } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { quizKeyFor } from "@/quiz/quiz-key";
import { QuizRunner } from "@/components/QuizRunner";

export default async function ChapterQuizPage({
  params,
}: {
  params: Promise<{ level: string; chapter: string }>;
}) {
  await requireSession();
  const { level: levelSlug, chapter: chapterParam } = await params;
  const chapterNumber = Number(chapterParam);
  if (!isLevelSlug(levelSlug) || !Number.isInteger(chapterNumber)) notFound();
  // Canonicalize e.g. "05" -> "5" so a chapter never has two live URLs.
  if (String(chapterNumber) !== chapterParam) {
    redirect(`/hsk/${levelSlug}/chapter/${chapterNumber}/quiz`);
  }

  const chapter = await getChapterWithWords(levelSlug, chapterNumber);
  if (!chapter || chapter.words.length === 0) notFound();

  const backHref = `/hsk/${levelSlug}/chapter/${chapterNumber}`;
  const quizKey = quizKeyFor({ levelSlug, chapterNumber });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Chapter {chapter.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title}
        </h1>
      </div>

      <QuizRunner words={chapter.words} backHref={backHref} quizKey={quizKey} />
    </main>
  );
}
