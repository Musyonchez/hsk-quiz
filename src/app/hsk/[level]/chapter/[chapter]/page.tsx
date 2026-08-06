import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  // Canonicalize e.g. "05" -> "5" so a chapter never has two live URLs.
  if (String(chapterNumber) !== chapterParam) {
    redirect(`/hsk/${levelSlug}/chapter/${chapterNumber}`);
  }

  const chapter = await getChapterWithWords(levelSlug, chapterNumber);
  if (!chapter) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Link
          href={`/hsk/${levelSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {chapter.level.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title}
        </h1>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href={`/hsk/${levelSlug}/chapter/${chapterNumber}/quiz?mode=type`}
          className={pillClasses("primary")}
        >
          Type pinyin
        </Link>
        <Link
          href={`/hsk/${levelSlug}/chapter/${chapterNumber}/quiz?mode=meaning`}
          className={pillClasses("secondary")}
        >
          Match meaning
        </Link>
      </div>

      <VocabTable words={chapter.words} />
    </main>
  );
}
