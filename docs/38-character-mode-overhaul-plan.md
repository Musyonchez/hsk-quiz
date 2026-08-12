# Character mode overhaul: built for real instead of adapted from pinyin

## Why

Direct feedback: "type pinyin" mode feels right, but Character mode (and Match/Meaning mode) feel
finicky because they were both adapted from the pinyin-typing quiz's shape rather than designed
for their own interaction. This plan is the Character-mode rebuild — **custom-built from scratch,
not incrementally patched.**

Full permission to gut and replace: nothing in `CharacterStudy.tsx` or `CharacterQuizRunner.tsx`
needs to survive if a clean rewrite serves the design better.

## The shape: exactly 3 self-contained modes, no bridge

Corrected mid-planning, worth stating plainly since it changes the structure: this app has
**exactly 3 quiz modes — Pinyin, Character, English** — each its own self-contained island, not
sharing a UI shell. **There is no separate "Study" mode.** The grid/popup word-browse experience
(originally drafted as its own 4th mode) is **not a bridge between modes** — it's folded entirely
into the Character island as the view you land on before that island's quiz starts. Today's
`QuizModeGate` 4-button picker (Type pinyin / Match meaning / Character / Study) becomes a
3-button picker (**Pinyin / Character / English** — "Match meaning" renamed for parity with the
naming scheme), and the Character button leads into everything this doc specs below as one
continuous flow, not a separate page reached another way.

- **Pinyin** — today's `QuizRunner`/`matchesPinyin` typing quiz. Unchanged; it's the one mode
  that already feels right.
- **English** — today's `ChoiceQuizRunner`/`MatchQuizRunner` ("Match meaning"), renamed. Its own
  "adopted from pinyin" overhaul is explicitly out of scope here (see below) — this pass only
  renames the button/label for the 3-mode scheme, doesn't touch its internals.
- **Character** — everything in this doc. Its own browse view, its own quiz, its own two answer
  formats inside that quiz. A fully self-contained island — even though its "type the pinyin"
  quiz sub-mode is mechanically similar to the separate Pinyin island, it stays inside Character
  as its own thing per direct instruction, not deduplicated across islands.

## Reference: `Code/hsk2-ch7-12-exam/word-drill`

A from-scratch look at a second, independent word-drill app (built fast for a Monday exam, "still
raw" per direct instruction — read for interaction ideas, not copied as a design to follow). Its
Python/Flask quiz mode is a single flashcard + typing quiz, not the grid-of-boxes this plan
specs — genuinely different shape. What's worth carrying over is mechanics, not layout:

- **Live "Missed: N" counter**, top-right, updating during the quiz — this app's quizzes currently
  only compute a missed list at the very end (`order.filter(w => !correctIds.has(w.id))` in
  `QuizRunner.tsx`); there's no running counter today. New for the Character quiz specifically.
- **Skip button** for the typing sub-mode, marks the word missed and advances — this app's
  existing `QuizRunner`/`CharacterQuizRunner` have no skip at all today (Next silently jumps to
  the next unanswered word without marking anything missed). Character's typing sub-mode gets an
  explicit Skip.
- **Auto-check on every keystroke, silent on wrong** (no red flash, no message — right answer
  just advances, wrong answer just sits there until corrected or skipped) — this app's
  `matchesPinyin`-driven auto-advance in `QuizRunner.tsx` already works this way; Character's
  typing sub-mode keeps that exact feel, just adds the Skip + live counter on top.

## Character island, part 1 — the browse view (was "Study")

The view Character mode opens on — the "word dump" before its quiz, not a separately-chosen mode.
Replaces `CharacterStudy.tsx` entirely — sequential single-card tap-to-flip is out, a browsable
grid with an on-demand deep-dive is in. A "Start quiz" action moves from this view into part 2
below.

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

## Character island, part 2 — the quiz

Replaces `CharacterQuizRunner.tsx`'s single fixed interaction (type pinyin → pick the character
from a candidate row) with a **mode choice up front**, each mode built for what it actually tests
— not both jammed through one shell.

### Mode picker (before the quiz starts)

Two mutually exclusive answer formats — picking one hides the other's controls entirely, no
combined state:

- **Pinyin test** — prompt is the character, player **types the pinyin** from memory. Reuses
  `matchesPinyin` (tone-free, same rule as every other typing quiz in this app — docs/06) for
  checking, so the feel matches Pinyin mode exactly even though it lives inside a different
  island (see "exactly 3 modes" above for why that's intentional, not deduplicated). Gets a
  **Skip** button (marks missed, advances) — the one thing typing needs that auto-advance-on-
  match doesn't otherwise provide.
- **English test** — prompt is the character, player **selects the English meaning** from options
  (reuses `buildChoices`/`meaning-choices.ts` as-is — same 5-option, ranked-distractor
  infrastructure `ChoiceQuizRunner` already uses, just prompting from character instead of
  pinyin). No Skip needed — clicking any option immediately advances, same as
  `ChoiceQuizRunner`/`CharacterQuizRunner`'s existing pick-and-advance pattern.

### Both answer formats, new

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

## Out of scope (this pass)

- English mode's own equivalent overhaul — same "adopted from pinyin" complaint applies to it
  too, but explicitly deferred to its own future plan. This pass only renames its button/label.
- Writing the actual HSK2/HSK3 mnemonic dictionaries (separate follow-up, see above).
- Anything on the already-liked Pinyin mode itself.

## Files likely touched (confirmed at implementation time, not enumerated here)

- `src/components/QuizModeGate.tsx` — 4-button picker (type/meaning/character/study) becomes
  3-button (type/character/meaning, relabeled Pinyin/Character/English); the `"study"` mode
  branch is removed, its content folded into the `"character"` branch's own internal flow.
- `src/components/CharacterStudy.tsx` — removed, replaced by the browse grid/popup, now rendered
  as part of the Character flow rather than its own top-level branch.
- `src/components/CharacterQuizRunner.tsx` — full rewrite, split typing/select answer formats.
- `src/quiz/types.ts` — `QuizWord.mnemonic?: string | null` once docs/34 lands.
- `prisma/schema.prisma` — `Word.mnemonic` (already drafted on the paused branch).
- `docs/06-quiz-mechanics.md` — Character section rewritten once implemented, same as
  docs/hold/33's redesign updated it last time; drops the standalone "Study mode" subsection
  entirely. **Done** — see its "Character mode (rebuilt per docs/38...)" section.

## Verification (at implementation time)

- Live Playwright pass: mode picker shows exactly 3 buttons (Pinyin/Character/English), no
  Study button anywhere; Character opens straight into the browse grid; toggle hides/shows
  pinyin; shuffle reorders; popup opens on click; arrow keys/Prev-Next/swipe move between words
  without closing; mnemonic line appears only when present; a "Start quiz" action moves from the
  browse view into the quiz.
- Quiz: answer-format picker hides the other format's UI entirely; pinyin-test Skip marks missed
  and advances; English-test pick-to-advance still works; live Missed counter updates on both
  wrong-and-skip; existing stats/leaderboard/drill-missed flow still works unchanged.
- `tsc --noEmit` + `eslint .` clean; CI green on the PR.
