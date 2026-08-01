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

## Grammar-pattern items (optional, from Rule 2 of extraction)

Chapters that yield a qualifying structural pattern (e.g. `是...的`, `把`-sentence) get an
extra, clearly-separated "Patterns" row group at the bottom of the same chapter quiz rather
than a whole separate quiz — keeps the per-chapter quiz count 1:1 with chapters. Typing target
for a pattern item is the skeleton itself (e.g. `shì ... de`), not a full example sentence.
