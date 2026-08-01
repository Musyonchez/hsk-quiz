import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getCombinedWords, isLevelNumber } from "@/lib/queries";
import { VocabTable } from "@/components/VocabTable";
import { pillClasses } from "@/components/pill-classes";

export default async function CombinedLearnPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  await requireSession();
  const { level: levelParam } = await params;
  const levelNumber = Number(levelParam);
  if (!isLevelNumber(levelNumber)) notFound();

  const words = await getCombinedWords(levelNumber);
  if (words.length === 0) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12">
      <div>
        <Link
          href={`/hsk/${levelNumber}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← HSK {levelNumber}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          HSK {levelNumber} — Combined ({words.length} words)
        </h1>
      </div>

      <Link href={`/hsk/${levelNumber}/combined/quiz`} className={pillClasses("primary")}>
        Play quiz
      </Link>

      <VocabTable words={words} grouped />
    </main>
  );
}
