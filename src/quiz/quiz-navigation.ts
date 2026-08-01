// "Play Next" / "Play Another" targets for the results screen, per
// docs/06-quiz-mechanics.md's End of quiz section. Takes the already
// -fetched, ordered levels list (see getLevelsOverview) rather than
// querying the DB itself — same pattern as describeQuizKey in quiz-key.ts.
export type QuizNavTarget = { href: string; eyebrow: string; title: string };

type LevelSummary = { slug: string; name: string; chapterCount: number };

export function getQuizNavigation(
  current: { levelSlug: string; chapterNumber: number | null },
  levels: readonly LevelSummary[]
): { next: QuizNavTarget | null; another: QuizNavTarget } {
  const index = levels.findIndex((level) => level.slug === current.levelSlug);
  const level = levels[index];

  let next: QuizNavTarget | null = null;
  if (current.chapterNumber !== null && current.chapterNumber < level.chapterCount) {
    const n = current.chapterNumber + 1;
    next = {
      href: `/hsk/${level.slug}/chapter/${n}/quiz`,
      eyebrow: "Play Next",
      title: `${level.name} — Chapter ${n}`,
    };
  } else if (current.chapterNumber !== null) {
    // Last chapter in the level -> that level's combined quiz.
    next = {
      href: `/hsk/${level.slug}/combined/quiz`,
      eyebrow: "Play Next",
      title: `${level.name} — Combined`,
    };
  } else {
    // Currently on a combined quiz -> chapter 1 of the next level, if one
    // exists (e.g. HSK1 combined -> HSK2 chapter 1). No wrap past the last
    // live level — jumping an advanced player back to HSK1 isn't really
    // "next," so the card is simply omitted here.
    const nextLevel = levels[index + 1];
    if (nextLevel && nextLevel.chapterCount > 0) {
      next = {
        href: `/hsk/${nextLevel.slug}/chapter/1/quiz`,
        eyebrow: "Play Next",
        title: `${nextLevel.name} — Chapter 1`,
      };
    }
  }

  // "Suggest something else, not a recommendation engine" (per the doc) —
  // deterministically the next level's combined quiz, wrapping around the
  // list. With only one live level this wraps to itself; harmless edge case.
  const anotherLevel = levels[(index + 1) % levels.length];
  const another: QuizNavTarget = {
    href: `/hsk/${anotherLevel.slug}/combined/quiz`,
    eyebrow: "Play Another",
    title: `${anotherLevel.name} — Combined`,
  };

  return { next, another };
}
