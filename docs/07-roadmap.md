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
