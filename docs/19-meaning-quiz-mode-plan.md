# Pinyin → Meaning Quiz Mode Plan

Written before any code, per the same discipline as [17](17-custom-chapter-quiz-plan.md)/
[18](18-quiz-runner-and-picker-improvements-plan.md).

## Problem

The existing quiz (`QuizRunner`) only tests one direction: show the Chinese character, type its
pinyin. The user's noticed that direction gets easy fast, but there's no way to practice the
reverse — given the pinyin, recall its meaning. Free-text English input doesn't work for that
(unlike pinyin, there's no single normalizable canonical answer — "you," "you (singular),"
"you, sing." are all valid phrasings of the same meaning), so this has to be multiple choice.

## Decisions (confirmed with the user)

- **Direction**: prompt shows **both the Chinese character and its pinyin** (not pinyin alone,
  for now — a future pass could narrow it to pinyin-only as a harder variant, but this first pass
  keeps the character visible); answer options are English meanings. The recall skill being
  tested is specifically the meaning side, not also stripping away the character as a second
  difficulty axis at the same time.
- **Two different UIs by quiz scale**, matching the user's own read of the problem:
  - **Per-chapter quiz** (small, ~10-20 words, all fit on one screen): a **matching** puzzle —
    click a pinyin item, then click its English match. Explicitly **not** literal drag-and-draw
    connecting lines (real UI risk — drag state, touch support, SVG line rendering) for no
    gameplay difference from click-to-pair, which gets the same "match the pairs" feel with far
    less to build.
  - **Combined quiz + both Custom Quiz routes** (large, 100+ words, can't show them all as a
    matching board): **keeps the exact same shell the existing typing quiz already uses** — the
    full scrollable table of every word stays visible below a sticky "current word" area, Prev/
    Next and direct row-clicks still work the same way — the only thing that changes is the
    answer widget itself: 5 clickable English options instead of a text field. Not a
    stripped-down single-card screen; same list-plus-current-prompt shape end users already know.
- **Single-shot, no retry within a run, no "wrong" animation** (this doc originally spec'd a
  shake-and-retry interaction; revised per direct follow-up instruction before any code was
  written). Clicking an option or a match pair **locks it in immediately**, right or wrong — no
  do-over in that same run. Missing words get corrected the same way every other mode already
  does: **Drill missed words** (already built, [18](18-quiz-runner-and-picker-improvements-plan.md)),
  not an in-place retry loop.
- **No right/wrong reveal during the run — only at the end.** This is the important distinction
  the user flagged: even with single-shot locking, showing an instant correct/incorrect color the
  moment you click would still leak information *across different words*, since distractor pools
  for different words can share the same meanings — see one word's answer accidentally, and
  you've learned something about another word's options too, without ever having to "spam" the
  same word twice. So a click just shows "this is now your locked answer" in a neutral/selected
  style, never red or green, until the quiz finishes and the results screen reveals the score and
  the missed-words list. This is a stricter version of "no shake to retry" — it's "no feedback
  at all until everything is already locked in."
- **Options regenerate every time a quiz is *started*, frozen for that run's *entire duration*.**
  Two different things, not to conflate: (1) the *order of the questions* is whatever Shuffle
  already does (or the DB's natural order) — untouched by this feature; (2) each word's specific
  set of 5 answer options (4 distractors + the correct one, at a random position) is freshly
  randomized every time someone clicks "Start quiz" — a new run gets new option sets — but once
  generated, that exact set stays fixed for every word for the rest of that run, including on a
  Prev/Next revisit. This is what stops "leave a hard one, come back later, the options quietly
  changed, compare old vs. new to infer the answer" — a real gaming vector if options were
  regenerated on every visit instead of once per run-start.
- **Mode picked on the pre-quiz screen** (not a separate route/page): the same quiz page gets a
  small chooser before "Start quiz" — e.g. "Type pinyin" vs. "Match meaning" — rather than a
  second entry point elsewhere in the nav.
- **Separate leaderboard entry.** A guessed 5-choice run and a fully-typed recall run aren't
  comparable difficulty, so tracked meaning-mode runs (chapter, per-level Combined) get a
  distinct `quizKey` suffix, never mixed into the typing mode's leaderboard rows. Custom Quiz's
  meaning mode stays practice-only either way (matches its existing typing mode — Custom Quiz
  is never tracked, per [17](17-custom-chapter-quiz-plan.md)).

## No schema/data-layer changes needed

`Word.meaning` already exists and is already fetched by every quiz page. Distractor generation
is pure client-side logic over the word list already in memory — no new query, no new API route.

## Distractor generation

A small new pure function, `src/quiz/meaning-choices.ts` (alongside `pinyin-match.ts`/
`format-time.ts`/`quiz-key.ts` — framework-free, unit-testable in isolation):

```ts
function buildChoices(words: QuizWord[]): Map<wordId, QuizWord[]> // shuffled options per word
```

- For each word, pick up to 4 distractors at random from the *other* words in the same quiz
  pool, excluding any whose `meaning` string exactly matches the target's (avoids two
  "technically correct" options when two entries share a meaning — happens already, e.g. two
  readings of the same character).
- Gracefully degrades below 4 distractors if the pool is too small (chapters don't hit this path
  at all since they use matching, not choices; combined/custom always have well over 5 unique
  meanings in practice, but the function doesn't assume that).
- Correct answer's position is randomized among the returned options, not always e.g. first.
- Called once whenever a run actually *starts* — the initial "Start quiz" click, and again on
  Replay or Drill missed words (both of those are, mechanically, starting a fresh run) — stored
  in that run's own state so every revisit within the same run sees identical options, but a
  brand new run gets freshly randomized ones. Never regenerated on a mid-run Prev/Next/row-click
  revisit, per the anti-gaming decision above.

## New components

### `ChoiceQuizRunner` (combined/custom quizzes, same list-plus-current-prompt shell)

Structurally close to the existing `QuizRunner` — same full-table-below-a-sticky-area layout,
auto-scroll (§2 of [18](18-quiz-runner-and-picker-improvements-plan.md)), timer/untimed logic,
drill-missed, Prev/Next-skips-answered, direct row-click-to-jump, and results-screen shape — but
the state model, feedback timing, and one layout detail differ where they have to:

- **Split sticky bars, not one.** The toolbar (score, timer, Prev/Next/Pause/Give up) stays
  sticky **top**, unchanged from today. The prompt (character+pinyin) and its 5 answer buttons
  move to their own sticky **bottom** bar instead of living in the top one. Reasoning: typing is
  a glance-occasionally interaction (you know what you typed; you only check the box to confirm
  spelling), so top placement never mattered much — but picking one of 5 options is a
  look-every-time interaction, and with a 100+ row list the current row drifts far down the page
  as you progress, so the picker has to stay reachable near the bottom of the viewport rather
  than being scrolled out of view above a long table. The auto-scroll math (§2 of
  [18](18-quiz-runner-and-picker-improvements-plan.md)) needs a second sticky-element
  measurement: center the current row in the space between the *top* bar's bottom edge and the
  *bottom* bar's top edge, instead of just "below the top bar."
- `answeredIds: Map<wordId, selectedWordId>` replaces `correctIds: Set<wordId>` as the source of
  truth — a word is "done" once it has *any* entry (right or wrong), not only when right. Score
  is derived (`selectedWordId === wordId` count), not "size of a correct-only set."
  `nextIncompleteIndex` (from §1 of [18](18-quiz-runner-and-picker-improvements-plan.md)) walks
  against `answeredIds.has(...)` instead of `correctIds.has(...)` — same skip-already-done
  behavior, just against the broader "answered" definition. A direct row click still works like
  today (jump anywhere, including already-answered rows) — Prev/Next specifically are what skip
  answered ones, matching the user's "remember prev/next only go to those not answered."
- Clicking an option: records the answer in `answeredIds`, **shows it as selected/locked in a
  neutral style — no red/green** (see the no-reveal-until-the-end decision above), disables that
  word's buttons, and auto-advances to the next unanswered word.
- The full word table lower on the page still shows every word (matches the existing
  chapter/combined table shape) — an answered row gets a neutral "answered" marker (e.g. a plain
  dot/checkmark, not a color), not the correct-row green the typing mode uses, since that green
  itself would be a reveal.
- Results screen, Drill missed words, and the leaderboard-link plumbing are unchanged in shape
  from `QuizRunner` — this is the one moment correctness *does* get revealed, same as it already
  works today (missed words shown, score shown) — just fed from `answeredIds` instead of
  `correctIds`.

### `MatchQuizRunner` (chapter quizzes, whole-set-at-once)

A genuinely different screen shape — no "current word," no Prev/Next, no per-word timer
interaction, no `ChoiceQuizRunner`-style shared table (a matching board *is* the interface).
Two shuffled columns (pinyin+character left, English right, exactly N items each for an
N-word chapter — a closed pool, not independently-sampled options):

- Click one item in each column (either order) to make a guess pair. **Every guess pair locks
  and visually clears from the board immediately, right or wrong** — this is different from the
  original draft (which only removed a *correct* pair and left an incorrect guess's English side
  available) and is the corrected design per the no-reveal rule: if only *correct* pairs
  disappeared from the board, that disappearing-or-not would itself be the exact color-coded
  reveal this feature is trying to avoid. Instead every attempted pair behaves identically
  whether it was right or wrong — neither side gives any visual hint either way.
- One real consequence of this correction, not a bug: if an early guess pairs the wrong two
  items, the *actually correct* partner for each of those items is now gone from the board too —
  that pinyin and that English item can never be correctly matched to anything else for the rest
  of that run. This is expected, standard behavior for a closed-pool matching game (like a
  physical memory-match game) — it makes early wrong guesses cost more, which is a fair tradeoff
  for zero information leakage, and it self-resolves via Drill missed words afterward anyway.
- Finishes when both columns are empty (every item has been consumed by some guess pair, right
  or wrong). Score = number of guess pairs that were *actually* correct (tracked internally the
  whole time, just never shown until now) out of the chapter's total word count.
- Results screen, Drill missed words (missed = every word whose actual correct pairing never
  got guessed), timer/untimed, and attempt tracking follow the same shape as the other runners,
  just triggered by "board empty" instead of a linear walk through the list.
- **Known minor limitation, accepted rather than engineered around**: drilling down to exactly 1
  remaining missed word makes that specific matching round trivial (only one tile in each
  column, so there's nothing to actually choose between). Not fixing this with a fallback mode
  for tiny pools — a 1-word drill round is a small enough edge case not to warrant more
  complexity.

### Timer duration

Both new components reuse whatever duration their quiz type's typing-mode counterpart already
uses — no new duration logic. Chapter: 600s fixed. Combined: the existing 20/30/40-min
per-level table. Custom Quiz (single- and cross-level): untimed, same as its typing mode.
Multiple-choice/matching being typically faster to answer than typing isn't compensated for by
shortening the clock — simplest option, and avoids inventing a new heuristic.

### Mode picker (shared, small)

A tiny addition to the not-started screen already in `QuizRunner`'s shape (or a shared wrapper
component used by all four quiz pages before rendering the chosen runner) — two buttons, "Type
pinyin" (existing behavior, default/first) and "Match meaning" (routes to `ChoiceQuizRunner` or
`MatchQuizRunner` depending on which page it is). Chosen once per quiz visit, before any words
are shown — not a mid-quiz toggle.

## `quizKey` scheme

[`src/quiz/quiz-key.ts`](../src/quiz/quiz-key.ts) currently only knows `hsk{slug}-combined` /
`hsk{slug}-chapter{n}`. Add a `-match` suffix for the tracked meaning-mode variants:

- `quizKeyFor` grows an optional `mode?: "type" | "meaning"` parameter (default `"type"`,
  existing callers unaffected), appending `-match` when `"meaning"`.
- `QUIZ_KEY_PATTERN` in `parseQuizKey` widens to accept the optional suffix; `describeQuizKey`
  appends "(meaning)" or similar to the friendly label so leaderboard/dashboard rows are
  distinguishable.
- `POST /api/attempts`'s validation is already just `parseQuizKey(quizKey) !== null` — no
  separate change needed there once the pattern itself is updated.
- Custom Quiz's meaning mode passes `trackAttempt={false}` exactly like its typing mode already
  does — no `quizKey` involved at all, so nothing to change on that path.

## Explicitly out of scope

- Drag-and-draw literal connecting lines for chapter matching (see Decisions above — click-to-
  pair instead).
- Any retry-within-a-run interaction for a wrong pick/match (see Decisions above — Drill missed
  words is the retry mechanism, uniformly, for every mode).
- Regenerating a word's multiple-choice options mid-quiz (locked at start, see Decisions above).
- A written/typed-answer variant of the reverse direction — ruled out from the start as
  infeasible for free-text English (see Problem).
