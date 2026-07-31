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
- **Database, via an ORM (Prisma)**:
  - **Dev/testing**: SQLite — a single file (`website/server/dev.db`), zero external
    dependencies, fast to reset (`rm dev.db && npm run db:migrate && npm run db:seed`).
  - **Prod**: an external Postgres instance. Because Prisma's schema is
    written against its own modeling language (not raw SQL), switching the `provider` in
    `schema.prisma` from `sqlite` to `postgresql` and pointing `DATABASE_URL` at the prod
    instance is the entire migration — no query rewrites, since Prisma's query builder targets
    both identically. This is *the* reason to pick an ORM here over raw `better-sqlite3` calls.
  - Prisma Migrate handles schema versioning for both environments from the same migration
    history.

## Why a real backend instead of static JSON (superseding the earlier draft)

Two earlier drafts of this doc are superseded here: first a fully static site with build-time
JSON and no server, then a separate Vite frontend + Express backend. The requirement is a
self-sufficient app with its own database (SQLite for dev, an external DB in prod) plus real
accounts — Next.js's Route Handlers give a server process to own the database connection and
sessions without maintaining a second HTTP server/build config alongside the frontend one. The
vocabulary content itself is still sourced from the PDFs/markdown in this repo, but it's
*seeded into the database* rather than shipped as static JSON — see
[04-data-pipeline.md](04-data-pipeline.md).

## Database schema (outline)

```
Level        { id, number (1|2), name }
Chapter      { id, levelId, number, title }
Word         { id, chapterId? (null for combined-only words), levelId,
               chinese, pinyin, wordType, meaning, category (nullable, PDF word-class),
               source ("chapter" | "combined") }
GrammarPattern { id, chapterId, label, pinyinSkeleton, note }

User         { id, username, passwordHash, displayName, createdAt }
Session      { id, userId, tokenHash, expiresAt, createdAt }
Friendship   { id, userId, friendId, status ("pending" | "accepted"), createdAt }
Attempt      { id, userId, quizKey ("hsk1-chapter5" | "hsk1-combined" | ...),
               score, total, durationSeconds, createdAt }
```

`quizKey` is the stable identifier used everywhere (routes, API, `Attempt.quizKey`) so a quiz
is addressable without joining through Level/Chapter every time.

`Friendship` is stored as one directional row per request (`userId` sent the request to
`friendId`); "are these two friends" is `status = "accepted"` in either direction — query
helper, not a second table, to avoid an accept flow writing two rows that can drift apart.

## Accounts and auth

- **Provisioning, not self-signup**: a small admin script (`server/scripts/create-user.ts`)
  creates a `User` row with a hashed password (e.g. via `argon2` or `bcrypt`) — there is no
  public "sign up" endpoint or page. This matches the "specific user use" requirement: the set
  of people who can log in is whatever the site owner has explicitly created.
- **Sessions**: a plain server-side session token in an HTTP-only, `Secure`, `SameSite=Lax`
  cookie, hashed at rest in the `Session` table, checked in a small `getSession()` helper
  called from Server Components and Route Handlers alike. No JWT, no `next-auth`/third-party
  provider — the user set is small and static, so there's no reason to take on that complexity
  or its extra config surface.
- Every route that reads/writes `Attempt` or `Friendship` requires a valid session; the
  vocabulary read routes (`/api/levels`, `.../words`, `.../combined`) stay public/unauthenticated
  since there's no reason to gate looking at vocabulary behind login — only progress tracking
  and social features need an identity.

## Folder layout

```
website/
  docs/                      # planning docs (this folder)
  prisma/
    schema.prisma
    migrations/
    seed.ts                  # calls lib/extract/* and writes rows via Prisma
  scripts/
    create-user.ts           # provisions a login (username + password) — no signup page
  src/
    app/
      layout.tsx             # <AppHeader> + Tailwind globals
      page.tsx                # Home (§1 in 09-pages.md)
      login/page.tsx
      hsk/[level]/page.tsx                       # Level hub
      hsk/[level]/chapter/[chapter]/page.tsx      # Learn page
      hsk/[level]/chapter/[chapter]/quiz/page.tsx # Quiz + results
      hsk/[level]/combined/page.tsx
      hsk/[level]/combined/quiz/page.tsx
      leaderboard/[quizKey]/page.tsx
      friends/page.tsx
      api/
        auth/login/route.ts
        auth/logout/route.ts
        auth/me/route.ts
        levels/route.ts
        levels/[n]/chapters/route.ts
        levels/[n]/chapters/[c]/words/route.ts
        levels/[n]/combined/route.ts
        attempts/route.ts
        attempts/best/route.ts
        leaderboard/route.ts
        friends/route.ts
        friends/requests/route.ts
        friends/requests/[id]/accept/route.ts
    components/               # AppHeader, VocabTable, QuizLinkCard, ScoreTimerBar,
                               # PillButton, PercentBadge, LeaderboardTable,
                               # FriendRequestRow, UserBadge — see 08-ui-ux.md
    lib/
      extract/                # extract-combined.ts, extract-chapters.ts (pure parsers)
      db.ts                   # Prisma client singleton
      session.ts              # cookie/session helpers used by pages + route handlers
    quiz/                     # quiz engine: input matching, scoring, timer (framework-free)
  dev.db                      # sqlite file, git-ignored
  tailwind.config.ts
  next.config.ts
  package.json
```

## API surface (outline)

| Method & path | Auth? | Returns |
|---|---|---|
| `POST /api/auth/login` | — | sets session cookie for `{ username, password }` |
| `POST /api/auth/logout` | session | clears session |
| `GET /api/auth/me` | session | current user's `{ username, displayName }` |
| `GET /api/levels` | — | `[{ number, name, chapterCount }]` |
| `GET /api/levels/:n/chapters` | — | chapter list with titles for the level hub page |
| `GET /api/levels/:n/chapters/:c/words` | — | word list for that chapter's learn table + quiz |
| `GET /api/levels/:n/combined` | — | full-level word list |
| `POST /api/attempts` | session | records a finished quiz attempt `{ quizKey, score, total, durationSeconds }` |
| `GET /api/attempts/best?quizKey=` | session | current user's best score, for the results page |
| `GET /api/leaderboard?quizKey=&scope=global\|friends` | session | ranked `[{ displayName, score, total, createdAt }]` |
| `GET /api/friends` | session | accepted friends + pending incoming/outgoing requests |
| `POST /api/friends/requests` | session | send a friend request `{ username }` |
| `POST /api/friends/requests/:id/accept` | session | accept a pending request |

## Local dev flow

1. `npm run db:migrate` — applies Prisma migrations to `dev.db`.
2. `npm run db:seed` — runs the extraction scripts against `raw/` and
   `characters/words/`, writes rows into the (SQLite) database.
3. `npm run dev` — `next dev`. One process, one port — pages and `/api/*` routes are served
   together, no proxy config needed.

Prod deploy swaps step 1/2's target database (`DATABASE_URL` → the Postgres instance) and runs
`next build && next start` (or a platform that does this for you, e.g. Vercel) — same single
deploy artifact, frontend and API together.

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
