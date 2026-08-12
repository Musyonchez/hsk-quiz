# Full sweep audit (Aug 2026): best practices, duplication, file structure, docs

Five parallel agents audited backend/data, frontend components, repo-wide file structure,
docs consistency, and infra/security against the current `main` (post-#38). This doc is the
consolidated findings + fix plan. Each item below gets a ✅ once implemented and verified.

## Backend / data
1. ✅ **`src/quiz/meaning-choices.ts` had its own private `shuffle`**, duplicating
   `src/quiz/shuffle.ts` (which was extracted specifically to kill this). Fixed: now imports the
   shared one.
2. Everything else re-confirmed clean (auth checks, rate limiting, indexes, migrations, env vars,
   no leftover hand-rolled-auth code). No action needed.
3. Not fixed (accepted, low severity, script-only): `scripts/backfill-mnemonics.ts` does one
   `updateMany` per dictionary entry (~790 sequential awaits). Maintenance script, not on the
   request path — left as-is.

## Frontend components
4. ✅ **`CharacterBrowse.tsx` had its own private `shuffle`** too — same fix as #1, now imports
   the shared one.
5. ✅ **`CharacterBrowse.tsx` had a shadow `ToolbarButton`** (different API, same name as the
   real shared component) — renamed to `BrowseToolbarButton` to stop it shadowing the real one.
6. ✅ **The four quiz runners' entire replay/lifecycle wrapper was still byte-for-byte
   duplicated** (`runId`/`activeWords`/`activeTrackAttempt`/`activeDurationSeconds`/
   `handleDrillMissed`) — extracted into `src/quiz/use-quiz-run-lifecycle.ts`, one shared hook
   used by all four.
7. ✅ **The submit-attempt effect, stats-default-open effect, and countdown-timer effect were
   duplicated near-verbatim across all four `*Inner` components** — extracted into
   `src/quiz/use-quiz-attempt-submission.ts` and `src/quiz/use-quiz-countdown.ts`.
8. ✅ **Free-text pinyin inputs had no accessible label** (placeholder-only) in `QuizRunner.tsx`
   and `CharacterQuizRunner.tsx` — added `aria-label`.
9. ✅ **`MatchQuizRunner` could auto-finish before the player starts on a 0-word quiz**
   (`leftBoard.length === 0` short-circuits `finished` to `"completed"` on first render) — guarded
   with `words.length > 0 &&`.
10. Not fixed (accepted, cosmetic/behavioral nuance, low severity): the multiple-choice answer
    button className duplication (M3), `aria-pressed` inconsistency across choice-style UIs (L1),
    `CharacterQuizRunner` having no Hard-mode toggle (L2 — believed intentional, "character mode
    is already the hard variant of pinyin/English modes"; left as a documented decision, not a
    gap), `CustomQuizPicker.tsx` internal sub-component extraction (L3), and unmemoized
    score/answered-count recomputation (L4, negligible at current quiz sizes). None are bugs;
    revisit only if they start causing real friction.

## Repo-wide file structure
11. ✅ **`src/components/` was flat with 27 files spanning 5+ unrelated concerns** — split into
    `src/components/{quiz,auth,friends,layout,vocab}/` subfolders, ui-atoms (`ToolbarButton`,
    `SpeakerButton`, `pill-classes`) stay at the top level of `components/` as genuinely shared
    primitives.
12. ✅ **`src/lib/` mixed infra/auth/domain helpers with no grouping** — grouped into
    `src/lib/auth/` (auth.ts, auth-client.ts, require-session.ts, send-email.ts) and left
    `db.ts`/`rate-limit-storage.ts`/`api-rate-limit.ts`/`hsk-level.ts`/`queries.ts`/`site-url.ts`
    at the top level (still infra/domain, not overloaded enough to need their own subfolder yet).
    `audio-player.ts` moved to `src/quiz/audio-player.ts` (it's quiz-domain, not general infra —
    the manifests it plays already live in `src/quiz/audio/`).
13. ✅ Fixed stray `docs/34` reference in `src/quiz/types.ts` (pointed at the doc that actually
    superseded it — `docs/39-memory-aid-mnemonics-plan.md`).
14. Not fixed (accepted, archived/unused, trivial): stale self-referencing path comment in
    `docs/hold/15-run.ps1`. Archived docs aren't worth churn.

## Docs consistency
15. ✅ `docs/43-audit-docs-consistency.md` was itself stale (every finding already fixed, but
    carried none of the "✅ Fixed" annotations its sibling audits use) — annotated in place.
16. ✅ `docs/06-quiz-mechanics.md`, `docs/40` item 22, `docs/44` §5 all still described Hard mode
    as pinyin-only — corrected now that it's universal (pinyin/English/character... see note on
    #10 above for why CharacterQuizRunner is the one deliberate exception).
17. ✅ `docs/01-overview.md` and `docs/07-roadmap.md` still listed "no audio" as a non-goal/
    deferred item — reversed now that word/sentence pronunciation audio has shipped (docs/47),
    matching the annotation pattern already used for the email/forgot-password reversal.
18. ✅ Added a short SEO section to `docs/05-architecture.md` (robots.ts/sitemap.ts/OG/JSON-LD
    weren't documented anywhere).
19. ✅ `docs/05-architecture.md`'s schema outline was missing `Word.mnemonic` and `DialogLine`.
20. ✅ `docs/01`/`docs/04`/`docs/05`/`docs/07` still modeled a phantom `website/` monorepo wrapper
    that no longer exists — corrected to describe the repo root directly.
21. ✅ Added `docs/README.md` as a real index (current/living docs vs. dated incremental log vs.
    archived), since the docs folder has grown to 50 files with no map.

## Infra / security
No high-severity findings. Everything already reflects the prior `docs/45` audit pass
consistently (CSP, cron auth fail-closed, rate limiting on both better-auth and app routes,
input validation, no error/stack leakage, correct authorization checks on friend-request
mutations). Remaining items are deliberate low-priority tradeoffs, not bugs — left as-is:
- CSP's `'unsafe-inline'` on `script-src`/`style-src` (documented tradeoff already, nonce-based
  CSP would need touching every page that renders a script — bigger lift than this sweep).
- A handful of dependencies (`lucide-react`, `react`/`react-dom`, `tsx`) are a patch/minor version
  behind latest — not urgent, `npm audit --audit-level=high` in CI is the actual safety net.
- No `security.txt` — fine for this app's current scale (personal-scale, no bug bounty program).
