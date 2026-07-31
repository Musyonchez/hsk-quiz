# Roadmap

Phased so each phase produces something runnable/checkable before moving on.

## Phase 1 — Scaffold + combined-level data

- Scaffold `website/` as a Next.js (App Router) + TypeScript + Tailwind project, with Prisma +
  SQLite wired up (per [05-architecture.md](05-architecture.md)).
- Write `lib/extract/extract-combined.ts` for HSK 1 and HSK 2 PDFs, seed into the `Word` table
  via `prisma/seed.ts`, verify by spot-checking a handful of rows across categories (Pronouns,
  Numerals, Nouns, Verbs) with `prisma studio` or a throwaway script.
- No UI yet — just prove the data pipeline produces correct, complete word lists in the DB.

## Phase 2 — Chapter data extraction

- Write `lib/extract/extract-chapters.ts` per
  [03-content-extraction-rules.md](03-content-extraction-rules.md), starting with HSK 1 (no
  `grammer.md` to juggle) then HSK 2.
- Spot-check a few chapters' output against their source `vocabulary.md` by hand, particularly
  the dedup rule (Rule 3) and the empty-pinyin guard (Rule 4).
- Decide, with real chapter data in hand, whether any chapters actually produce a qualifying
  Rule 2 grammar-pattern item — if none do in practice, drop that feature rather than keep
  speculative code for it.

## Phase 3 — Auth + accounts

- `scripts/create-user.ts` provisioning script, session cookie helpers, `/login` page and
  `/api/auth/*` routes (per [05-architecture.md](05-architecture.md)).
- Pulled forward ahead of any content pages because attempts/leaderboard/friends all depend on
  a real logged-in user existing — building those first would mean faking auth and then
  redoing them.

## Phase 4 — Answer-key table view (Home, Level hub, Learn pages)

- Home, `#/hsk{N}` level hub, and the chapter/combined Learn pages from
  [09-pages.md](09-pages.md), styled per [08-ui-ux.md](08-ui-ux.md).
- No typing/scoring logic yet — confirms the data renders correctly, the design system holds
  up across real content, and navigation between levels/chapters works end to end.

## Phase 5 — Quiz engine

- Timer, score counter, input matching (per [06-quiz-mechanics.md](06-quiz-mechanics.md)),
  prev/next navigation, give-up.
- Build against one chapter first, verify the interaction loop feels right before wiring it up
  to every quiz.

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
