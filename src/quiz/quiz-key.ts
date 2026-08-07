// The stable identifier for one quiz (one chapter, or one level's combined
// list), used as Attempt.quizKey and in leaderboard URLs. Built from
// Level.slug (not Level.number) so HSK4A/4B stay distinguishable whenever
// they're wired back into ALL_LEVELS — see docs/14-phase6-plan.md.
//
// `mode` distinguishes the typing quiz from the pinyin->meaning quiz
// (docs/19-meaning-quiz-mode-plan.md) and the meaning->character quiz
// (docs/27-character-quiz-plan.md) — a guessed multiple-choice/matching run
// isn't comparable difficulty to a fully-typed recall run, and reading a
// character isn't the same skill as recalling its meaning, so each tracked
// non-typing mode gets its own suffixed key rather than sharing rows.
//
// `wordSet` distinguishes a chapter's curated New Words (default) from its
// full dialog vocabulary, "All Words" (docs/25-chapter-all-words-plan.md) —
// same reasoning as `mode`: an All Words run draws from a different, larger
// word pool than New Words, so it isn't a fair comparison and gets its own
// "-all" suffixed key instead of sharing New Words' leaderboard rows.
export function quizKeyFor(target: {
  levelSlug: string;
  chapterNumber?: number;
  mode?: "type" | "meaning" | "character";
  wordSet?: "new" | "all";
}): string {
  const suffix =
    target.chapterNumber === undefined ? "combined" : `chapter${target.chapterNumber}`;
  const wordSetSuffix = target.wordSet === "all" ? "-all" : "";
  const modeSuffix =
    target.mode === "meaning" ? "-match" : target.mode === "character" ? "-char" : "";
  return `hsk${target.levelSlug}-${suffix}${wordSetSuffix}${modeSuffix}`;
}

// Appends the "hard mode" suffix (docs/28-progressive-difficulty-plan.md —
// the optional "hide a second column" toggle) onto an already-built quizKey
// at run-start, rather than adding a `difficulty` field to `quizKeyFor`
// itself: the toggle is a per-run player choice made on the pre-quiz
// screen, not a property of which quiz this is, so it's layered on here
// instead of threaded through every `quizKeyFor` call site.
export function withHardSuffix(quizKey: string, hard: boolean): string {
  return hard ? `${quizKey}-hard` : quizKey;
}

const QUIZ_KEY_PATTERN =
  /^hsk([1-6][ab]?)-(combined|chapter(\d+))(-all)?(-match|-char)?(-hard)?$/;

export function parseQuizKey(quizKey: string): {
  levelSlug: string;
  chapterNumber: number | null;
  wordSet: "new" | "all";
  mode: "type" | "meaning" | "character";
  difficulty: "normal" | "hard";
} | null {
  const match = QUIZ_KEY_PATTERN.exec(quizKey);
  if (!match) return null;
  return {
    levelSlug: match[1],
    chapterNumber: match[3] ? Number(match[3]) : null,
    wordSet: match[4] ? "all" : "new",
    mode: match[5] === "-match" ? "meaning" : match[5] === "-char" ? "character" : "type",
    difficulty: match[6] ? "hard" : "normal",
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
  const tags = [
    parsed.wordSet === "all" ? "all words" : null,
    parsed.mode === "meaning" ? "meaning" : parsed.mode === "character" ? "character" : null,
    parsed.difficulty === "hard" ? "hard" : null,
  ].filter((tag): tag is string => tag !== null);
  return tags.length > 0 ? `${base} (${tags.join(", ")})` : base;
}
