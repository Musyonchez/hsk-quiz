// The stable identifier for one quiz (one chapter, or one level's combined
// list), used as Attempt.quizKey and in leaderboard URLs. Built from
// Level.slug (not Level.number) so HSK4A/4B stay distinguishable whenever
// they're wired back into ALL_LEVELS — see docs/14-phase6-plan.md.
export function quizKeyFor(target: { levelSlug: string; chapterNumber?: number }): string {
  const suffix =
    target.chapterNumber === undefined ? "combined" : `chapter${target.chapterNumber}`;
  return `hsk${target.levelSlug}-${suffix}`;
}

const QUIZ_KEY_PATTERN = /^hsk([1-6][ab]?)-(combined|chapter(\d+))$/;

export function parseQuizKey(
  quizKey: string
): { levelSlug: string; chapterNumber: number | null } | null {
  const match = QUIZ_KEY_PATTERN.exec(quizKey);
  if (!match) return null;
  return {
    levelSlug: match[1],
    chapterNumber: match[3] ? Number(match[3]) : null,
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
  return parsed.chapterNumber === null
    ? `${levelName} — Combined`
    : `${levelName} — Chapter ${parsed.chapterNumber}`;
}
