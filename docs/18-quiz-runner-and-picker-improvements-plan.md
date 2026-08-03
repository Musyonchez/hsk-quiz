# QuizRunner + Custom Quiz Picker Improvements Plan

Written before any code, per the same discipline as [14-phase6-plan.md](14-phase6-plan.md) /
[17-custom-chapter-quiz-plan.md](17-custom-chapter-quiz-plan.md).

## Scope

Five independent improvements requested together, covering `QuizRunner` (used everywhere:
chapter/combined/custom quizzes) and `CustomQuizPicker` (the `/custom-quiz` picker page only).

## 1. Drill missed words

After finishing a quiz with missed words, offer a button that starts a new quiz containing
*only* those missed words — for **large word-pool quizzes only**: the per-level Combined quiz
and both Custom Quiz routes (single-level and cross-level). Not for per-chapter quizzes, whose
word count is already small enough that drilling a subset isn't meaningfully different from
just replaying the whole thing.

- New `QuizRunner` prop, `allowDrillMissed?: boolean` (default `false`). Only
  `/hsk/[level]/combined/quiz`, `/hsk/[level]/custom/quiz`, and `/custom-quiz/quiz` pass `true`;
  the per-chapter quiz page leaves it unset.
- Results screen: when `allowDrillMissed && missedWords.length > 0`, a "Drill missed words"
  button next to Replay. Entirely client-side — `QuizRunner` already has the missed words in
  memory (same array the Stats panel already renders), so no new route, no server round-trip,
  no word-id-list URL encoding needed.
- Clicking it swaps the *active* word set to just the missed words and remounts (same `runId`
  bump mechanism `onReplay` already uses), forcing that round to **`trackAttempt: false`** (never
  hits the leaderboard, even if the original run was tracked — e.g. drilling missed words from
  the tracked per-level Combined quiz stays untracked) and **untimed** (see §3 — a drill round's
  word count is whatever was missed, so it has the same "no fair fixed duration" problem custom
  quizzes do).
- `allowDrillMissed` stays `true` on the drilled round too, so a multi-round drill-down (drill
  the missed words, still miss a few, drill again) falls out naturally with no extra code.
- `onReplay`'s existing behavior is unchanged semantically: it replays whatever the *current*
  active word set is. Before any drilling, that's the original words; after a drill round,
  Replay replays that drilled subset, not the original full quiz — matches "replay this run,"
  not "reset to the very beginning."

## 2. Auto-scroll to the current row

Whenever `currentIndex` changes — auto-advance on a correct answer, Prev/Next buttons, or
clicking a row directly (`goTo` is already the single function all three paths funnel through)
— scroll the current row into view.

- **Not `scrollIntoView({block: "center"})`**: that centers against the full viewport, which
  would tuck the target row halfway behind the sticky score/timer/input bar
  (`sticky top-18.25`, see [10-color-palette.md](10-color-palette.md)'s `--current-row` note and
  the Phase 5 sticky-header work). Instead, compute manually: the sticky bar's own
  `getBoundingClientRect().bottom` marks where the *actually visible* area starts; center the
  target row within `window.innerHeight - stickyBottom`, not the full window height.
- Implementation: a ref on the sticky wrapper div, a `data-row-index` attribute per `<tr>`
  (queried via a container ref + `querySelector`, simpler than maintaining a ref-per-row Map for
  a list that can be 600+ rows long), and a `useEffect` on `[currentIndex]` that computes the
  scroll delta and calls `window.scrollBy({ top: delta, behavior: "smooth" })`.

## 3. Remove the timer for Custom Quiz (not the per-level Combined quiz)

The per-level Combined quiz keeps its existing fixed 20/30/40-min-per-level timer — that one has
a stable, known word count per level, so a duration is well-defined. Custom Quiz doesn't: an
arbitrary chapter combination (2 chapters vs. 10, one level vs. three) has no fair fixed or
formula-scaled duration, so it goes untimed instead of guessing.

- `QuizRunner`'s `durationSeconds` prop becomes fully optional with **no default** — `undefined`
  means untimed. (Today it defaults to 600s; chapter/combined pages keep passing an explicit
  number, so their behavior is unchanged.)
- Untimed mode: no countdown interval, no "Time's up!" auto-finish state, no time display in the
  toolbar, no Pause/Resume button (nothing to pause), and the not-started screen drops "· MM:SS
  on the clock" from its copy (just "{total} words").
- `src/app/hsk/[level]/custom/quiz/page.tsx` and `src/app/custom-quiz/quiz/page.tsx` drop the
  `SECONDS_PER_WORD`/`MIN_DURATION_SECONDS` word-count heuristic entirely and stop passing
  `durationSeconds`.
- Drill-missed rounds (§1) are always untimed too, for the same reason (variable, unpredictable
  word count).

## 4. Persist Custom Quiz picker selections to localStorage

Picking chapters across three levels is enough clicking that losing it on navigation is
annoying. `CustomQuizPicker`'s `selections` state persists to `localStorage` (key
`hsk-quiz:custom-quiz-selections`), so returning to `/custom-quiz` later restores prior picks.

- Sets aren't JSON-serializable — store as `Record<string, { combined: boolean; chapters:
  number[] }>`, convert back to `Set` on load.
- Load in a `useEffect` on mount (not the `useState` initializer) to avoid an SSR/hydration
  mismatch — the initial render matches the server's empty state, then a post-hydration effect
  reads `localStorage` and updates state, same pattern any client-only-storage read needs in a
  server-rendered app.
- Save in a `useEffect` on `[selections]` — fires after the load-effect's own update too, which
  just re-writes the same data back (harmless, not worth special-casing away).

## 5. Reset button + move Start/Reset to the top

- New "Reset" button next to "Start quiz": clears `selections` back to `{}` (the save-effect
  from §4 then naturally clears the persisted copy too — no separate localStorage call needed).
- Both buttons (plus the "select at least 2 chapters..." hint text) move from *below* the
  per-level accordion list to *above* it, for easier reach without scrolling past every level
  first.

## Explicitly out of scope

- Drill-missed-words for per-chapter quizzes (small word pools already, per §1).
- Persisting anything beyond the checkbox selections (e.g. which accordion is open) to
  localStorage.
- A visible elapsed-time stopwatch in untimed mode — "remove the time" is read literally: no
  timer UI at all, not a count-up replacement.
