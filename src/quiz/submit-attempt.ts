// Shared by all four quiz runners' attempt-submission effect — previously
// copy-pasted near-verbatim in each of QuizRunner/ChoiceQuizRunner/
// CharacterQuizRunner/MatchQuizRunner (docs/42-audit-frontend-components.md
// §2). Extracted here to fix one real bug that existed identically in all
// four copies: the POST to /api/attempts was never checked for `res.ok`
// before chaining into the best/leaderboard fetches, so a failed save (a
// DB hiccup, an auth session race) was silently swallowed — the player saw
// the normal results screen with no indication their score wasn't recorded
// (docs/44-audit-quiz-ux-gaps.md, docs/42 §3). `saveFailed` on the returned
// result lets each runner show a "couldn't save" note instead of pretending
// everything worked.

function averagePercent(rows: { score: number; total: number }[]): number | null {
  if (rows.length === 0) return null;
  const percents = rows.map((row) => (row.total > 0 ? (row.score / row.total) * 100 : 0));
  return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
}

export type AttemptSubmissionResult = {
  bestPercent: number | null;
  avgGlobalPercent: number | null;
  avgFriendPercent: number | null;
  saveFailed: boolean;
};

const FAILED_RESULT: AttemptSubmissionResult = {
  bestPercent: null,
  avgGlobalPercent: null,
  avgFriendPercent: null,
  saveFailed: true,
};

export async function submitAttempt(
  quizKey: string,
  score: number,
  total: number,
  durationSeconds: number
): Promise<AttemptSubmissionResult> {
  const encodedKey = encodeURIComponent(quizKey);

  try {
    const postRes = await fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quizKey, score, total, durationSeconds }),
    });
    if (!postRes.ok) return FAILED_RESULT;

    const [best, globalRows, friendRows]: [
      { score: number; total: number } | null,
      { score: number; total: number }[],
      { score: number; total: number }[],
    ] = await Promise.all([
      fetch(`/api/attempts/best?quizKey=${encodedKey}`).then((res) => (res.ok ? res.json() : null)),
      fetch(`/api/leaderboard?quizKey=${encodedKey}&scope=global`).then((res) =>
        res.ok ? res.json() : []
      ),
      fetch(`/api/leaderboard?quizKey=${encodedKey}&scope=friends`).then((res) =>
        res.ok ? res.json() : []
      ),
    ]);

    return {
      bestPercent: best && best.total > 0 ? Math.round((best.score / best.total) * 100) : null,
      avgGlobalPercent: averagePercent(globalRows),
      avgFriendPercent: averagePercent(friendRows),
      saveFailed: false,
    };
  } catch (err) {
    console.error("Failed to record quiz attempt", err);
    return FAILED_RESULT;
  }
}
