import { useEffect, useRef, useState } from "react";
import { submitAttempt } from "./submit-attempt";

// Extracted from all four quiz runners' *RunnerInner components — this
// effect (and the five bits of state it feeds) was duplicated near-verbatim
// in each one, differing only in whether the caller passes a hard-suffixed
// `quizKey` or the bare one. docs/50 full-sweep audit §7.
//
// Records the finished attempt exactly once per run — `submittedRef` is a
// ref (not state) specifically so re-renders don't re-fire it, but it does
// reset on a fresh mount, which is what Replay/Drill relies on (the parent
// remounts *RunnerInner with a new `key`, see use-quiz-run-lifecycle.ts).
export function useQuizAttemptSubmission({
  finished,
  trackAttempt,
  quizKey,
  score,
  total,
  secondsLeft,
  durationSeconds,
}: {
  finished: string | null;
  trackAttempt: boolean;
  quizKey: string | undefined;
  score: number;
  total: number;
  secondsLeft: number;
  durationSeconds: number | undefined;
}) {
  const [bestPercent, setBestPercent] = useState<number | null>(null);
  const [avgGlobalPercent, setAvgGlobalPercent] = useState<number | null>(null);
  const [avgFriendPercent, setAvgFriendPercent] = useState<number | null>(null);
  // docs/44-audit-quiz-ux-gaps.md / docs/42-audit-frontend-components.md §3:
  // the attempt POST used to be unchecked for res.ok, so a failed save was
  // silently swallowed — the player saw a normal results screen with no clue
  // their score wasn't recorded. submitAttempt (src/quiz/submit-attempt.ts)
  // now reports that back explicitly.
  const [saveFailed, setSaveFailed] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (!finished || submittedRef.current || !trackAttempt || !quizKey) return;
    submittedRef.current = true;
    const elapsedSeconds = (durationSeconds ?? 0) - secondsLeft;

    submitAttempt(quizKey, score, total, elapsedSeconds).then((result) => {
      setBestPercent(result.bestPercent);
      setAvgGlobalPercent(result.avgGlobalPercent);
      setAvgFriendPercent(result.avgFriendPercent);
      setSaveFailed(result.saveFailed);
    });
  }, [finished, trackAttempt, quizKey, score, total, secondsLeft, durationSeconds]);

  return { bestPercent, avgGlobalPercent, avgFriendPercent, saveFailed };
}

// Default Stats to open if anything was missed, closed on a perfect run —
// set once when the quiz finishes, not re-derived on every render, so a
// manual toggle afterward (via the Stats/Hide stats button) sticks. Was its
// own duplicated statsDefaultSetRef+effect in every runner alongside the
// submission effect above.
export function useStatsVisibility({
  finished,
  score,
  total,
}: {
  finished: string | null;
  score: number;
  total: number;
}) {
  const [showStats, setShowStats] = useState(false);
  const statsDefaultSetRef = useRef(false);

  useEffect(() => {
    if (!finished || statsDefaultSetRef.current) return;
    statsDefaultSetRef.current = true;
    setShowStats(score < total);
  }, [finished, score, total]);

  return { showStats, toggleStats: () => setShowStats((v) => !v) };
}
