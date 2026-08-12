// Fisher–Yates shuffle — used by every quiz runner (word order pre-start,
// or MatchQuizRunner's two independently-shuffled boards). Was duplicated
// byte-for-byte in all four runner components; extracted here alongside
// submit-attempt.ts's averagePercent, closing the last piece of docs/40's
// #20 duplication finding (see docs/46-quiz-runner-duplication-refactor.md).
export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
