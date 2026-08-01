import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/require-session";
import { getCombinedWords, isLevelNumber } from "@/lib/queries";
import { QuizRunner } from "@/components/QuizRunner";

export default async function CombinedQuizPage({
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

  const backHref = `/hsk/${levelNumber}/combined`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 py-12">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← HSK {levelNumber} Combined
        </Link>
        <h1 className="mt-2 text-2xl font-bold">HSK {levelNumber} — Combined Quiz</h1>
      </div>

      <QuizRunner words={words} backHref={backHref} />
    </main>
  );
}
