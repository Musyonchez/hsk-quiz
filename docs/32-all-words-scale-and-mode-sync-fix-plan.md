# All Words Scale Fix + Quiz Mode Tab Sync Bug

Two issues reported live against `/hsk/2/chapter/6/all/quiz?mode=type`.

## 1. All Words' Match meaning/Character should use the Combined/Custom scale, not the chapter scale

[19-meaning-quiz-mode-plan.md](19-meaning-quiz-mode-plan.md) drew the line between the two
meaning-quiz UIs at "chapter-sized (~10-20 words, fits on one screen)" vs. "combined/custom-sized
(100+ words)." The All Words feature ([25](25-chapter-all-words-plan.md)) reuses a chapter's
`chapterId` scoping, so it got wired to the chapter-scale variant (`MatchQuizRunner`, a
click-to-pair board) by default — but All Words' actual word count is a full dialog's vocabulary,
not a curated New Words list. Checked against the live report's own example: HSK2 chapter 6 has
**13** New Words but **61** All Words — well past the point a matching board is playable (61
tiles per column, per [19](19-meaning-quiz-mode-plan.md)'s own reasoning for why combined/custom
needed a different UI in the first place).

**Fix**: `/hsk/[level]/chapter/[chapter]/all/quiz` switches `meaningVariant`/`characterVariant`
from `"match"` to `"choice"` — the same one-word-at-a-time flow (`ChoiceQuizRunner`/
`CharacterQuizRunner`) Combined and Custom Quiz already use. This is a scale correction, not a
new feature: All Words was always closer to "a whole level's worth of words" than to "one
chapter's curated list," it just inherited the wrong variant by following its chapterId scoping
too literally. No `quizKey` change needed — `-all`/`-all-match`/`-all-char` stay exactly as they
are, only which component renders that key's UI changes.

## 2. Quiz mode doesn't switch when clicking between the Type pinyin/Match meaning/Character tabs

**Repro**: on an All Words (or any) quiz page, start on `?mode=type`, click the `Match meaning`
tab. The URL changes and the tab pill's highlight is correct, but the actual quiz content stays
on the typing runner. Clicking `Dialog` or `All Words` (a genuinely different route,
`/all` vs `/all/quiz`) and then clicking back into `Match meaning` fixes it.

**Root cause**: [QuizModeGate.tsx](../src/components/QuizModeGate.tsx) is a Client Component
that seeds its own `mode` state from the `initialMode` prop once, at mount —
`useState<...>(initialMode)`. React preserves a Client Component's local state across
re-renders **as long as its position in the tree doesn't change** — clicking the `Match meaning`
tab only changes `?mode=` on the *same* route (`/all/quiz`), so `QuizModeGate` never unmounts;
its `mode` state simply never gets told the prop changed. Navigating to `/all` and back **does**
unmount it (a different route entirely), which is why that workaround happens to fix it. This is
the classic "state initialized from a prop that can itself change later" bug — same shape covered
in the React docs' [You Might Not Need an Effect](https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes),
recommending a `key` over an internal effect-based sync.

**Fix**: give every `<QuizModeGate>` call site a `key={initialMode ?? "picker"}`. A key change
is React's own mechanism for "throw away this subtree's state and mount fresh" — exactly what's
needed here, and it's the same remount-via-key pattern this codebase already uses for Replay/
Drill missed words (`QuizRunner`/`ChoiceQuizRunner`/`MatchQuizRunner`'s `key={runId}`), so it's
consistent with the existing house style rather than a new pattern.

## Files touched

- `src/app/hsk/[level]/chapter/[chapter]/all/quiz/page.tsx` — `meaningVariant`/`characterVariant`
  `"match"` → `"choice"`, plus `key={initialMode ?? "picker"}` on `<QuizModeGate>`.
- `src/app/hsk/[level]/chapter/[chapter]/quiz/page.tsx`,
  `src/app/hsk/[level]/combined/quiz/page.tsx`, `src/app/hsk/[level]/custom/quiz/page.tsx`,
  `src/app/custom-quiz/quiz/page.tsx` — same `key` fix (the sync bug isn't All-Words-specific,
  it affects every quiz page's mode tabs identically).

## Verification

- Live-equivalent repro: start a quiz on Type pinyin, click Match meaning without any other
  navigation in between — content should switch immediately.
- All Words (HSK2 ch.6, 61 words) Match meaning and Character modes should render the
  one-word-at-a-time flow, not a 61-tile matching board.
- Chapter-scale (New Words) quizzes keep the matching board unchanged — this fix only touches
  All Words' variant choice, not the chapter quiz's.
