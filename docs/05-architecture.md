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
  [20-postgres-vercel-migration-plan.md](20-postgres-vercel-migration-plan.md) for how this
  replaced an earlier SQLite-in-dev/Postgres-in-prod split (the migration that moved hosting
  from Render to Vercel, since Vercel's serverless functions can't hold a persistent SQLite
  file on disk). No branch split between dev/prod yet — revisit once the site has real
  production data worth isolating.
  - **Prisma 7 requires an explicit driver adapter** (`PrismaClient({ adapter })`) — there's no
    more implicit "just point `DATABASE_URL` at it" connection. The app uses
    `@prisma/adapter-neon` (`src/lib/db.ts`), which talks to Postgres over HTTP/WebSockets via
    `@neondatabase/serverless` rather than a pooled TCP connection — the right fit for many
    short-lived Vercel serverless function instances hitting a small database, per
    [20](20-postgres-vercel-migration-plan.md)'s Decisions section.
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
               source ("chapter" | "combined") }
GrammarPattern { id, chapterId, label, pinyinSkeleton, note }

User         { id, username, passwordHash, displayName, createdAt }
Session      { id, userId, tokenHash, expiresAt, createdAt }
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

- **Public self-service registration**: `POST /api/auth/register` creates a `User` row with a
  hashed password (`scrypt`, via Node's built-in `node:crypto` — no extra dependency) and logs
  the new user in immediately. No email, no verification step, no admin approval.
- **Sessions**: a plain server-side session token in an HTTP-only, `Secure`, `SameSite=Lax`
  cookie, hashed at rest in the `Session` table, checked in a small `getSession()` helper
  called from Server Components and Route Handlers alike. No JWT, no `next-auth`/third-party
  provider — the user set is small and static, so there's no reason to take on that complexity
  or its extra config surface.
- Every route that reads/writes `Attempt` or `Friendship` requires a valid session. Vocabulary
  reads have no dedicated API routes at all — there's no public vocab REST API, and never has
  been in the current codebase (an earlier draft of this doc planned one, see "API surface"
  below); Server Components call `lib/queries.ts` directly, and since there's no reason to gate
  looking at vocabulary behind login, those pages stay public/unauthenticated too — only
  progress tracking and social features need an identity.

## Folder layout

```
website/
  docs/                      # planning docs (this folder)
  prisma/
    schema.prisma
    migrations/
    seed.ts                  # calls lib/extract/* and writes rows via Prisma
  src/
    app/
      layout.tsx             # <AppHeader> + Tailwind globals
      page.tsx                # Public landing (§1 in 09-pages.md)
      dashboard/page.tsx      # Dashboard, session-protected (§1.5 in 09-pages.md)
      login/page.tsx
      register/page.tsx
      hsk/[level]/page.tsx                       # Level hub
      hsk/[level]/chapter/[chapter]/page.tsx      # Learn page
      hsk/[level]/chapter/[chapter]/quiz/page.tsx # Quiz + results, ?mode=type|meaning
      hsk/[level]/combined/page.tsx
      hsk/[level]/combined/quiz/page.tsx
      hsk/[level]/custom/quiz/page.tsx            # single-level, multi-chapter custom quiz
      custom-quiz/page.tsx                        # cross-level custom quiz picker
      custom-quiz/quiz/page.tsx                   # cross-level custom quiz runner
      leaderboard/page.tsx                        # level/chapter picker, Type/Match tabs
      leaderboard/[quizKey]/page.tsx
      friends/page.tsx
      api/
        auth/login/route.ts
        auth/register/route.ts
        auth/logout/route.ts
        auth/me/route.ts
        attempts/route.ts
        attempts/best/route.ts
        leaderboard/route.ts
        friends/route.ts
        friends/requests/route.ts
        friends/requests/[id]/accept/route.ts
        friends/requests/[id]/ignore/route.ts
                               # no vocab API routes — vocab pages read lib/queries.ts
                               # directly from Server Components, see "Accounts and auth" above
    components/               # AppHeader, VocabTable, QuizLinkCard, CustomQuizPicker,
                               # QuizRunner, ChoiceQuizRunner, MatchQuizRunner, QuizModeGate,
                               # PillButton, PercentBadge, LeaderboardTable, AddFriendForm,
                               # FriendRequestRow, UserBadge — see 08-ui-ux.md
    lib/
      extract/                # extract-combined.ts, extract-chapters.ts (dispatch by level
                               # slug to the right in-repo data file — no PDF/markdown I/O);
                               # hsk{1,2,3}-chapters-data.ts / hsk{1,2,3}-combined-data.ts
                               # hold each level's word lists as plain TS data, fully
                               # self-contained inside website/; hsk4a/4b-*-data.ts hold
                               # HSK4A's and HSK4B's word lists the same way — HSK4/5/6
                               # are split into independent per-book Level rows (see
                               # hsk-level.ts), each sourced from that book's own
                               # textbook appendix
      db.ts                   # Prisma client singleton (PrismaNeon driver adapter)
      auth.ts                 # password hashing + session create/lookup
      require-session.ts      # Server Component guard: redirects to /login if unauthenticated
      login-rate-limit.ts     # Postgres-backed per-username lockout for POST /api/auth/login
      queries.ts               # all read queries vocab pages/leaderboard/friends call directly
    quiz/                     # quiz engine: input matching, scoring, timer (framework-free)
  tailwind.config.ts
  next.config.ts
  package.json
```

## API surface (outline)

| Method & path | Auth? | Returns |
|---|---|---|
| `POST /api/auth/login` | — | sets session cookie for `{ username, password }` |
| `POST /api/auth/register` | — | creates a `User` + sets session cookie for `{ username, password }` |
| `POST /api/auth/logout` | session | clears session |
| `GET /api/auth/me` | session | current user's `{ username, displayName }` |
| `POST /api/attempts` | session | records a finished quiz attempt `{ quizKey, score, total, durationSeconds }` |
| `GET /api/attempts/best?quizKey=` | session | current user's best score for one quiz, for the results page |
| `GET /api/leaderboard?quizKey=&scope=global\|friends` | session | ranked `[{ displayName, score, total, createdAt }]` |
| `GET /api/friends` | session | accepted friends + pending incoming/outgoing requests |
| `POST /api/friends/requests` | session | send a friend request `{ username }` |
| `POST /api/friends/requests/:id/accept` | session | accept a pending request |
| `POST /api/friends/requests/:id/ignore` | session | mark a pending request `ignored` |

There is no vocab REST API (an earlier draft of this doc planned `GET /api/levels` and similar
routes; they were never built) and no `/api/attempts/recent` — the dashboard's "most recent
attempt" comes from `getMostRecentAttempt` in `lib/queries.ts`, called directly from the Server
Component. Vocabulary pages (level hub, learn page, quiz pages, custom-quiz picker) all read
`lib/queries.ts` the same way.

## Local dev flow

1. `npm run db:migrate` — applies Prisma migrations to the Neon database `DATABASE_URL` points
   at (the same one used in prod — see "Tech stack" above).
2. `npm run db:seed` — runs the extraction scripts against the in-repo `src/lib/extract/`
   data files, writes rows into that database. A manual step, not run on every deploy (seeding
   ~1,500 words one-by-one over the network is slow enough that it's not worth re-running unless
   the source vocab data actually changed — see
   [20](20-postgres-vercel-migration-plan.md)'s "What actually happened").
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
