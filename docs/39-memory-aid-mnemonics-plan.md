# Memory-aid mnemonics for Character mode's popup

## Why, and why restarted

docs/38 built the `mnemonic` field into `QuizWord` and `CharacterBrowse`'s popup, rendering a
mnemonic line only when one exists. The actual dictionary was previously a paused WIP branch
(`feat/memory-aid-mnemonics`) with HSK1 hand-written and HSK2/HSK3 never started — deleted and
restarted here rather than resumed, since the app has changed shape significantly since that
branch began (auth migration, the whole Character mode rebuild) and it's cleaner to author the
content once, fresh, against what the app actually looks like today. Scope this time: **all
three HSK levels**, not just HSK1.

**Confirmed scope**: mnemonics render in exactly one place — Character mode's browse popup
(`CharacterBrowse.tsx`). They don't appear in either quiz format, in Pinyin mode, or in English
mode anywhere.

## Data shape

One distinct Chinese word can appear on several `Word` rows — a "chapter" row (curated New
Words), a "dialog" row (that chapter's full transcript vocabulary), and a "combined" row, and
since a level's "combined" list is cumulative through every earlier level (docs/17), the same
word can also recur under a *higher* level's combined rows (e.g. 你好 is HSK1-native but also
sits in HSK2 and HSK3's combined word lists). All of those rows share one mnemonic — there's one
`chinese` -> mnemonic mapping, applied to every row with that `chinese` regardless of level,
chapter, or source.

Measured against the live DB: 5,303 `Word` rows, 774 globally distinct `chinese` values. Bucketed
by the *lowest* level a word first appears at (so each word is authored exactly once, not
re-authored every time "combined" repeats it at a higher level): **191 new at HSK1, 200 new at
HSK2, 383 new at HSK3** — 774 total, matching the global distinct count.

## Authorship: one agent per level, not fanned out in parallel within a level

Per the original docs/38 reasoning (still correct; that section originally cited a "docs/34" that
never actually landed in the repo — see [43-audit-docs-consistency.md](43-audit-docs-consistency.md)
and the note now in docs/38's own "Mnemonics" section): generating a word's mnemonic content via
several agents working the same list in parallel risks inconsistent voice/format between
batches. One agent gets one level's full bucket as one continuous pass. Each agent works from
the same shared style guide (below) so tone stays consistent *across* levels too, not just
within one.

### Style guide (given to every agent)

- Short — one or two sentences, not a paragraph.
- English, plain and a little playful is fine, but not jokey filler that adds no memory value.
- Actually mnemonic: hook onto the character's shape, a sound-alike, a radical's meaning, or the
  pinyin — something a learner can actually hang the word on, not just a restated definition.
- No markdown, no emoji, no trailing punctuation-as-decoration — plain text, rendered as-is in
  the popup.
- Don't restate the English meaning as the whole mnemonic ("好 means good" is not a mnemonic).

## Files

- `src/quiz/mnemonics/hsk1.ts`, `hsk2.ts`, `hsk3.ts` — each `Record<string, string>` keyed by
  `chinese` text, one file per level's *new-at-this-level* bucket (not cumulative — HSK2's file
  only has the 200 words new to HSK2, not HSK1's 191 again).
- `src/quiz/mnemonics/index.ts` — merges the three into one lookup map, used only by the backfill
  script below (not read at request time — the popup reads `Word.mnemonic` off the DB row like
  every other field, per docs/38).
- `scripts/backfill-mnemonics.ts` — one pass: for every `[chinese, mnemonic]` pair in the merged
  map, `UPDATE "Word" SET mnemonic = $1 WHERE chinese = $2` (every row, every level, every
  source). Idempotent — safe to re-run after editing a mnemonic.
- `prisma/schema.prisma` / migration `20260812043000_word_mnemonic` — nullable `Word.mnemonic`
  column. Already added; no backfill happens in the migration itself.

## Verification

- Every one of the 774 words has a non-empty entry across the three files (a script check, not
  just eyeballing).
- `tsc --noEmit` / `eslint .` clean.
- Backfill script run against the dev DB; spot-check a handful of popups across all 3 levels
  live (Playwright) — mnemonic line renders, matches the authored text, still hidden entirely
  for any word without one.
- `docs/06-quiz-mechanics.md`'s "Mnemonics" note updated from "unpopulated everywhere" to
  describe the real dictionary.
