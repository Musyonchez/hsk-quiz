# Roadmap

Phased so each phase produces something runnable/checkable before moving on.

## Phase 1 — Scaffold + combined-level data

- Scaffold `website/` as a Next.js (App Router) + TypeScript + Tailwind project, with Prisma +
  SQLite wired up (per [05-architecture.md](05-architecture.md)).
- Write `lib/extract/extract-combined.ts` for HSK 1 and HSK 2 PDFs, seed into the `Word` table
  via `prisma/seed.ts`, verify by spot-checking a handful of rows across categories (Pronouns,
  Numerals, Nouns, Verbs) with `prisma studio` or a throwaway script.
- No UI yet — just prove the data pipeline produces correct, complete word lists in the DB.
- **Post-launch correction** (found much later, after Phase 5): diffed the HSK1 combined list
  against the official "生词 New Words" appendix in the actual HSK Standard Course 1 textbook
  (transcribed page-by-page via an LLM, since the scanned raw PDFs have no text layer — OCR via
  tesseract.js was tried first and rejected, see the git log around
  `combined-vocab-corrections.ts` for why). Found two words missing entirely (说, 一点儿) and
  three rows where the source PDF's pinyin belonged to a different character than the one it
  was paired with (饭馆 relabeled to 饭店 — the pinyin "fàndiàn" was already correct, just
  attached to the wrong character; 日→号; 没→没有). Fixed via a small, documented corrections
  step applied after extraction rather than editing the seeded DB by hand, so it survives a
  reseed.
- **HSK2 checked the same way** (its own textbook's appendix, pages 128-135): confirmed HSK2's
  combined list is independently sourced and cumulative (~300 words = all of HSK1 + HSK2's own
  new words), so HSK1's bugs had to be separately corrected in HSK2's copy too (饭馆→饭店,
  没→没有 both repeat; 日→号 does **not** — 日 is a genuine separate HSK2 word). Also found
  HSK2-specific issues: 男人/女人 replaced with the official 男/女, 玩 replaced with 玩儿, and
  10 words added (说, 一点儿 carried over from HSK1's gaps; 比, 宾馆, 公司, 面条, 铅笔, 虽然,
  往, 一下 genuinely missing from HSK2's own source PDF).
- Also confirmed via the same per-lesson transcription approach that all 15 HSK1 chapters'
  vocabulary matches the textbook exactly, except that the official lesson lists include a
  proper noun in 4 chapters that the curated markdown never captured (王方/谢朋 ch.10, 北京
  ch.11, 大卫 ch.13, 张 ch.14) — deliberately not added; see
  [03-content-extraction-rules.md](03-content-extraction-rules.md)'s proper-noun exclusion rule.
- **HSK2 chapters checked too** (per-lesson transcription of all 15 lessons): every chapter
  matches the textbook exactly with one exception — `hsk2/chapter1` still had a `花花` (a cat's
  name) row left over from *before* the proper-noun-exclusion rule existed. This surfaced a
  real gap in `prisma/seed.ts`: it only ever created/updated rows, never deleted ones a previous
  seed run had written that the current extraction no longer produces. Fixed `seed.ts` itself
  (not just this one row) to delete any DB row for a chapter/level not present in that run's
  fresh extraction output, so future corrections (word swaps, exclusion rules, anything) can't
  leave stale rows behind again. Verified zero orphans across every chapter and both combined
  lists after the fix.
- **HSK3 combined level stood up** (chapters still to come, one at a time): unlike HSK1/2,
  `raw/HSK-All-Levels-Vocabulary` already had a
  working `HSK 3 Vocabulary list.pdf` with a real text layer, just with a header typo
  ("Pinying" instead of "Pinyin") that silently produced zero rows until
  `pdf-vocab-table.ts`'s header match was loosened to a prefix check. Diffed the resulting
  600-word cumulative extraction against the official textbook appendix (pages 178-190,
  transcribed the same way as HSK1/2): one formatting bug (a POS annotation baked into the
  Chinese-column text itself, "花 （动）", folded into a single clean 花 row covering both its
  senses) and 18 genuinely missing words added, including a second reading of 只 (zhī, distinct
  from the already-present zhǐ).
  - That last one exposed a real limitation in `prisma/seed.ts`'s upsert matching: it keyed on
    `chinese` alone, so a word taught twice with two different readings (还 hái/huán, 长
    cháng/zhǎng, 只 zhǐ/zhī...) would have the second reading silently overwrite the first
    instead of creating a second row. Re-keyed both the upsert and the stale-row cleanup on
    `chinese`+`pinyin` together. This was latent risk for HSK1/2 too, not just new HSK3 data —
    reseeding after the fix didn't change their counts, since neither level happened to teach a
    second reading of the same character, but it would have silently eaten one the moment they
    did.
  - `isLevelNumber`, `extractAllCombinedLevels`/`extractAllChapters`, and `AppHeader`'s level
    nav all widened from a hardcoded 1/2 to include 3 (`AppHeader` now maps over
    `getLevelsOverview()` instead of hardcoding two links, so a future HSK4+ needs no header
    change at all).
  - HSK3 has no chapters yet — `characters/words/hsk3/` is still just the `.keep` placeholder —
    so the dashboard's HSK3 card correctly shows "0 chapters" until per-chapter content exists.
- **All 20 HSK3 chapters added** (per-lesson vocab, transcribed the same way as the combined
  appendix), but explicitly **not** as `characters/words/hsk3/chapterN/vocabulary.md` files —
  kept entirely inside `website/` instead
  (`src/lib/extract/hsk3-chapters-data.ts` + `extract-hsk3-chapters.ts`), per direct
  instruction not to add new content under `characters/words/`. `extractAllChapters()` merges
  this in alongside the markdown-based HSK1/2 chapters. No lesson titles exist in this source
  (unlike HSK1/2's "你好 Hello" style) — chapters are titled just "Lesson N" for now. Proper
  nouns and the appendix's "旧字新词" compound-word-from-known-characters sections are excluded
  from each lesson's word list, matching how HSK1/2 chapters work; two paired grammar-pattern
  skeletons (不但……而且…… in ch.18, 只有……才…… in ch.20) are excluded the same way `太……了`
  and `只有……才……` were excluded from the combined list. Verified via Playwright: all 20
  chapters render on the level hub, chapter 18's learn page matches the transcription exactly,
  and the chapter 1 quiz plays correctly against this new data source.
- **HSK4/5/6 architecture pivot: split into independent per-book `Level` rows (backend/DB only,
  no frontend changes yet — explicit instruction to batch frontend work for these levels into
  one later pass)**. An initial pass stood up HSK4/5/6 as three cumulative levels sourced from
  the `HSK-All-Levels-Vocabulary` PDFs (1200/2500/5008 words), the same pipeline as HSK1-3 —
  but each of HSK4/5/6 is actually published as two textbook volumes (上/下, "Book A"/"Book B"),
  and the cumulative-PDF list doesn't match either book's own vocabulary. That approach was
  **superseded**, not merely supplemented: `Level.number` (previously `@unique`) became a plain
  `Int` shared by a book pair, with a new `Level.slug` (`"1"|"2"|"3"|"4a"|"4b"|"5a"|"5b"|"6a"|
  "6b"`) as the actual unique key and a nullable `Level.part` (`"A"|"B"`) for display — HSK4A is
  now exactly as independent a `Level` entity as HSK1/HSK2 are, not a chapter grouping under one
  HSK4 row. `src/lib/hsk-level.ts`'s `HskLevel = 1|2|3|4|5|6` union was replaced with a
  `LevelSlug` type + `ALL_LEVELS: LevelDefinition[]` list (one entry per book actually seeded —
  only `1`/`2`/`3`/`4a` exist so far; `4b`/`5a`/`5b`/`6a`/`6b` get added one at a time as their
  textbook transcriptions arrive). HSK4A's combined word list (276 words) and its 10 chapters'
  per-lesson word lists come from the user's own clean transcription of the HSK4 (上册) textbook
  appendix and lesson vocab, transcribed the same way HSK3's chapters are
  (`hsk4a-combined-data.ts` + `hsk4a-chapters-data.ts`, plus `extract-hsk4a-chapters.ts` mirroring
  `extract-hsk3-chapters.ts`) — not parsed from any PDF, so no `combined-vocab-corrections.ts`
  entries were needed. `extract-combined.ts` now dispatches by slug: `1`/`2`/`3` still go through
  the cumulative-PDF + corrections pipeline, `4a` reads the in-repo data file directly, and any
  other slug throws (nothing else is wired up yet). `queries.ts`'s level lookups moved from a raw
  `number` parameter to `slug`, which required a minimal, purely mechanical fix to the existing
  HSK1/2/3 page files (passing the slug string through instead of `Number(param)`) — parameter
  marshaling to keep those pages working against the new schema, not new frontend functionality.
  The dev SQLite database was reset (not migrated) to add the new required `slug` column, since
  every row in it is reseedable from source data with no hand-entered content at risk. Verified
  zero orphans across every level/chapter after reseeding, `tsc --noEmit` and `eslint` both clean.
- **HSK4B added** the same way as HSK4A: `hsk4b-combined-data.ts` (268 words, from the HSK 4
  下册 textbook's own end-of-book appendix) and `hsk4b-chapters-data.ts` (10 chapters, lessons
  11-20 — chapter numbers follow the textbook's own continuous lesson numbering rather than
  restarting at 1, so the in-app "Lesson N" title matches what's printed in the book), plus
  `extract-hsk4b-chapters.ts` mirroring the HSK4A adapter, and a `"4b"` branch in
  `extract-combined.ts`'s dispatch. One new edge case: 省 (shěng) is taught twice in this book
  with the *same* pinyin but two different senses ("province" in lesson 13 vs. "to save,
  economize" in lesson 14) — unlike 还/长/只's homograph pairs, chinese+pinyin can't
  distinguish these two rows, so they're merged into one combined-list row the same way 花
  (flower; to spend) was merged for HSK3. `ALL_LEVELS` in `hsk-level.ts` now has `4a` and `4b`;
  `5a`/`5b`/`6a`/`6b` still pending their own transcriptions. Reseeded and verified: 268
  combined words (matches the transcribed appendix row count exactly, confirming the 省 merge
  didn't drop data) + 311 chapter words across the 10 chapters, `tsc --noEmit` and `eslint`
  clean.
- **HSK4+ paused, scoped back to HSK1-3 live on the site (explicit decision)**: HSK5A's and
  HSK5B's chapter data (18+18 lessons, `hsk5a-chapters-data.ts`/`hsk5b-chapters-data.ts` +
  matching `extract-hsk5*-chapters.ts` adapters) got fully transcribed, but both books'
  end-of-book combined-word appendix pastes repeatedly hit a message-length limit partway
  through transcription, and re-pastes kept landing at the same cutoff instead of continuing
  from it. Rather than keep fighting that, the decision was made to pause HSK4+ entirely:
  hand-transcribing PDF appendixes one message at a time doesn't scale past HSK4, and a
  different tool (DeepSeek) is planned to convert the raw PDFs going forward instead. `
  ALL_LEVELS` in `hsk-level.ts` was trimmed back to just `1`/`2`/`3`, and `extract-chapters.ts`'s
  `extractAllChapters()` no longer appends the HSK4A/4B/5A/5B adapters — so the live site (nav,
  dashboard, DB) only ever sees HSK1-3 again. The already-written HSK4A/4B combined+chapter data
  and HSK5A/5B chapter data are **not deleted** — they stay in `src/lib/extract/` unreferenced,
  ready to be wired back in (just re-add the slug to `ALL_LEVELS` and the adapter call to
  `extractAllChapters()`) once their remaining data arrives and HSK4+ resumes. The dev DB's
  stale HSK4A/4B `Level` rows (and their words/chapters) were deleted and the DB reseeded;
  confirmed only `1`/`2`/`3` remain, `tsc --noEmit` and `eslint` both clean.

## Phase 2 — Chapter data extraction ✅

- `lib/extract/extract-chapters.ts` walks all 30 chapters (HSK 1 + HSK 2), extracts the title
  (first line verbatim), the 词汇 table, and any Proper Nouns table per Rule 1 of
  [03-content-extraction-rules.md](03-content-extraction-rules.md). Verified against real files:
  335 chapter words total, deduped (Rule 3), zero missing-pinyin rows (Rule 4 never triggered
  in practice — the pinyin guide's claim that 词汇 tables are pinyin-complete held up).
- Real-data edge cases the parser had to handle, found by grepping all 30 files before writing
  it rather than assuming the two sample chapters generalized: the `#` column sometimes reads
  `*3` (a supplementary-word marker) rather than a plain number — ignored, since words are read
  positionally, not by that column; "Proper Nouns" tables appear under three different labels
  (`**Proper nouns:**`, `**Proper Nouns**`, and one inline `**专有名词 Proper Noun:** ...`
  variant with no following table) — the first two are parsed, the third (1 of 30 chapters,
  HSK 2 chapter 13's 杨笑笑) is a documented, deliberate gap rather than a one-off special case.
- **Decision on Rule 2 (grammar patterns): deferred, not automated.** With all 30 chapters'
  `## 注释 Grammar Notes` sections in hand, the headings aren't consistent enough to script
  "is this exam-relevant" reliably — numbered vs. unnumbered points, Chinese-first vs.
  English-first labels, and only HSK 2 chapters having a separate `grammer.md` at all. Judging
  exam relevance is exactly the kind of call that needs a human reading the grammar note, not a
  markdown-structure heuristic. `GrammarPattern` stays in the schema for future manual curation
  (or a later pass with a different approach), but `extract-chapters.ts` returns no
  `GrammarPattern` rows for now, and the per-chapter quiz's "Patterns" row group from
  [06-quiz-mechanics.md](06-quiz-mechanics.md) simply doesn't render until some exist.

## Phase 3 — Auth + accounts ✅

- Session cookie helpers, `/login` and `/register` pages, and `/api/auth/*` routes (login,
  register, logout, me) per [05-architecture.md](05-architecture.md).
- Pulled forward ahead of any content pages because attempts/leaderboard/friends all depend on
  a real logged-in user existing — building those first would mean faking auth and then
  redoing them.
- Public self-service registration, not provisioned accounts — `POST /api/auth/register`
  hashes the password and logs the new user in immediately. Verified end-to-end: register
  (success/duplicate/short-password), login (wrong/right password), session persistence via
  `/api/auth/me`, logout invalidating the session. Both pages styled against
  [10-color-palette.md](10-color-palette.md) from the start.

## Phase 4 — Answer-key table view (Landing, Dashboard, Level hub, Learn pages) ✅

- Public landing (`/`), session-protected Dashboard (`/dashboard`), `/hsk/[level]` level hub,
  and the chapter/combined Learn pages from [09-pages.md](09-pages.md), styled per
  [08-ui-ux.md](08-ui-ux.md).
- `/` ended up split into a public landing page and `/dashboard` mid-build — a first-time
  visitor should see the site exists (and get Log in/Register CTAs) without being redirected
  straight to `/login`, which is what a session-gated `/` would have done.
- No typing/scoring logic yet — confirms the data renders correctly, the design system holds
  up across real content, and navigation between levels/chapters works end to end. Verified via
  Playwright against the dev server (logged-out landing, logged-in landing, register →
  dashboard, level hub, chapter learn page, combined learn page's masonry grouping).

## Phase 5 — Quiz engine ✅

- Timer, score counter, input matching (per [06-quiz-mechanics.md](06-quiz-mechanics.md)),
  prev/next navigation, give-up.
- `src/quiz/pinyin-match.ts` (framework-free) and `<QuizRunner>` wired to both
  `/hsk/[level]/chapter/[chapter]/quiz` and `/hsk/[level]/combined/quiz`. No results
  persistence yet (`POST /api/attempts`, best-score, PLAY NEXT/ANOTHER) — that's Phase 6;
  finishing a quiz here just shows a local score/percentage and a Replay button.
- Found and fixed a real data edge case while testing against Chapter 1: one word (没关系) is
  stored with an internal space (`"méi guānxi"`), which the original trim-only normalizer
  didn't strip — `normalizePinyin` now strips all whitespace, not just the ends, so `meiguanxi`
  matches regardless of the source data's spacing.
- Also renamed the `--current` color token to `--current-row` before it was ever used in a
  utility class — Tailwind already reserves the bare word `current` for `currentColor`, and
  `bg-current-row` (as first used in this phase, for the quiz's current-row highlight) would
  have silently collided with it. See [10-color-palette.md](10-color-palette.md).
- Verified end-to-end via Playwright: full correct playthrough (100%, replay resets cleanly),
  pause/resume, prev/next, give-up (partial score reported correctly), and the combined-quiz
  route.

## Phase 6 — Results, leaderboard, friends

- Results screen (`POST /api/attempts`, best-score fetch), play-next/play-another linking.
- Leaderboard page (global + friends tabs) and Friends page (requests, accept flow) from
  [09-pages.md](09-pages.md).

## Phase 7 — Polish pass

- Visual pass to match the reference screenshots' look (dark cards, orange accent, table
  styling) and the icon set (`lucide-react`) consistently across every page built above.

## Explicitly deferred (not in any phase above)

- HSK 3 support (data doesn't exist yet — [[one-chapter-at-a-time]]).
- Listening or audio-based quiz modes.
- Cross-quiz progress/history page and friend search/directory (see
  [09-pages.md](09-pages.md)'s "Explicitly not building").
