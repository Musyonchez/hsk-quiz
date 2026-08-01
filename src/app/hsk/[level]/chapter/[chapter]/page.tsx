import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterWithWords } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { VocabTable } from "@/components/VocabTable";
import { pillClasses } from "@/components/pill-classes";

export default async function ChapterLearnPage({
  params,
}: {
  params: Promise<{ level: string; chapter: string }>;
}) {
  await requireSession();
  const { level: levelSlug, chapter: chapterParam } = await params;
  const chapterNumber = Number(chapterParam);
  if (!isLevelSlug(levelSlug) || !Number.isInteger(chapterNumber)) notFound();

  const chapter = await getChapterWithWords(levelSlug, chapterNumber);
  if (!chapter) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/hsk/${levelSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← HSK {levelSlug}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title}
        </h1>
      </div>

      <Link
        href={`/hsk/${levelSlug}/chapter/${chapterNumber}/quiz`}
        className={pillClasses("primary")}
      >
        Play quiz
      </Link>

      <VocabTable words={chapter.words} />
    </main>
  );
}
