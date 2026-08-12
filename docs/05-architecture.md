# Site Architecture

## Tech stack

- **Next.js (App Router) + TypeScript** for both frontend and backend — pages are React
  Server/Client Components under `app/`, and the JSON API lives alongside them as Route
  Handlers (`app/api/**/route.ts`). One framework, one dev server, one deploy artifact; no
  separate Express process and no hand-rolled dev-proxy config.
- **Tailwind CSS** for styling. The design tokens in [08-ui-ux.md](08-ui-ux.md) (dark palette,
  the single orange accent, spacing/typography scale) are configured once in
  `tailwind.config.ts` as theme extensions, so every component pulls from the same source of
  truth instead of hardcoding colors per-component.
- **lucide-react** for icons (pause, play, prev/next chevrons, trophy for leaderboard, users
  for friends, etc.) — a single consistent icon set rather than mixing emoji/ad-hoc SVGs.
- **Database, via an ORM (Prisma 7)**: a single Neon Postgres database, shared by dev and prod
  alike (`DATABASE_URL`) — see
  [20-postgres-vercel-migration-plan.md](hold/20-postgres-vercel-migration-plan.md) for how this
  replaced an earlier SQLite-in-dev/Postgres-in-prod split (the migration that moved hosting
  from Render to Vercel, since Vercel's serverless functions can't hold a persistent SQLite
  file on disk). No branch split between dev/prod yet — revisit once the site has real
  production data worth isolating.
  - **Prisma 7 requires an explicit driver adapter** (`PrismaClient({ adapter })`) — there's no
    more implicit "just point `DATABASE_URL` at it" connection. The app uses
    `@prisma/adapter-neon` (`src/lib/db.ts`), which talks to Postgres over HTTP/WebSockets via
    `@neondatabase/serverless` rather than a pooled TCP connection — the right fit for many
    short-lived Vercel serverless function instances hitting a small database, per
    [20](hold/20-postgres-vercel-migration-plan.md)'s Decisions section.
  - Prisma Migrate handles schema versioning from a single migration history, applied to the
    one shared database.

## Why a real backend instead of static JSON (superseding the earlier draft)

Two earlier drafts of this doc are superseded here: first a fully static site with build-time
JSON and no server, then a separate Vite frontend + Express backend. The requirement is a
self-sufficient app with its own database (a hosted Postgres instance, shared by dev and prod)
plus real accounts — Next.js's Route Handlers give a server process to own the database connection and
sessions without maintaining a second HTTP server/build config alongside the frontend one. The
vocabulary content lives as in-repo TypeScript data (`src/lib/extract/hsk*-data.ts`), but it's
*seeded into the database* rather than shipped as static JSON — see
[04-data-pipeline.md](04-data-pipeline.md).

## Database schema (outline)

```
Level        { id, slug (unique — "1"|"2"|"3"|"4a"|"4b"|"5a"|"5b"|"6a"|"6b"),
               number (1-6, shared by a level's A/B book pair), part ("A"|"B"|null), name }
Chapter      { id, levelId, number, title }
Word         { id, chapterId? (null for combined-only words), levelId,
               chinese, pinyin, wordType, meaning, category (nullable, PDF word-class),
               source ("chapter" | "combined" | "dialog"),
               mnemonic (nullable — 39-memory-aid-mnemonics-plan.md's backfilled memory aid) }
DialogLine   { id, chapterId, order, dialogNumber, dialogLabel?, speaker, chinese, pinyin,
               english — a chapter's full dialog transcript in reading order
               (docs/hold/25-chapter-all-words-plan.md's "All Words" feature); separate from
               the "dialog"-source Word rows the same chapter also gets (those exist so the
               dialog's vocabulary can appear in the All Words quiz — this table is purely the
               transcript, with speaker/scene context Word rows don't carry) }
GrammarPattern { id, chapterId, label, pinyinSkeleton, note }

User         { id, username, displayUsername, displayName, email, emailVerified, image, createdAt, updatedAt }
Session      { id, token, expiresAt, ipAddress, userAgent, userId, createdAt, updatedAt }
Account      { id, accountId, providerId, userId, password, accessToken/refreshToken/idToken (unused —
               no OAuth wired up), createdAt, updatedAt }   -- better-auth's credential-storage table
Verification { id, identifier, value, expiresAt, createdAt, updatedAt } -- reset-password tokens
RateLimit    { id, key, value, expiresAt }               -- durable rate-limit counters, see below
Friendship   { id, userId, friendId, status ("pending" | "accepted" | "ignored"), createdAt }
Attempt      { id, userId, quizKey ("hsk1-chapter5" | "hsk1-combined" | ...),
               score, total, durationSeconds, createdAt }
```

`quizKey` is the stable identifier used everywhere (routes, API, `Attempt.quizKey`) so a quiz
is addressable without joining through Level/Chapter every time.

`Friendship` is stored as one directional row per request (`userId` sent the request to
`friendId`); "are these two friends" is `status = "accepted"` in either direction — query
helper, not a second table, to avoid an accept flow writing two rows that can drift apart.
"Ignore" on the [Friends page](09-pages.md) sets `status = "ignored"` rather than deleting the
row — this both stops it showing as pending again and blocks the same sender from spamming a
new request to the same person (a repeat `POST /api/friends/requests` for a row already in
`ignored` is a no-op, not a new pending row).

## Accounts and auth

**Rewritten as of [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md) and
hardened by [37-auth-hardening-and-ux-plan.md](37-auth-hardening-and-ux-plan.md)** — this section
used to describe a hand-rolled scrypt+session-token system with no email/forgot-password support;
that system is gone. Auth is now the self-hosted [better-auth](https://better-auth.com) library
(`src/lib/auth/auth.ts` — moved into its own subfolder alongside `auth-client.ts`/
`require-session.ts`/`send-email.ts` per docs/50's full-sweep audit), talking to the same
Prisma/Neon database everything else uses, via the `prismaAdapter`:

- **Public self-service registration**: username + password + **email** (the email exists solely
  to support password reset — no verification step is required to use the account). `advanced.
  database.generateId: "serial"` keeps `User.id` a plain Int autoincrement, so `Friendship`/
  `Attempt`'s existing Int foreign keys needed no changes for the migration; a `user.fields.name`
  mapping keeps the physical column named `displayName` so every other query in the app
  (`queries.ts`, `LeaderboardTable`, `UserBadge`) reads it unchanged. The `username` plugin adds a
  real, unique `username` column alongside email, so login stays username+password (or
  email+password — both are accepted at the single login field) rather than switching to
  email-only.
- **Sessions**: better-auth's own `Session` table (httpOnly, `Secure`, `SameSite=Lax` cookie;
  7-day expiry with a rolling 1-day refresh), checked via `getSessionUser()` in `src/lib/auth.ts`
  — same name/signature the old hand-rolled helper had, so every call site (`requireSession()`,
  API routes, `AppHeader`) needed no changes.
- **Password reset**: a real forgot-password/reset-password flow, `POST /forget-password` sends a
  reset email via Gmail SMTP (`src/lib/auth/send-email.ts`, `GMAIL_USER`/`GMAIL_APP_PASSWORD` env
  vars); `revokeSessionsOnPasswordReset: true` kills every other session on a successful reset.
  `ChangePassword` (`/account`) does the equivalent for an already-logged-in user, rotating the
  acting session's token while revoking every other one.
- **Rate limiting**: a custom Postgres-backed `secondaryStorage` adapter
  (`src/lib/rate-limit-storage.ts`) gives durable, atomic rate-limit counters that survive
  serverless cold starts — `customRules` throttle `/sign-in/username`, `/sign-in/email` (3 per
  10s), `/sign-up/email` (5 per 60s), and `/forget-password` (3 per 60s). ✅ The registration gap
  [45-audit-infra-security.md](45-audit-infra-security.md) originally flagged here is closed —
  sign-up now has its own explicit rule too, not just the generous global default.
- Every route that reads/writes `Attempt` or `Friendship` requires a valid session. Vocabulary
  reads have no dedicated API routes at all — Server Components call `lib/queries.ts` directly,
  and since there's no reason to gate looking at vocabulary behind login, those pages stay
  public/unauthenticated too — only progress tracking and social features need an identity.

## Folder layout

✅ Corrected (docs/50 full-sweep audit §20): earlier drafts of this doc were written when the app
lived nested inside a `website/` folder in a larger monorepo (`docs/02-data-sources.md` still
covers that history). That nesting is gone — `website/`'s former contents *are* the repo root
today, so read every path below relative to the repo root, not under a `website/` prefix. Also
updated for the `src/components`/`src/lib` reorg (docs/50 §11-12) and the SEO layer (docs/36/37).

```
docs/                        # planning docs (this folder)
prisma/
  schema.prisma
  migrations/
  seed.ts                    # calls lib/extract/* and writes rows via Prisma
src/
  app/
    layout.tsx               # <AppHeader> + Tailwind globals + SEO metadata (metadataBase,
                               # OpenGraph/Twitter, JSON-LD — docs/37's SEO-layer PRs)
    page.tsx                 # "/" — marketing landing page when logged out,
                               # last-played + level grid when logged in (no
                               # separate /dashboard route; folded in here as
                               # of docs/25's landing-page update, replacing
                               # what 09-pages.md §1.5 originally described)
    robots.ts                # MetadataRoute.Robots — public routes only, points at sitemap.xml
    sitemap.ts               # MetadataRoute.Sitemap — same 4 public routes as robots.ts
    opengraph-image.tsx      # next/og ImageResponse — Latin "HSK" text, not the icon's "词"
                               # glyph (Satori has no CJK fallback font, see docs comment there)
    login/page.tsx
    register/page.tsx
    forgot-password/page.tsx
    reset-password/page.tsx
    account/page.tsx                            # change-password (docs/37)
    hsk/[level]/page.tsx                       # Level hub
    hsk/[level]/chapter/[chapter]/page.tsx      # Learn page
    hsk/[level]/chapter/[chapter]/quiz/page.tsx # Quiz + results, ?mode=type|meaning|character
    hsk/[level]/chapter/[chapter]/all/page.tsx       # full dialog transcript (docs/hold/25)
    hsk/[level]/chapter/[chapter]/all/words/page.tsx # flat "All Words" vocab list
    hsk/[level]/chapter/[chapter]/all/quiz/page.tsx  # quiz over All Words instead of New Words
    hsk/[level]/combined/page.tsx
    hsk/[level]/combined/quiz/page.tsx
    hsk/[level]/custom/quiz/page.tsx            # single-level, multi-chapter custom quiz
    custom-quiz/page.tsx                        # cross-level custom quiz picker
    custom-quiz/quiz/page.tsx                   # cross-level custom quiz runner
    leaderboard/page.tsx                        # level/chapter picker, mode tabs
    leaderboard/[quizKey]/page.tsx
    friends/page.tsx
    api/
      auth/[...all]/route.ts    # better-auth's catch-all handler — replaces the old
                                 # auth/{login,register,logout,me}/route.ts foursome
                                 # entirely as of docs/36
      attempts/route.ts
      attempts/best/route.ts
      leaderboard/route.ts
      friends/route.ts
      friends/requests/route.ts
      friends/requests/[id]/accept/route.ts
      friends/requests/[id]/ignore/route.ts
      cron/purge-rate-limits/route.ts  # Vercel Cron target (vercel.json), sweeps expired
                                        # RateLimit rows — CRON_SECRET-gated, see 21-vercel-deploy.md
                             # no vocab API routes — vocab pages read lib/queries.ts
                             # directly from Server Components, see "Accounts and auth" above
  components/                 # reorganized into subfolders by concern (docs/50 §11):
    quiz/                      # QuizRunner, ChoiceQuizRunner, MatchQuizRunner,
                               # CharacterQuizRunner (docs/38), QuizModeGate, QuizResultsScreen,
                               # QuizLinkCard, CustomQuizPicker, CharacterBrowse, CharacterIsland
    auth/                      # PasswordField, ChangePasswordForm, ResetPasswordForm, LogoutButton
    friends/                   # AddFriendForm, FriendRequestRow, UserBadge
    layout/                    # AppHeader, MobileNav, HeaderHeightVar
    vocab/                     # VocabTable, AllWordsTabs, LeaderboardTable
    ToolbarButton.tsx          # shared ui atoms, used across multiple groups above — stay at
    SpeakerButton.tsx          # the top level rather than owned by any one subfolder. Note:
    RevealMoreButton.tsx       # pill-shaped buttons are a `pillClasses()` class-string helper
    pill-classes.ts            # (`components/pill-classes.ts`), not a `<PillButton>` component.
  lib/
    extract/                # extract-combined.ts, extract-chapters.ts (dispatch by level
                             # slug to the right in-repo data file — no PDF/markdown I/O);
                             # hsk{1,2,3}-chapters-data.ts / hsk{1,2,3}-combined-data.ts
                             # hold each level's word lists as plain TS data, fully
                             # self-contained in-repo; hsk4a/4b-*-data.ts hold HSK4A's and
                             # HSK4B's word lists the same way — HSK4/5/6 are split into
                             # independent per-book Level rows (see hsk-level.ts), each
                             # sourced from that book's own textbook appendix
    auth/                    # betterAuth() config + getSessionUser() (auth.ts, docs/36),
                             # createAuthClient() for Client Components (auth-client.ts),
                             # Server Component session guard (require-session.ts), Gmail
                             # SMTP sender for password-reset emails (send-email.ts) —
                             # grouped per docs/50 §12
    db.ts                    # Prisma client singleton (PrismaNeon driver adapter)
    rate-limit-storage.ts    # Postgres-backed secondaryStorage adapter for better-auth's
                             # rate limiter (durable across serverless cold starts)
    api-rate-limit.ts        # same RateLimit table/upsert pattern, for this app's own routes
                             # (/api/attempts) rather than better-auth's endpoints
    queries.ts               # all read queries vocab pages/leaderboard/friends call directly
    site-url.ts               # VERCEL_ENV-gated base-URL resolution, shared by auth/layout/
                             # robots.ts/sitemap.ts/page.tsx's JSON-LD
    use-progressive-reveal.ts # tiered pre-start reveal (docs/48), shared by quiz tables +
                             # CharacterBrowse's tile grid
  quiz/                      # quiz engine: input matching, scoring, timer, mnemonics
                             # (framework-free) — see 06-quiz-mechanics.md,
                             # 39-memory-aid-mnemonics-plan.md. Also home to the shared
                             # use-quiz-run-lifecycle.ts / use-quiz-attempt-submission.ts /
                             # use-quiz-countdown.ts hooks the four runners all use (docs/50
                             # §6-7) and audio-player.ts (moved from lib/, docs/50 §12) +
                             # audio/{words,sentences}.ts manifests (docs/47)
tailwind.config.ts
next.config.ts
vercel.json                 # Vercel Cron schedule for /api/cron/purge-rate-limits
package.json
```

## API surface (outline)

| Method & path | Auth? | Returns |
|---|---|---|
| `/api/auth/[...all]` | varies | better-auth's own catch-all handler — sign-in/sign-up/sign-out, forget/reset-password, change-password, session lookup, all live under this one route as of docs/36. Not a hand-maintained table of sub-paths here; see `better-auth`'s own docs for the exact endpoint list it exposes. |
| `POST /api/attempts` | session | records a finished quiz attempt `{ quizKey, score, total, durationSeconds }` — rate-limited per-user (`src/lib/api-rate-limit.ts`, 20/60s), see [45-audit-infra-security.md](45-audit-infra-security.md) §4 |
| `GET /api/attempts/best?quizKey=` | session | current user's best score for one quiz, for the results page |
| `GET /api/leaderboard?quizKey=&scope=global\|friends` | session | ranked `[{ displayName, score, total, createdAt }]` |
| `GET /api/friends` | session | accepted friends + pending incoming/outgoing requests |
| `POST /api/friends/requests` | session | send a friend request `{ username }` |
| `POST /api/friends/requests/:id/accept` | session | accept a pending request |
| `POST /api/friends/requests/:id/ignore` | session | mark a pending request `ignored` |
| `GET /api/cron/purge-rate-limits` | `CRON_SECRET` bearer token | deletes expired `RateLimit` rows; triggered by Vercel Cron only, see [45-audit-infra-security.md](45-audit-infra-security.md) §2 |

There is no vocab REST API (an earlier draft of this doc planned `GET /api/levels` and similar
routes; they were never built) and no `/api/attempts/recent` — the logged-in "/" view's "most
recent attempt" line comes from `getMostRecentAttempt` in `lib/queries.ts`, called directly from
the Server Component. Vocabulary pages (level hub, learn page, quiz pages, custom-quiz picker) all read
`lib/queries.ts` the same way.

## Local dev flow

1. `npm run db:migrate` — applies Prisma migrations to the Neon database `DATABASE_URL` points
   at (the same one used in prod — see "Tech stack" above).
2. `npm run db:seed` — runs the extraction scripts against the in-repo `src/lib/extract/`
   data files, writes rows into that database. A manual step, not run on every deploy (seeding
   ~1,500 words one-by-one over the network is slow enough that it's not worth re-running unless
   the source vocab data actually changed — see
   [20](hold/20-postgres-vercel-migration-plan.md)'s "What actually happened").
3. `npm run dev` — `next dev`. One process, one port — pages and `/api/*` routes are served
   together, no proxy config needed.

Prod deploy runs `prisma migrate deploy && next build` against the same shared database (see
[21-vercel-deploy.md](21-vercel-deploy.md)) — same single deploy artifact, frontend and API
together.

## One app, not frontend + separate backend

Explicitly settling this: **no standalone backend service.** Next.js Route Handlers are the
entire API layer. Reasons this fits this project specifically:

- The whole site is frontend-heavy (quiz UI, tables, leaderboard) with a thin, low-traffic API
  underneath it (read vocab, write an attempt, read a leaderboard) — there's no independent
  scaling, deployment, or team-boundary reason to split them.
- One `package.json`, one dev server, one deploy target — less to configure and keep in sync
  than a Vite app + Express app pair, which is what made the earlier draft of this doc heavier
  than it needed to be.
- Server Components can call `lib/db.ts` directly for read-heavy pages (e.g. the level hub's
  chapter list) without even going through a `/api` round-trip; Route Handlers exist for the
  cases that genuinely need a callable endpoint (form submits from Client Components, like
  submitting a finished quiz attempt or a login).
- If the site ever needs to scale the API independently of the frontend, Route Handlers can be
  extracted into a standalone service later without changing their request/response contracts
  — nothing above is a dead end, just not needed yet.
