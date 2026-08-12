# Character mode overhaul: Study page + Quiz, built for real instead of adapted from pinyin

## Why

Direct feedback: "type pinyin" mode feels right, but Character mode (and Match/Meaning mode) feel
finicky because they were both adapted from the pinyin-typing quiz's shape rather than designed
for their own interaction. This plan is the Character-mode rebuild — **Study page and Quiz, both
custom-built from scratch, not incrementally patched.** Match/Meaning mode has the same root
problem but is explicitly out of scope here; a separate future pass, once this one's shipped and
lived with a bit.

Full permission to gut and replace: nothing in `CharacterStudy.tsx` or `CharacterQuizRunner.tsx`
needs to survive if a clean rewrite serves the design better.

## Reference: `Code/hsk2-ch7-12-exam/word-drill`

A from-scratch look at a second, independent word-drill app (built fast for a Monday exam, "still
raw" per direct instruction — read for interaction ideas, not copied as a design to follow). Its
Python/Flask quiz mode is a single flashcard + typing quiz, not the grid-of-boxes this plan
specs — genuinely different shape. What's worth carrying over is mechanics, not layout:

- **Live "Missed: N" counter**, top-right, updating during the quiz — this app's quizzes currently
  only compute a missed list at the very end (`order.filter(w => !correctIds.has(w.id))` in
  `QuizRunner.tsx`); there's no running counter today. New for Character mode specifically.
- **Skip button** for the typing mode, marks the word missed and advances — this app's existing
  `QuizRunner`/`CharacterQuizRunner` have no skip at all today (Next silently jumps to the next
  unanswered word without marking anything missed). Character mode gets an explicit Skip.
- **Auto-check on every keystroke, silent on wrong** (no red flash, no message — right answer
  just advances, wrong answer just sits there until corrected or skipped) — this app's
  `matchesPinyin`-driven auto-advance in `QuizRunner.tsx` already works this way; Character mode's
  typing sub-mode keeps that exact feel, just adds the Skip + live counter on top.

## Part A — Study page rebuild (the "word dump" before the quiz)

Replaces `CharacterStudy.tsx` entirely — sequential single-card tap-to-flip is out, a browsable
grid with an on-demand deep-dive is in.

### Grid view

- One box per word: **enlarged character**, **pinyin below it** (same box, not a separate line
  outside it). No English or mnemonic in the small box — confirmed explicitly: those live only in
  the popup (see below).
- Top controls: **"Show pinyin" toggle** (on by default; off hides the pinyin line, character
  only — a self-test aid) and a **Shuffle** button (reshuffles box order, same shuffle-on-click
  pattern `CharacterStudy.tsx` already uses elsewhere in this app).
- Responsive grid (`grid-cols-*` at a few breakpoints), similar spirit to `VocabTableGroup`'s
  existing responsive handling but boxes, not table rows.

### Popup (click a box)

A modal/lightbox, not a route change — the URL doesn't move, so there's no navigation to undo.

- Shows: character (large, same tian-zi-gé practice-grid treatment `CharacterStudy.tsx` already
  has), pinyin, **English meaning**, and **mnemonic** (when one exists — nullable, see the
  Mnemonics section below; hidden entirely when absent, not shown as an empty line).
- **Stays open across characters.** Prev/Next buttons at the bottom, **left/right arrow keys**,
  and **swipe left/right on touch** all move to the adjacent word in the current (possibly
  shuffled) grid order without closing the popup. Closes via an explicit close button, backdrop
  click, or Escape.
- Same underlying word list/order as the grid (so Next in the popup matches what Next would be if
  you closed it and clicked the next box by hand).

## Part B — Quiz rebuild

Replaces `CharacterQuizRunner.tsx`'s single fixed interaction (type pinyin → pick the character
from a candidate row) with a **mode choice up front**, each mode built for what it actually tests
— not both jammed through one shell.

### Mode picker (before the quiz starts)

Two mutually exclusive modes — picking one hides the other's controls entirely, no combined
state:

- **Pinyin test** — prompt is the character, player **types the pinyin** from memory. Reuses `matchesPinyin` (tone-free,
  same rule as every other typing quiz in this app — docs/06) for checking, so the feel matches
  "type pinyin" mode exactly, just prompting from a character instead of typing from a meaning.
  Gets a **Skip** button (marks missed, advances) — the one thing typing mode needs that
  auto-advance-on-match doesn't otherwise provide.
- **English test** — prompt is the character, player **selects the English meaning** from options
  (reuses `buildChoices`/`meaning-choices.ts` as-is — same 5-option, ranked-distractor
  infrastructure `ChoiceQuizRunner` already uses, just prompting from character instead of
  pinyin). No Skip needed — clicking any option immediately advances, same as
  `ChoiceQuizRunner`/`CharacterQuizRunner`'s existing pick-and-advance pattern.

### Both modes, new

- **Live "Missed: N" counter**, upper-right (per the reference project — see above), updating in
  real time as the player answers, not just computed at the end. Sits alongside the existing
  `ANSWERED N/total` indicator this app's runners already show.
- Everything else — sticky score bar, Prev/Next/Pause/Give-up toolbar, timed-mode countdown,
  end-of-quiz stats + "Drill missed words," leaderboard/attempt tracking — carries over from the
  existing `CharacterQuizRunner`/`QuizRunner` pattern this app already uses everywhere else. Not
  reinventing what already works, only what was finicky.

## Mnemonics: consistency across generation passes

Mnemonics for the popup depend on finishing docs/34's "memory aid mnemonics" work — currently a
**paused, unmerged WIP branch** (`feat/memory-aid-mnemonics`, not yet on `main` — its own plan doc
lives only on that branch) with a full HSK1 (177-word) dictionary already hand-written, not yet
wired into `seed.ts`/`QuizWord`/any UI. HSK2/HSK3 remain unwritten. Direct instruction for
finishing that content: generating it via multiple parallel agents risks inconsistent voice/format
between batches (one agent's mnemonics reading differently than another's) — the plan is **one
agent, one continuous pass per level** (not fanned out in parallel across agents) specifically to
keep tone and format consistent, the same reasoning that branch's own plan doc already gives for
why this is hand-written content rather than templated. This is its own follow-up work, not
blocking this doc — the popup's mnemonic line just renders nothing when a word has none yet, same
as it will for HSK2/HSK3 words until they're written.

## Explicit decisions from an ambiguous point in the request

The box toggle was initially described as "show pinyin or english," then corrected mid-message to
keep English out of the small boxes entirely. Confirmed directly: **the toggle only shows/hides
pinyin** in the grid box; English and mnemonics are popup-only. Documented here so the resolution
is on record, not just in chat history.

## Out of scope (this pass)

- Match/Meaning mode's equivalent overhaul — same "adopted from pinyin" complaint applies, but
  explicitly deferred to its own future plan.
- Writing the actual HSK2/HSK3 mnemonic dictionaries (separate follow-up, see above).
- Anything on the already-liked "type pinyin" mode itself.

## Files likely touched (confirmed at implementation time, not enumerated here)

- `src/components/CharacterStudy.tsx` — full rewrite (grid + popup) or replaced by new
  components (e.g. a `CharacterGrid.tsx` + `CharacterPopup.tsx` split).
- `src/components/CharacterQuizRunner.tsx` — full rewrite, split typing/select sub-modes.
- `src/quiz/types.ts` — `QuizWord.mnemonic?: string | null` once docs/34 lands.
- `prisma/schema.prisma` — `Word.mnemonic` (already drafted on the paused branch).
- `docs/06-quiz-mechanics.md` — Character/Study sections rewritten once implemented, same as
  docs/33's redesign updated it last time.

## Verification (at implementation time)

- Live Playwright pass: grid renders, toggle hides/shows pinyin, shuffle reorders, popup opens on
  click, arrow keys/Prev-Next/swipe move between words without closing, mnemonic line appears
  only when present.
- Quiz: mode picker hides the other mode's UI entirely; pinyin-test Skip marks missed and
  advances; English-test pick-to-advance still works; live Missed counter updates on both wrong-
  and-skip; existing stats/leaderboard/drill-missed flow still works unchanged.
- `tsc --noEmit` + `eslint .` clean; CI green on the PR.
