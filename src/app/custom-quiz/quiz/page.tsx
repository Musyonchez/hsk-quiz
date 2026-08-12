import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/require-session";
import { getLevelName, getWordsForSelections, type CustomQuizSelection } from "@/lib/queries";
import { isLevelSlug } from "@/lib/hsk-level";
import { QuizModeGate } from "@/components/quiz/QuizModeGate";

function parseSelections(raw: string | undefined): CustomQuizSelection[] {
  if (!raw) return [];
  const selections: CustomQuizSelection[] = [];
  for (const part of raw.split(",")) {
    const [levelSlug, spec] = part.split(":");
    if (!levelSlug || !spec || !isLevelSlug(levelSlug)) continue;
    if (spec === "combined") {
      selections.push({ levelSlug, combined: true, chapterNumbers: [] });
      continue;
    }
    const chapterNumbers = [
      ...new Set(
        spec
          .split("-")
          .map((n) => Number(n))
          .filter((n) => Number.isInteger(n) && n > 0)
      ),
    ];
    if (chapterNumbers.length > 0) {
      selections.push({ levelSlug, combined: false, chapterNumbers });
    }
  }
  return selections;
}

// A pick is only usable on its own if it's "combined" (the whole level) or
// 2+ chapters — a single chapter alone is already the existing per-chapter
// quiz page. That minimum only applies when it's the *only* level picked;
// once 2+ levels are involved, even one chapter from each is a genuinely
// new combination worth quizzing on. See docs/17.
function isUsable(selections: CustomQuizSelection[]): boolean {
  if (selections.length === 0) return false;
  if (selections.length === 1) {
    const [only] = selections;
    return only.combined || only.chapterNumbers.length >= 2;
  }
  return true;
}

export default async function CrossLevelCustomQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ picks?: string; mode?: string }>;
}) {
  await requireSession();
  const { picks, mode } = await searchParams;
  const initialMode =
    mode === "type" || mode === "meaning" || mode === "character" ? mode : null;
  const selections = parseSelections(picks);
  const backHref = "/custom-quiz";

  if (!isUsable(selections)) {
    return (
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
        <div>
          <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
            ← Custom Quiz
          </Link>
          <h1 className="mt-2 text-2xl font-bold">Not enough selected</h1>
        </div>
        <p className="text-muted-foreground">
          Pick combined or 2+ chapters within a level, or add chapters from another level too.
        </p>
      </main>
    );
  }

  const [words, levelNames] = await Promise.all([
    getWordsForSelections(selections),
    Promise.all(selections.map((s) => getLevelName(s.levelSlug))),
  ]);
  if (words.length === 0) notFound();

  const summary = selections
    .map((selection, i) => {
      const name = levelNames[i]?.name ?? `HSK ${selection.levelSlug.toUpperCase()}`;
      return selection.combined
        ? `${name} (combined)`
        : `${name} ch. ${[...selection.chapterNumbers].sort((a, b) => a - b).join(", ")}`;
    })
    .join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          ← Custom Quiz
        </Link>
        <h1 className="mt-2 text-2xl font-bold">Custom Quiz</h1>
        <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
      </div>

      {/* key forces a remount when the mode tab changes, so QuizModeGate's
          internal state doesn't go stale — see docs/32 §2. */}
      <QuizModeGate
        key={initialMode ?? "picker"}
        words={words}
        backHref={backHref}
        trackAttempt={false}
        meaningVariant="choice"
        characterMode
        allowDrillMissed
        initialMode={initialMode}
      />
    </main>
  );
}
