import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterWithWords, isLevelNumber } from "@/lib/queries";
import { QuizRunner } from "@/components/QuizRunner";

export default async function ChapterQuizPage({
  params,
}: {
  params: Promise<{ level: string; chapter: string }>;
}) {
  await requireSession();
  const { level: levelParam, chapter: chapterParam } = await params;
  const levelNumber = Number(levelParam);
  const chapterNumber = Number(chapterParam);
  if (!isLevelNumber(levelNumber) || !Number.isInteger(chapterNumber)) notFound();

  const chapter = await getChapterWithWords(levelNumber, chapterNumber);
  if (!chapter || chapter.words.length === 0) notFound();

  const backHref = `/hsk/${levelNumber}/chapter/${chapterNumber}`;

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

      <QuizRunner words={chapter.words} backHref={backHref} />
    </main>
  );
}
