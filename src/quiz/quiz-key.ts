// The stable identifier for one quiz (one chapter, or one level's combined
// list), used as Attempt.quizKey and in leaderboard URLs. Built from
// Level.slug (not Level.number) so HSK4A/4B stay distinguishable whenever
// they're wired back into ALL_LEVELS — see docs/14-phase6-plan.md.
//
// `mode` distinguishes the typing quiz from the pinyin->meaning quiz
// (docs/19-meaning-quiz-mode-plan.md) — a guessed multiple-choice/matching
// run isn't comparable difficulty to a fully-typed recall run, so tracked
// meaning-mode runs get a distinct "-match" suffixed key rather than
// sharing the typing mode's leaderboard rows.
export function quizKeyFor(target: {
  levelSlug: string;
  chapterNumber?: number;
  mode?: "type" | "meaning";
}): string {
  const suffix =
    target.chapterNumber === undefined ? "combined" : `chapter${target.chapterNumber}`;
  const modeSuffix = target.mode === "meaning" ? "-match" : "";
  return `hsk${target.levelSlug}-${suffix}${modeSuffix}`;
}

const QUIZ_KEY_PATTERN = /^hsk([1-6][ab]?)-(combined|chapter(\d+))(-match)?$/;

export function parseQuizKey(
  quizKey: string
): { levelSlug: string; chapterNumber: number | null; mode: "type" | "meaning" } | null {
  const match = QUIZ_KEY_PATTERN.exec(quizKey);
  if (!match) return null;
  return {
    levelSlug: match[1],
    chapterNumber: match[3] ? Number(match[3]) : null,
    mode: match[4] ? "meaning" : "type",
  };
}

// Turns a raw quizKey back into something readable ("HSK 3 — Chapter 5")
// for display, e.g. the dashboard's "Last played" line. Takes the already
// -fetched levels list rather than querying the DB itself, since every
// caller already has one in hand.
export function describeQuizKey(
  quizKey: string,
  levels: readonly { slug: string; name: string }[]
): string {
  const parsed = parseQuizKey(quizKey);
  if (!parsed) return quizKey;
  const levelName =
    levels.find((level) => level.slug === parsed.levelSlug)?.name ??
    `HSK ${parsed.levelSlug.toUpperCase()}`;
  const base =
    parsed.chapterNumber === null
      ? `${levelName} — Combined`
      : `${levelName} — Chapter ${parsed.chapterNumber}`;
  return parsed.mode === "meaning" ? `${base} (meaning)` : base;
}
