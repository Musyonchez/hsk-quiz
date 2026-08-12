# Progressive reveal for large pre-start word lists

Follow-up to the "info dump" finding from docs/47's speaker-button follow-up work: `QuizRunner`,
`ChoiceQuizRunner`, and `CharacterBrowse` all unconditionally render their *entire* word list
before the player has clicked Start — fine at chapter scale (6-70 words), overwhelming for large
custom-quiz/All-Words selections (240+ rows/tiles in one observed case). `MatchQuizRunner` is
unaffected (shows no pre-start list at all, by design).

## Design (as specified)

Not pagination with page numbers — a single "reveal more" affordance (down-chevron), tiered:
- Show the first ~20 items initially.
- First click on the chevron: reveal the next ~20 (40 total).
- Second click: reveal everything else at once.
- The chevron disappears once everything is shown, and never appears at all for a list that's
  already ≤20 (every existing single-chapter route keeps its exact current behavior — this only
  changes anything once a list is large enough to matter).

Rationale for the 20/40/all shape (not just "20 then all"): a player clicking once is still
plausibly just double-checking a couple more words, not committing to reading the whole list — the
second click is the stronger signal they actually want everything, matching the reasoning given for
this design.

## Implementation

- **`src/lib/use-progressive-reveal.ts`** — `useProgressiveReveal<T>(items: T[], chunkSize = 20)`
  returning `{ visible: T[], hasMore: boolean, revealMore: () => void }`. Internal `stage` state
  (0/1/2) maps to `chunkSize`/`chunkSize*2`/`items.length` visible items. Generic over item type so
  the same hook drives a `<table>`'s rows and a tile `<div>` grid identically.
- **`src/components/RevealMoreButton.tsx`** — centered chevron-down button, renders nothing when
  `hasMore` is false.
- Applied in three places, each just swapping `words.map(...)` for `visible.map(...)` and adding the
  button after: `QuizRunner`'s pre-start/in-progress table, `ChoiceQuizRunner`'s table,
  `CharacterBrowse`'s tile grid.
- **Not applied** to `VocabTable`/`VocabTableGroup` — those pages (chapter word list, All Words) are
  dedicated "browse the vocab" pages where showing everything at once is the actual point, not an
  incidental pre-start dump on the way to a quiz. Different context, not this finding.

## Verification

- `tsc --noEmit` + `eslint .` clean.
- Live: a small chapter (≤20 words) shows no chevron, unchanged. A large custom-quiz/All-Words
  selection shows ~20 initially, the chevron, then 40 after one click, then everything after a
  second click, then no chevron.
