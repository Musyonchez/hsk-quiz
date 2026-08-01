import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getCombinedWords, getLevelName } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { VocabTable } from "@/components/VocabTable";
import { pillClasses } from "@/components/pill-classes";

export default async function CombinedLearnPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  await requireSession();
  const { level: levelSlug } = await params;
  if (!isLevelSlug(levelSlug)) notFound();

  const [words, level] = await Promise.all([
    getCombinedWords(levelSlug),
    getLevelName(levelSlug),
  ]);
  if (words.length === 0 || !level) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/hsk/${levelSlug}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {level.name}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {level.name} — Combined ({words.length} words)
        </h1>
      </div>

      <Link href={`/hsk/${levelSlug}/combined/quiz`} className={pillClasses("primary")}>
        Play quiz
      </Link>

      <VocabTable words={words} grouped />
    </main>
  );
}
