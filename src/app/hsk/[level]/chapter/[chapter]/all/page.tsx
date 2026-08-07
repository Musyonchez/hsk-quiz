import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getChapterDialogLines, getChapterWithWords } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { AllWordsTabs } from "@/components/AllWordsTabs";

// docs/25-chapter-all-words-plan.md's addendum: the real "Dialog" tab — the
// chapter's actual textbook conversation (speaker, Chinese, pinyin, English
// per line, grouped into scenes), not just the vocabulary extracted from it
// (see the "All Words" tab / .../all/words). 404s if the chapter has no
// transcript data yet, same gating as the Learn page's "All Words" card.
export default async function ChapterDialogPage({
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

  const [chapter, lines] = await Promise.all([
    getChapterWithWords(levelSlug, chapterNumber),
    getChapterDialogLines(levelSlug, chapterNumber),
  ]);
  if (!chapter || lines.length === 0) notFound();

  const baseHref = `/hsk/${levelSlug}/chapter/${chapterNumber}/all`;

  // Group consecutive lines by dialogNumber for separate scene blocks —
  // `lines` is already in full-chapter reading order (DialogLine.order), so
  // a single pass is enough; no need to re-sort within each scene.
  const scenes: { dialogNumber: number; dialogLabel: string | null; lines: typeof lines }[] = [];
  for (const line of lines) {
    const currentScene = scenes.at(-1);
    if (currentScene && currentScene.dialogNumber === line.dialogNumber) {
      currentScene.lines.push(line);
    } else {
      scenes.push({ dialogNumber: line.dialogNumber, dialogLabel: line.dialogLabel, lines: [line] });
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Link
          href={`/hsk/${levelSlug}/chapter/${chapterNumber}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Chapter {chapter.number}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          Chapter {chapter.number} — {chapter.title} — Dialog
        </h1>
      </div>

      <AllWordsTabs baseHref={baseHref} active="dialog" />

      <div className="flex flex-col gap-8">
        {scenes.map((scene) => (
          <div key={scene.dialogNumber} className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Dialog {scene.dialogNumber}
              {scene.dialogLabel && <> — {scene.dialogLabel}</>}
            </h2>
            <div className="flex flex-col gap-2">
              {scene.lines.map((line) => (
                <div
                  key={line.order}
                  className="flex gap-2 rounded-lg border border-border bg-surface p-4"
                >
                  <span className="shrink-0 font-semibold text-accent">{line.speaker}:</span>
                  {/* Chinese/pinyin/English each on their own line, all
                      starting at the same left edge — right after the
                      speaker label, not the card's own left edge. */}
                  <div className="flex flex-col">
                    <span className="font-medium">{line.chinese}</span>
                    <span className="text-muted-foreground">{line.pinyin}</span>
                    <span className="mt-1 text-sm text-muted-foreground">{line.english}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
