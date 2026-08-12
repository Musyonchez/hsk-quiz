import { useState } from "react";

// Extracted from the four quiz runners' outer wrapper component (QuizRunner,
// ChoiceQuizRunner, CharacterQuizRunner, MatchQuizRunner) — each defined an
// identical runId/activeWords/activeTrackAttempt/activeDurationSeconds state
// bundle plus a handleDrillMissed function, differing only in which
// *RunnerInner component they fed the result to. docs/50 full-sweep audit §6.
//
// `runId` is the actual mechanism: the caller renders
// `<XxxRunnerInner key={runId} .../>`, so bumping it unmounts+remounts Inner
// from scratch — the simplest way to reset every bit of in-run state (word
// order, answers, timers, refs) for Replay/Drill missed without hand-
// resetting each one individually.
export function useQuizRunLifecycle<W>(
  words: W[],
  trackAttempt: boolean,
  durationSeconds: number | undefined
) {
  const [runId, setRunId] = useState(0);
  const [activeWords, setActiveWords] = useState(words);
  const [activeTrackAttempt, setActiveTrackAttempt] = useState(trackAttempt);
  const [activeDurationSeconds, setActiveDurationSeconds] = useState(durationSeconds);

  function onReplay() {
    setRunId((n) => n + 1);
  }

  // "Drill missed words" — a fresh run scoped to just the words missed last
  // time, never itself recorded as an attempt (activeTrackAttempt: false),
  // untimed regardless of whether the original run was.
  function onDrillMissed(missed: W[]) {
    setActiveWords(missed);
    setActiveTrackAttempt(false);
    setActiveDurationSeconds(undefined);
    setRunId((n) => n + 1);
  }

  return {
    runId,
    activeWords,
    activeTrackAttempt,
    activeDurationSeconds,
    onReplay,
    onDrillMissed,
  };
}
