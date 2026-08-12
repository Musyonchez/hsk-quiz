# Quiz Mechanics

Directly modeled on the four reference screenshots supplied for this feature. This doc covers
only the quiz screen's own interaction and scoring behavior — where it sits in the site, what
links to it, and every other page are covered in [09-pages.md](09-pages.md) and
[08-ui-ux.md](08-ui-ux.md).

## Pre-quiz: answer-key table ("Learn" view)

Before playing, a full table of the quiz's words is visible: `Chinese | Pinyin | English`
columns, arranged in a 3-column-of-tables grid (as in the combined-level screenshot) or a
single table for a chapter-sized list (~10-20 words). Header row: `PLAY QUIZ` button + `Learn`
toggle, `SCORE 0/N`, `TIMER 10:00` (configurable, default matches reference).

## During the quiz

- One row's Chinese word is shown large at the top-left with a colon (e.g. `公斤:`), plus a
  text input for typing the pinyin.
- The same answer table stays visible below, with the **current word's row highlighted
  yellow** and Pinyin cells filling in (green background implied by the "already answered"
  rows in the screenshots) as each word is answered correctly.
- Controls: `PREV` / `NEXT` (manual navigation, not auto-advance-only), pause button (`⏸`),
  live `SCORE x/148`-style counter, live countdown `TIMER`, and a `Give Up` link.
- Typing is checked incrementally against the target pinyin for the current word, but tone
  marks are stripped from both sides before comparing — typing `gongjin` for `gōngjīn` counts
  as correct. This is a deliberate final decision (not tentative): there's no way to type tone
  diacritics on a normal keyboard without an IME, so requiring them would make the quiz
  untypeable rather than just strict.

## Answer matching rule

- Case-insensitive.
- **Tone-free**: normalize the stored pinyin by stripping tone diacritics (ā/á/ǎ/à → a,
  ē/é/ě/è → e, ī/í/ǐ/ì → i, ō/ó/ǒ/ò → o, ū/ú/ǔ/ù → u, ǖ/ǘ/ǚ/ǜ → ü → u/v) before comparing to
  the raw typed input. The *letters* still have to be exactly right — only the tone mark on
  top of a correctly-typed letter is ignored, not the letter itself. So `gongjin` matches
  `gōngjīn`, but `gongjun` (wrong vowel) still does not.
- ü handling: accept both `u` and `v` for `ü` in the typed input (common ASCII pinyin
  convention, e.g. `nv` or `nu` for 女/nǚ), normalizing `ü` → `u` on the stored side so either
  typed form matches.
- Multi-character words are typed as one continuous string with no forced space
  (`gongjin`, not `gong jin`) to match how pinyin appears in the source tables.

## End of quiz: results screen

- Big score percentage (`2%` in the screenshot — correct/total).
- A random quote/blurb slot (cosmetic; can be a static rotating list of short encouragement
  strings, no external dependency).
- `REPLAY` (same quiz, reset) and `STATS` (per-word right/wrong breakdown for this attempt).
- `PLAY NEXT` — links to the next chapter in the same level (chapter N+1, wrapping to the
  Combined quiz after the last chapter, or to HSK 2 chapter 1 after HSK 1's combined quiz).
- `PLAY ANOTHER` — links to a different quiz entirely (e.g. jump to the other level's combined
  quiz) — a simple "suggest something else" card, not a recommendation engine.
- **Your best score** for this quiz, fetched from `GET /api/attempts/best` and written via
  `POST /api/attempts` on finish, per [05-architecture.md](05-architecture.md) — a real
  server-side record tied to your logged-in account, not `localStorage`.
- **`AVG SCORE`** — reproduced for real now that there's a `User` table: average of all users'
  best scores for this `quizKey`. Computed client-side by averaging the array returned from
  `GET /api/leaderboard?quizKey=&scope=global` — that endpoint returns every ranked row
  unpaginated (this is a small personal site, not a public-scale product, so there's no need
  for a separate aggregate endpoint or server-side `AVG()` query — revisit if the user count
  ever grows enough for that assumption to stop holding).
- **`AVG FRIEND SCORE`** — same client-side average, over `GET
  /api/leaderboard?quizKey=&scope=friends` instead. A link from here into the full leaderboard
  page — see [09-pages.md](09-pages.md).

## Character mode (rebuilt per docs/38-character-mode-overhaul-plan.md)

Character is one self-contained "island" (`CharacterIsland`), not a bare runner — it opens on a
browse view, then hands off into its own quiz, with no separate mode needed to reach either half.
There is no standalone Study mode anymore; the flashcard-style browsing it used to offer lives
inside Character's own flow instead. Every scale that enables Character mode (Learn pages,
`AllWordsTabs`, the Custom Quiz picker, `QuizModeGate`'s own picker) gets the exact same
`CharacterIsland` flow — chapter-scale quizzes no longer fall back to a separate click-to-pair
matching board the way meaning-match still does. Tracked runs get a `-char` suffixed `quizKey`,
its own leaderboard family.

### Browse (`CharacterBrowse`)

A grid of boxes, one per word — enlarged character and pinyin only, no English in the box. A
"Show/hide pinyin" toggle (on by default) and a Shuffle button sit above the grid. Clicking a box
opens a lightbox popup (not a route change) showing that word's character, pinyin, English
meaning, and mnemonic when one exists (`QuizWord.mnemonic`, currently unpopulated everywhere —
see "Mnemonics" below). The popup stays open while moving between words: Prev/Next buttons, left/
right arrow keys, and touch swipe all advance within the same (possibly shuffled) grid order;
Escape, the close button, or a backdrop click dismiss it. A "Start quiz" button in the toolbar
moves from browsing into the quiz half below.

### Quiz (`CharacterQuizRunner`)

Two mutually exclusive answer formats, picked before the quiz starts — choosing one hides the
other's controls entirely:

- **Pinyin test** — prompt is the character, the player types the pinyin from memory
  (`matchesPinyin`, same tone-free rule as Pinyin mode). Auto-advances silently on a correct
  match; a **Skip** button marks the word missed and advances, since typing has no "give up on
  this one" affordance otherwise.
- **English test** — prompt is the character, the player picks the English meaning from 2-5
  ranked options (`buildChoices`/`meaning-choices.ts`, the same infrastructure English mode
  uses). No Skip needed — any pick immediately advances.

Both formats show a live **"Missed: N"** counter next to the existing `ANSWERED n/total`
indicator, updating in real time rather than only being computable at the end — the one mechanic
borrowed from the `word-drill` reference project docs/38 cites. Everything else (sticky toolbar,
Prev/Next/Pause/Give up, timed mode, end-of-quiz stats, drill-missed, leaderboard) is the same
pattern every other runner in this app uses.

### Mnemonics (per docs/39-memory-aid-mnemonics-plan.md)

Every distinct Chinese word across all 3 HSK levels (774 total) has a hand-written mnemonic,
backfilled onto `Word.mnemonic`. Source dictionaries live in `src/quiz/mnemonics/` — one file per
level (`hsk1.ts`/`hsk2.ts`/`hsk3.ts`), each holding only the words new to that level (not
repeated every time a higher level's cumulative "combined" list includes them again) —
`scripts/backfill-mnemonics.ts` applies a dictionary's entries to every `Word` row sharing that
`chinese` text, across every level/chapter/source it appears under. `QuizWord.mnemonic` still
reads straight off the DB row, no runtime lookup into these files. A word without an entry (there
shouldn't be any at this point, but the popup doesn't assume otherwise) still just skips the
mnemonic line rather than rendering a placeholder.

## Hard mode (optional, per docs/hold/28-progressive-difficulty-plan.md)

An opt-in toggle on the pre-quiz "Start quiz" screen (`QuizRunner`, Type pinyin mode first —
see docs/28 for why the other modes come later), set the same way Shuffle already is: before
starting, not mid-run. With it on, the English column is blanked too, alongside the pinyin
column the typing quiz already blanks — the player recalls from the Chinese character alone
instead of Chinese+English, revealing both hidden columns for a row once it's answered. Tracked
runs get a `-hard` suffixed `quizKey` (`withHardSuffix` in `quiz-key.ts`), so hard-mode scores
never mix into a normal run's leaderboard.

## Grammar-pattern items (optional, from Rule 2 of extraction)

Chapters that yield a qualifying structural pattern (e.g. `是...的`, `把`-sentence) get an
extra, clearly-separated "Patterns" row group at the bottom of the same chapter quiz rather
than a whole separate quiz — keeps the per-chapter quiz count 1:1 with chapters. Typing target
for a pattern item is the skeleton itself (e.g. `shì ... de`), not a full example sentence.
