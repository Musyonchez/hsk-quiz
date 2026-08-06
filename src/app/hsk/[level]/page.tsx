import Link from "next/link";
import { notFound } from "next/navigation";
import { Layers } from "lucide-react";
import { requireSession } from "@/lib/require-session";
import { getCombinedWordCount, getLevelWithChapters } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { QuizLinkCard } from "@/components/QuizLinkCard";

export default async function LevelHubPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await params;
  if (!isLevelSlug(levelSlug)) notFound();

  const [level, combinedCount] = await Promise.all([
    getLevelWithChapters(levelSlug),
    getCombinedWordCount(levelSlug),
  ]);
  if (!level) notFound();

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{level.name}</h1>
      </div>

      <QuizLinkCard
        href={`/hsk/${levelSlug}/combined`}
        eyebrow="Full level"
        title={`Combined — ${combinedCount} words`}
        icon={Layers}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {level.chapters.map((chapter) => (
          <Link
            key={chapter.id}
            href={`/hsk/${levelSlug}/chapter/${chapter.number}`}
            className="rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
          >
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Chapter {chapter.number}
            </span>
            <h2 className="mt-1 font-semibold">{chapter.title}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {chapter._count.words} words
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
