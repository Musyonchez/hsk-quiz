import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterDialogWords, getChapterWithWords } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { VocabTable } from "@/components/VocabTable";
import { AllWordsTabs } from "@/components/AllWordsTabs";

// docs/25-chapter-all-words-plan.md's "Dialog" tab — a chapter's full,
// independently-ordered dialog vocabulary, not merged/deduplicated against
// that chapter's New Words (see the Learn page). 404s if the chapter has no
// dialog data yet, same as the Learn page's "All Words" card only appearing
// once that data exists — no dead links either way.
export default async function ChapterAllWordsPage({
  params,
}: {
  params: Promise<{ level: string; chapter: string }>;
}) {
  await requireSession();
  const { level: levelSlug, chapter: chapterParam } = await params;
  const chapterNumber = Number(chapterParam);
  if (!isLevelSlug(levelSlug) || !Number.isInteger(chapterNumber)) notFound();
  if (String(chapterNumber) !== chapterParam) {
    redirect(`/hsk/${levelSlug}/chapter/${chapterNumber}/all`);
  }

  const [chapter, dialogWords] = await Promise.all([
    getChapterWithWords(levelSlug, chapterNumber),
    getChapterDialogWords(levelSlug, chapterNumber),
  ]);
  if (!chapter || dialogWords.length === 0) notFound();

  const baseHref = `/hsk/${levelSlug}/chapter/${chapterNumber}/all`;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Link
          href={`/hsk/${levelSlug}/chapter/${chapterNumber}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Chapter {chapter.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title} — All Words
        </h1>
      </div>

      <AllWordsTabs baseHref={baseHref} active="dialog" />

      <VocabTable words={dialogWords} />
    </main>
  );
}
