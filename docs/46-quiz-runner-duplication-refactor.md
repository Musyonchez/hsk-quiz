# Extracting the quiz runners' shared `ToolbarButton` and results screen

Closes the last held-over item from the project audit
([40-project-audit-overview.md](40-project-audit-overview.md) #20,
[42-audit-frontend-components.md](42-audit-frontend-components.md) §2) — the helper-function half
of the duplication (`shuffle`, `averagePercent`) was already extracted into
[src/quiz/submit-attempt.ts](../src/quiz/submit-attempt.ts) in an earlier pass; this closes the
remaining `ToolbarButton` + results-screen JSX half, plus `shuffle` (missed in that earlier pass —
still byte-identical across all four files, same low-risk shape as `averagePercent` was).

## What's duplicated, confirmed by direct comparison

Read all four runners side by side (`QuizRunner.tsx`, `ChoiceQuizRunner.tsx`,
`CharacterQuizRunner.tsx`, `MatchQuizRunner.tsx`) rather than trusting the audit's description
secondhand:

- **`shuffle<T>(items)`** — byte-identical Fisher–Yates in all four files.
- **`ToolbarButton`** — near-identical in all four. Three (`ChoiceQuizRunner`,
  `CharacterQuizRunner`, `MatchQuizRunner`) support `variant: "default" | "danger"`; `QuizRunner`'s
  copy additionally supports `"active"` (bronze/accent-secondary styling for the Hard-mode toggle,
  the one runner with that feature). Genuine drift, not just copy-paste — the shared version needs
  to support all three variants; the three runners that never pass `"active"` are unaffected by its
  existence.
- **The "finished" results-screen JSX** — comparing all four blocks directly: **byte-identical**
  except for one variable name (`effectiveQuizKey` in `QuizRunner`, since Hard mode needs a
  suffixed quiz key; plain `quizKey` in the other three) and — since this session's `saveFailed`
  fix — the exact same added message block in all four. Every prop the JSX reads (`heading`,
  `percent`, `score`, `total`, `bestPercent`, `avgGlobalPercent`, `avgFriendPercent`, `saveFailed`,
  `trackAttempt`, the resolved quiz key, `backHref`, `allowDrillMissed`, `missedWords`, `onReplay`,
  `onDrillMissed`, `showStats` + its toggle, `nextQuiz`, `anotherQuiz`) is already computed
  per-runner before the `if (finished)` branch — the *logic* that produces `missedWords` differs
  per mode (three different definitions of "missed"), but by the time it reaches the JSX it's just
  a `QuizWord[]`. This is exactly what makes it safe to extract: the varying part (how "missed" is
  computed) stays in each runner; only the fixed part (how it's displayed) moves out.

## Approach

Two new files, both presentational — no state, no effects, no data fetching:

- **`src/components/ToolbarButton.tsx`** — the widened three-variant version (all three prior
  behaviors preserved: `default`/`danger` render the same as before in every runner, `active` only
  ever gets passed by `QuizRunner`, so nothing about the other three runners' rendering changes).
- **`src/components/QuizResultsScreen.tsx`** — takes exactly the props listed above, renders exactly
  today's JSX. Each runner keeps computing `heading`/`percent`/`missedWords`/etc. itself (mode-
  specific logic, correctly *not* being unified) and passes the results to this component instead
  of inlining the JSX.

`shuffle<T>` moves into `src/quiz/shuffle.ts` (a plain, framework-free util, matching where
`averagePercent`-style helpers already live under `src/quiz/`), imported by whichever runners still
call it (not `MatchQuizRunner`, which uses it only inside two `useState` lazy initializers for its
two independently-shuffled boards — still applicable, same import).

**What does *not* change:** each runner's own state, effects, submission logic (`submitAttempt`
calls stay exactly where they are, per-runner, since docs/42 already extracted the actually-shared
part of that), the mid-quiz toolbar/table/input JSX (genuinely different per mode — a table with a
pinyin input vs. a multiple-choice options grid vs. a matching board — not a duplication target),
and the sticky-bar layout quirks flagged elsewhere (docs/44's `ChoiceQuizRunner` sticky-bar note) —
out of scope here, not touched.

## Verification

- `tsc --noEmit` + `eslint .` clean.
- Live check of all four modes end-to-end after the extraction: start a quiz, answer questions,
  finish (both "completed" and "give up" paths), confirm the results screen (heading, percent,
  best/avg lines, Replay, Drill missed words where applicable, Stats toggle, Back, leaderboard link,
  missed-words table) renders identically to before in each of the four modes — including
  `QuizRunner`'s Hard-mode toggle still showing the `"active"` `ToolbarButton` variant correctly.
- Confirm `saveFailed`'s message still appears correctly (can force it by temporarily breaking the
  POST, same technique used to verify it originally).
