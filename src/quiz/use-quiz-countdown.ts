import { useEffect, useState } from "react";

export type FinishedState = "completed" | "gaveup" | null;

// Extracted from all four quiz runners — this interval effect and the
// "timeup" derivation were byte-identical (or near enough) in each one.
// docs/50 full-sweep audit §7.
//
// Ticks `secondsLeft` down once a second while a timed run is actually in
// progress; untimed runs never start the interval (`timed` false). Takes
// `finishedState` (just the two user-triggered end states, "completed"/
// "gaveup"/null) rather than the fully-derived `finished` value, since the
// latter is itself computed FROM this hook's `secondsLeft` output — an
// explicit `finishedState` sidesteps that circularity while still stopping
// the interval the render `secondsLeft` reaches 0 (checked directly below,
// not via a `finished` param).
export function useQuizCountdown({
  timed,
  started,
  paused,
  finishedState,
  durationSeconds,
}: {
  timed: boolean;
  started: boolean;
  paused: boolean;
  finishedState: FinishedState;
  durationSeconds: number | undefined;
}) {
  const [secondsLeft, setSecondsLeft] = useState(durationSeconds ?? 0);

  useEffect(() => {
    if (!timed || !started || finishedState !== null || secondsLeft === 0 || paused) return;
    const timer = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timed, started, paused, finishedState, secondsLeft]);

  // Same "timeup" derivation every runner needs alongside secondsLeft —
  // React's own guidance is to compute derivable state at render time
  // rather than mirror it into state via an effect.
  const finished: FinishedState | "timeup" =
    finishedState ?? (timed && started && secondsLeft === 0 ? "timeup" : null);

  return { secondsLeft, finished };
}
