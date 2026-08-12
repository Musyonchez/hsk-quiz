# Character Mode Redesign — Single Focused Card + Flashcard Study

## Diagnosis

Prompted by comparing against a small reference project (`~/Code/hsk2-ch7-12-exam/hsk2-ch7-12-site`,
unrelated to this app) whose quiz — one centered card per question, capped round size, nothing
else on screen, plus a separate flip-card "Study" mode — feels noticeably better than this app's
Character mode, even though the underlying quiz mechanic (multiple-choice-style) is similar.

The quiz-screen difference is structural, not cosmetic. `CharacterQuizRunner` (docs/hold/27)
inherited `QuizRunner`'s "sticky toolbar + full answer-key table + sticky bottom bar" shell — the
right shape for **typing** (the table doubles as the answer key you watch fill in) but the wrong
shape for **candidate-picking**: the table shows 60–177 mostly-irrelevant rows the player can't
act on, while the actual interactive UI — the pinyin input and candidate row — gets squeezed into
a thin strip at the very bottom of the viewport, below all of that. Two layouts competing for the
same screen, serving neither well.

Separately, the reference project also has a **flashcard Study mode** (flip a card to reveal
pinyin/meaning, Prev/Shuffle/Next) that this app has no equivalent of anywhere — a genuinely
missing, not just poorly-shaped, piece of the Character mode experience.

**Scope, confirmed explicitly**: both parts of this doc apply to **Character mode only** — Match
meaning (`ChoiceQuizRunner`) and its chapter-scale matching board are untouched. Study mode
applies at **both scales** (chapter and combined/custom/All Words) as an added option alongside
the existing quiz, not a replacement for it.

## Part 1 — Single-card redesign of `CharacterQuizRunner` (combined/custom scale)

### Decisions

- **Drop the always-visible word table entirely.** Replace it with nothing — just the current
  question's card, centered, full focus. The sticky top toolbar's `ANSWERED x/y` count plus a
  slim progress bar is enough sense of progress without a 60+ row list competing for attention.
- **Keep no-reveal-until-results.** The same cross-word leakage risk that justified this for
  Match meaning (docs/hold/19) applies identically to Character mode — candidate rows are
  regenerated fresh per word from the same pool, so a wrong pick's distractors can include
  another question's correct answer. A click still locks in a neutral "selected" style, right or
  wrong only shown at the end, unchanged from today.
- **Explicit scope cut**: losing the table also loses "click any row to jump straight to and
  review an already-answered word" (Prev/Next already only visit *unanswered* words — direct-row
  -click was the only way to revisit a locked-in pick mid-run). Accepted as a fair trade for the
  focus win.

### New shape

- **Sticky top toolbar**: unchanged — `ANSWERED x/y`, timer, Prev/Next/Pause/Give up.
- **Not-started screen**: unchanged — word count, Start quiz, Shuffle.
- **Main content while running**: one centered card containing, top to bottom: a slim progress
  bar, the English-meaning prompt, the pinyin input (unlocks candidates on match, unchanged
  logic), the candidate grid once unlocked (unchanged ranked-distractor logic/styling).
- **Results screen**: unchanged.

### Files touched

- `src/components/CharacterQuizRunner.tsx` — remove the `<table>`, wrap prompt/input/candidates
  in a single centered card, add the progress bar. No logic changes, layout only.

## Part 2 — New flashcard Study mode

### Shape

A new `CharacterStudy` component, structurally close to the reference project's `Study`
(sequential deck, tap-to-flip, Prev/Shuffle/Next, position counter) but restyled to this app's
existing ink/paper/seal system rather than the reference project's own palette, and without a
mnemonic field (no such data in this app's `Word` model — chinese/pinyin/meaning only, all
already available on the `QuizWord` type already passed to every runner, so **no new query or
schema change needed**).

- Not timed, not scored, not tracked — same "practice only" treatment Custom Quiz already gets
  (no `Attempt` write, no `quizKey` needed at all).
- Card shows the character large and centered (with a light tian-zi-gé grid behind it, a small
  visual nod to the reference project worth keeping — cheap to build, genuinely helps orient a
  character's proportions); tap/click to flip, revealing pinyin + meaning. Prev/Shuffle/Next
  below, `N / total` counter.
- Deck order: shuffled once per mount (no `key`-remount trick needed — Study is reached via a
  fresh page navigation each time, unlike Replay/Drill which remount an already-mounted runner).

### Where it's exposed — every place Character mode already is

Character mode's `mode` value gets a sibling `"study"` value everywhere the mode union appears,
gated by the same `characterVariant`/`characterModeAvailable` check Character mode already uses
(same underlying word pool either way):

- `QuizModeGate`'s own picker screen (`mode === null`): add a 4th "Study" button next to Type
  pinyin/Match meaning/Character; add a `mode === "study"` branch rendering `CharacterStudy`
  (no quiz-key/trackAttempt plumbing needed, unlike the other three branches).
- Chapter Learn page (`chapter/[chapter]/page.tsx`) and Combined Learn page (`combined/page.tsx`):
  add a "Study" quick-link button (`?mode=study`) next to the existing Character button.
- `AllWordsTabs`: add a 6th "Study" tab next to Character.
- `CustomQuizPicker`'s quick-jump buttons: add a "Study" button next to Character, same pattern
  as the Character button added in the previous fix — `buildQuizHref`'s mode type widens to
  include `"study"`.

### `quizKey`/leaderboard

No changes to `quiz-key.ts` — Study is never tracked, so it never needs a key at all, same as
Custom Quiz's existing practice-only paths.

### Files touched

- `src/components/CharacterStudy.tsx` (new).
- `src/components/QuizModeGate.tsx` — widen `mode` union, add Study button + branch.
- `src/app/hsk/[level]/chapter/[chapter]/page.tsx`, `src/app/hsk/[level]/combined/page.tsx` —
  add Study quick-link buttons.
- `src/components/AllWordsTabs.tsx` — add Study tab.
- `src/components/CustomQuizPicker.tsx` — add Study quick-jump button.
- Every page that renders `<QuizModeGate>` — widen its `initialMode`/`?mode=` parsing to accept
  `"study"` alongside the existing three values (same 5 call sites touched for Character mode
  originally: chapter quiz, combined quiz, both Custom Quiz routes, All Words quiz).

## Verification

- Live check on a large pool (HSK1 combined, 177 words, or HSK2 ch.6 All Words, 61 words):
  confirm the quiz no longer shows any word list, just the current card, and that Prev/Next/
  Pause/Give up/Shuffle/Drill missed/leaderboard-link all still work unchanged.
- Confirm no reveal leaks before the results screen (a wrong pick still shows neutral, not red).
- Study mode: confirm flip/Prev/Shuffle/Next work at both a chapter-scale pool and a combined-
  scale pool, and that it's reachable from every place listed above (Learn pages, AllWordsTabs,
  Custom Quiz picker, QuizModeGate's own picker screen).
