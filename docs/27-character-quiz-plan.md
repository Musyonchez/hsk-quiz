# Character Quiz Mode — Virtual Candidate Picker

A third quiz mode alongside "Type pinyin" ([QuizRunner](../src/components/QuizRunner.tsx)) and
"Match meaning" ([ChoiceQuizRunner](../src/components/ChoiceQuizRunner.tsx),
[19](19-meaning-quiz-mode-plan.md)): recall the **Chinese characters** themselves, not just
their pinyin or meaning.

## Why not a real text input

There's no way to type Chinese characters on a plain ASCII keyboard without an IME (input
method editor) doing pinyin→hanzi conversion behind the scenes — same reason
[06-quiz-mechanics.md](06-quiz-mechanics.md) made pinyin answers tone-free rather than requiring
diacritics. Relying on the player's own OS-level Chinese IME would make the quiz untypeable for
anyone who hasn't got one installed, which defeats the point of a web quiz. So instead of a text
field, this mode gives the player **a small on-screen IME**: type the pinyin (a real, familiar
keyboard action), and a row of clickable Chinese character candidates appears — exactly the
"choose from a candidate strip" interaction anyone who's typed Chinese on a phone already knows,
just simulated with a small fixed candidate set instead of a real dictionary.

## Scale split — same reasoning as meaning-match ([19](19-meaning-quiz-mode-plan.md))

Meaning-match already isn't one UI: chapter quizzes (small, ~10-20 words, fit on one screen) get
a click-to-pair **matching board** (`MatchQuizRunner`), while Combined + both Custom Quiz routes
(100+ words) keep the scrollable-table-plus-current-prompt shell with 5 clickable options
(`ChoiceQuizRunner`). Character mode follows the exact same split, for the exact same reason —
a candidate-picker screen doesn't work as a matching board, and a matching board doesn't work
once the pool is too big to lay out as two columns:

### Chapter — matching board (reuses `MatchQuizRunner`'s shape)

English on one side, Chinese characters on the other (pinyin omitted from the tiles — showing it
would give away the exact thing the IME candidate row exists to test at the larger scale, and at
chapter scale there's no candidate row to hide it behind). Click one item in each column to lock
a guess pair, board clears immediately either way, no reveal until the board is empty — identical
mechanics to the existing meaning-match board, just Chinese characters standing in for English on
the right-hand column instead of the left.

### Combined + Custom Quiz — typed-pinyin candidate picker (the interaction described below)

The full IME-style flow: type pinyin to filter, click the right candidate from the row that
appears. This is the one that actually needs the virtual-keyboard interaction, since it's also
the one scale where a plain matching board isn't viable.

## Interaction (Combined/Custom scale)

1. The prompt shows the word's **English meaning** (recall from meaning → character; pinyin
   stays hidden, otherwise this is just a copy of the meaning-match mode with hanzi swapped in
   for English).
2. A pinyin input field is still there, exactly like the typing mode — the player types the
   pinyin from memory first. This isn't graded on its own; it's what unlocks/filters the
   candidate row, mirroring how a real IME narrows candidates as you type.
3. Once the typed pinyin tone-lessly matches the target word's pinyin (same `matchesPinyin`
   check as [pinyin-match.ts](../src/quiz/pinyin-match.ts)), a **candidate row** of 4–6 clickable
   Chinese characters/words appears below the input — the correct word plus distractors.
4. Clicking the correct candidate scores it and advances (same auto-advance pattern as
   `QuizRunner`). Per the Decision below, no right/wrong color on click either way — locked in a
   neutral "selected" style, same as meaning-match, until the results screen.

## Distractor selection

Reuses the existing pool-based approach from
[meaning-choices.ts](../src/quiz/meaning-choices.ts), but ranked instead of purely random —
picking distractors that are *actually plausible* is what makes this mode teach something rather
than being trivially easy:

1. **Same tone-stripped pinyin** (true homophones, e.g. 买/卖) — highest priority distractors,
   pulled from the full level's word pool (not just the current chapter/quiz, which is usually
   too small to have any).
2. **Same first pinyin syllable** (e.g. 还是 vs 还有) — second priority.
3. **Random fill** from the rest of the pool if the above two don't produce enough candidates —
   same fallback `meaning-choices.ts` already uses.

This ranking needs a `pinyin`-comparison helper alongside the existing `matchesPinyin` —
straightforward to add to `pinyin-match.ts` since the tone-stripping normalizer already exists
there.

## Where this lives

- New quiz mode value: `mode?: "type" | "meaning" | "character"` in
  [quiz-key.ts](../src/quiz/quiz-key.ts), producing a `-char` suffixed key (`-char`, not
  `-character`, to keep keys short like the existing `-match`/`-all`), independently
  combinable with the existing `wordSet` axis (`-all-char` for All Words, same pattern as
  `-all-match`).
- New `CharacterQuizRunner` component for the Combined/Custom scale, structurally a fork of
  `ChoiceQuizRunner` (same sticky-toolbar/candidate-row shape) rather than of `QuizRunner`, since
  the "type to filter, then click to confirm" flow is closer to a choice quiz than a
  straight-typing one. Chapter scale reuses `MatchQuizRunner` directly (English/Character
  columns instead of English/Pinyin+Character) rather than forking a third runner.
- New tab alongside the existing "Type pinyin" / "Match meaning" pair — this repo already uses a
  tab pattern for per-chapter/per-level quiz mode pickers (`QuizModeGate`,
  `AllWordsTabs`) — a third tab slots in the same way, wherever those tabs currently appear
  (chapter page, combined page, All Words page).

## Decisions

- **Wrong-answer feedback: silent until the end**, same as meaning-match — the exact same
  cross-word distractor-leakage risk applies here (candidate rows are regenerated fresh per
  word), so there's no reason to deviate from the house rule docs/19 already established. A
  click just locks in a neutral "selected" style; right/wrong only shows on the results screen.
- **Own leaderboard family**: the `-char` key stands alone, not merged with `-match`. "Recognize
  the character" and "recall the meaning" are different skills, and the `quizKeyFor` pattern
  already makes a distinct suffix free.
- **Ships as its own fixed `mode` value first**, not folded into 28's difficulty system. Simpler,
  ships sooner, and 28's own scope is still unconfirmed — revisit only if 28 actually happens.
