# Audit: backend / data layer

Part of the [project audit](40-project-audit-overview.md) (Aug 2026). Scope: `prisma/schema.prisma`
+ every migration, `src/lib/*.ts`, every `src/app/api/**/route.ts`.

## Summary

Overall clean. Auth checks on API routes are consistent (every route checks `getSessionUser()`
first, `401` shape is uniform), error-response shapes are uniform across routes, the one raw-SQL
query is properly parameterized (no injection risk), and `tsc --noEmit` is clean. No missing-auth
route, no crash-on-error route, no injection risk found. Findings below are mostly medium/low.

## Schema and migrations

No drift — all 6 migrations, traced forward, reconstruct the current `schema.prisma` exactly.

- **✅ Fixed** — `@@index([friendId, status])` added, migration applied live. **`Friendship` has no index serving `friendId`-only lookups** (medium). Only index is the unique
  composite `@@unique([userId, friendId])`, which Postgres can use for lookups on `userId` alone
  (leftmost-prefix) but not `friendId` alone. `getFriendsData` runs two of its four queries filtered
  by `friendId` only (`where: { friendId: userId, status: "accepted"/"pending" }`), forcing a full
  table scan on every friends-page/`/api/friends` load. Fix: `@@index([friendId, status])`. Low
  real-world impact today given table size, but it's the one genuinely unindexed
  frequently-queried column.
- **✅ Fixed** — `GET /api/cron/purge-rate-limits`, triggered daily by Vercel Cron
  (`vercel.json`), `CRON_SECRET`-gated, deletes rows where `expiresAt < now()` (correctly leaves
  permanent `expiresAt: null` rows alone). **`RateLimit` rows are never purged**. No index on `expiresAt`, nothing deletes expired
  rows outside the one key being read/incremented. Unbounded growth over a long production
  lifetime — not a correctness bug, just worth a cleanup job eventually. Written to by two code
  paths (`rate-limit-storage.ts` for better-auth, plus `api-rate-limit.ts` for this app's own
  routes) — both now covered by the same purge sweep.
- `Word`'s `@@unique([chapterId, chinese, source])` being nullable on `chapterId` is intentional
  (combined-only words have no chapterId, multiple can share `chinese`+`source: "combined"` across
  levels) — confirmed not an oversight, not flagged as a finding.

Cascade rules, nullability choices elsewhere are reasonable and match their explaining comments.

## `src/lib/queries.ts`

Clean overall — no N+1 patterns (the `Promise.all` fan-outs are deliberate small fixed-count
batches, not per-row loops); source-scoping filters (`chapter`/`dialog`/`combined`) applied
consistently everywhere a word set is fetched.

- **✅ Fixed** — removed. **`getChapterDialogLineCount` is dead code** (low) — exported, zero call sites anywhere in
  `src/app` (its sibling `getChapterDialogWordCount` *is* used, at
  `src/app/hsk/[level]/chapter/[chapter]/page.tsx:27`). Either wire it up or delete it.
- `getLeaderboard` dedupes to best-attempt-per-user in application code after fetching *all*
  attempts for a quizKey, unpaginated — fine at current scale per its own comment, flagged only
  for future-scale awareness (nitpick).

## API routes (`src/app/api/**/route.ts`)

Clean as a whole. Every route checks session first with a consistent `401 {error: "Not logged
in."}`; validation errors are `400 {error: "..."}`; not-found is `404`; forbidden is `403`. No
stack-trace leakage. No route silently swallows a DB failure (unguarded `await prisma.*` becomes
Next's own 500 on rejection — acceptable, not silent).

- **`/api/friends/requests/[id]/accept` and `.../ignore` have a harmless race** (low) — both do a
  `findUnique` read → check `status` → `update`, with no transaction. Two near-simultaneous POSTs
  to accept the same request could both pass the `status !== "pending"` check before either write
  commits. Outcome is still `status: "accepted"` either way — idempotent in effect, not
  exploitable for anything beyond a harmless double-write.
- **✅ Fixed for `/api/attempts`** — `src/lib/api-rate-limit.ts`'s `checkRateLimit`, a per-user
  20/60s cap, keyed off the authenticated session (not client input), using the same atomic
  `INSERT ... ON CONFLICT` upsert pattern as `rate-limit-storage.ts` — re-verified race-free on
  re-audit. **No rate limiting on this app's own mutating routes** (medium for `/api/attempts`). Only
  better-auth's own endpoints (sign-in, forgot-password) are rate-limited via
  `src/lib/auth.ts:99-112`. `/api/attempts` (POST) accepts client-supplied `score`/`total`/
  `quizKey`, checked only for internal consistency (`score <= total`, valid quizKey pattern), never
  against a real quiz session — a logged-in user can script arbitrary POSTs to flood their own
  leaderboard rows or pad another quizKey's leaderboard indefinitely, with no rate limit and no
  per-user-per-quizKey cooldown. Small blast radius (personal/friends app), but real and
  exploitable given the leaderboard is a stated feature. `/api/friends/requests` spam is lower
  severity (self-limiting — duplicate requests are already no-ops) and was **not** given a rate
  limit this round — still open, same low-severity reasoning as before.
- **`parseQuizKey` only validates string *format*, not that the level/chapter it names actually
  exists** (low) — `hsk9-chapter99` would pass the regex. Since there's no FK to Level/Chapter,
  this just means orphaned/junk quizKeys can accumulate in `Attempt`, not a security issue.

## `src/lib/auth.ts`, `db.ts`, `rate-limit-storage.ts`, `require-session.ts`, `send-email.ts`, `hsk-level.ts`

All read cleanly. The `increment()` raw SQL in `rate-limit-storage.ts` was checked carefully — a
single atomic `INSERT ... ON CONFLICT DO UPDATE` with every dynamic value passed through tagged-
template parameterization, not interpolated into the SQL string. No injection risk, correctly
closes the race its own comment describes.

- **✅ Fixed** — `.catch(err => console.error(...))` added at the `sendResetPassword` call site.
  **`sendEmail` has no try/catch, and its only caller fire-and-forgets it** (low, but see
  [45-audit-infra-security.md](45-audit-infra-security.md) §6 for the fuller operational picture)
  — `sendResetPassword` deliberately calls `void sendEmail(...)` to avoid a timing side-channel
  (documented, intentional). But a rejected promise from a `void`-called async function is an
  unhandled promise rejection — a broken Gmail app-password or SMTP outage fails completely
  silently: the user gets "check your email," never gets one, and nothing logs the failure
  anywhere an operator would see. Worth a `.catch(err => console.error(...))` at minimum, purely
  for log visibility — doesn't change the intentional no-feedback-to-the-user behavior.
- `require-session.ts` is correctly page-only (uses `redirect`); API routes correctly use
  `getSessionUser` directly instead — no inconsistency.
- `hsk-level.ts` — trivial, correct.

## `src/lib/extract/*`

Out of the runtime request path (seed/build-time only, nothing under `src/app` imports these) —
skimmed for raw SQL/dead exports, none of concern. Not a live-app-surface audit target.

## TODO/FIXME/HACK

None found anywhere in `src/lib` or `src/app/api`.
