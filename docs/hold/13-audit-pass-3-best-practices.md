# Audit Pass 3 — Best Practices

The non-bug half of this pass: things that work correctly today but drift from best practice,
or are worth a deliberate call before HSK4+ (and the account-facing features in
[07-roadmap.md](../07-roadmap.md)) go live. See
[12-audit-pass-3-bugs.md](12-audit-pass-3-bugs.md) for the actual-defect half of the same pass.

## Fixed

- **No brute-force protection on `POST /api/auth/login`.** `verifyPassword` was already
  timing-safe against username enumeration (the `UNREACHABLE_PASSWORD_HASH` trick), but there
  was no rate limiting, lockout, or delay on repeated failed attempts against a real username.
  Added `lib/login-rate-limit.ts`: an in-memory per-username failure counter (5 failures / 15
  minutes locks the username out with a 429). Deliberately simple and explicitly commented as
  such — it's an in-process `Map`, not a shared/persisted store, so it resets on restart and
  doesn't coordinate across multiple server instances; fine for a small single-instance personal
  site, revisit with a real store if that ever changes.
- **`POST /api/auth/register` didn't validate username shape.** Password already had a length
  floor; username only got `.trim()` and a non-empty check. Added a
  `/^[a-zA-Z0-9_-]{3,20}$/` pattern check (400 with a clear message on failure) before the
  existing-username check, so registration now rejects empty/oversized/non-ASCII usernames
  up front instead of accepting anything that survives `.trim()`.
- **No security headers configured.** `next.config.ts` was the default empty scaffold. Added an
  `async headers()` block applying `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
  and `Referrer-Policy: strict-origin-when-cross-origin` to every route. Deliberately did *not*
  add a `Content-Security-Policy` — Next's font/script inlining behavior would need real testing
  against a CSP to get right, and a wrong CSP silently breaking the site is worse than the
  current no-CSP baseline; left as a separate future task, not folded into this drive-by fix.
- **Chapter URLs weren't canonical.** `/hsk/1/chapter/05` and `/hsk/1/chapter/5` both resolved to
  the same chapter with no redirect. Both `chapter/[chapter]/page.tsx` and
  `chapter/[chapter]/quiz/page.tsx` now `redirect()` to the canonical (non-zero-padded) URL
  whenever `String(chapterNumber) !== chapterParam`.

## Noted, not fixed (judgment calls / deferred)

- **`better-sqlite3` / `@prisma/adapter-better-sqlite3` are in `dependencies`, not
  `devDependencies`**, even though [05-architecture.md](../05-architecture.md) documents SQLite as
  dev/test-only with Postgres in prod — already flagged in
  [11-codebase-audit.md](11-codebase-audit.md)'s "not fixed" list, restated here only because
  this pass reconfirmed it's still true; not a new finding, still deferred for the same reason
  (one-line fix at the actual prod swap-over time).
- **Seed script does one Prisma round-trip per word** (`prisma/seed.ts`'s `seedCombinedLevels`
  and `seedChapters` loops: a `findFirst`/`upsert` per word, sequentially awaited). Already
  flagged as the main reseed-time cost in [11-codebase-audit.md](11-codebase-audit.md)'s "not
  fixed" list for the combined-words case specifically; this pass confirms the same pattern
  (though with a working `@@unique([chapterId, chinese])`-backed `upsert`, so no correctness
  issue) exists in `seedChapters` too — restated for completeness, not fixed here since it's a
  seed-time-only cost with a known, already-documented reason it's not worth restructuring yet.
- **`GrammarPattern` model has no `@@unique` constraint**, unlike `Chapter`
  (`@@unique([levelId, number])`) and `Word` (`@@unique([chapterId, chinese])`). Not currently
  exercised — nothing seeds `GrammarPattern` rows yet (deliberately, per
  [07-roadmap.md](../07-roadmap.md)) — left unadded here since it needs a new Prisma migration and
  there's no data or seed code exercising this model yet to validate the choice against; worth
  deciding the natural key (likely `[chapterId, label]`) at the same time the grammar-pattern
  extractor is actually built, rather than speculatively now.
