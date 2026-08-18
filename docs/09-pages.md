# Pages (full sitemap)

The quiz screen ([06-quiz-mechanics.md](06-quiz-mechanics.md)) is one page among several. This
doc lists every page so none of them get designed as an afterthought.

**State of this doc (per [43-audit-docs-consistency.md](43-audit-docs-consistency.md)):** this
was written up front, before most of the site existed, and — unlike some of the other early
planning docs — was never kept current as real features shipped. The sections below have been
corrected where they stated something now flatly false (forgot-password, `/dashboard`), but this
is **not a complete sitemap** — see "Pages added since this doc was written" at the bottom for
everything real that's missing from the numbered list below, with pointers to the docs that
actually spec each one.

Every page shares the `<AppHeader>` component from [08-ui-ux.md](08-ui-ux.md): site name/logo
and a level switcher (one link per live `Level` row — currently `HSK 1` / `HSK 2` / `HSK 3`) on
the left, `Custom Quiz` / `Leaderboard` / `Friends` links and the logged-in `<UserBadge>` (with a
logout action) on the right. Any page requiring auth redirects
to `/login` if there's no valid session (checked server-side in a layout/page, not client-side
only).

Routes below are real Next.js App Router paths (`app/**/page.tsx`), not hash routes — see the
file tree in [05-architecture.md](05-architecture.md). References to `GET /api/...` below
describe the *data contract* (what shape of data the page needs), not necessarily a literal
client-side fetch — per [05-architecture.md](05-architecture.md#one-app-not-frontend--separate-backend),
plain reads for a Server Component (level hub, learn pages, home) go straight through
`lib/db.ts`, while the same query logic backs the `GET` route so client-side interactions
(e.g. re-fetching a leaderboard tab without a full page reload) have something to call. `POST`
routes are always real network calls, since they originate from Client Component form/button
handlers.

## 0. Login — `/login`

- Single field that accepts either username or email, plus password, single `Log in` button, a
  link to `/register` for a new visitor, and a "Forgot password?" link into `/forgot-password`
  (real flow, added by [36-better-auth-migration-plan.md](36-better-auth-migration-plan.md) —
  this section originally said no such flow existed and no email was collected; both reversed).
- On success, redirect to `/` (there is no `/dashboard` route — see §1.5 below), or back to
  whatever page triggered the redirect.

## 0.5. Register — `/register`

- Username + email + password form, single `Register` button. Same visual treatment as Login —
  same card, same branding block above it. The email field was added by docs/36 specifically to
  support the forgot-password flow above; this section originally said no email was collected at
  all.
- On success, the account is created *and* logged in immediately (no separate "now go log in"
  step) — same redirect-to-`/` behavior as Login.

## 1. Landing — `/` (public, no session required)

- The one page anyone can reach without an account — a short intro (what this site is) plus
  `Log in` / `Register` calls to action. Vocabulary read routes are already
  public/unauthenticated (see [05-architecture.md](05-architecture.md)), so the landing page is
  the natural public front door instead of bouncing a first-time visitor straight to `/login`.
- If a valid session already exists, the same `/` route renders the logged-in view instead (see
  §1.5) — there's no separate redirect to a dashboard route, because there is no dashboard route.

## 1.5. Logged-in home — `/` (same route as §1, different content when a session exists)

- **This replaces what used to be a separate `/dashboard` route.** Folded into `/` by
  [docs/hold/29](hold/29-landing-page-trim-plan.md)'s landing-page update — `/` itself branches
  on session state rather than redirecting to a second route.
- One large card per live level (currently HSK1-3), each showing chapter count and, once a
  player has played anything, their most recent activity (e.g. "Last played: Chapter 5 — 82%")
  pulled from `getMostRecentAttempt` in `lib/queries.ts` directly (not a `GET /api/attempts/
  recent` route — no such route exists, see [05-architecture.md](05-architecture.md)'s "API
  surface") — a light personal touch, not a full analytics dashboard.

## 2. Level hub — `/hsk/[level]`

- Grid of chapter cards (chapter count varies by level — 15 for HSK1/HSK2, 20 for HSK3), each
  showing the chapter title (e.g. "Lesson 5 — 就买这件吧") and, if played before, best score.
- One additional card, visually distinct (larger, or first in the grid) for **Combined** — the
  full-level quiz, styled like the "Play Another" card from the reference screenshots.
- Clicking a chapter card goes to its learn page, not straight into the quiz — matches the
  reference screenshots' separation of the answer-key table page from the timed quiz.

## 3. Chapter / Combined learn page — `/hsk/[level]/chapter/[chapter]` and `/hsk/[level]/combined`

- The full `<VocabTable>`, fully revealed (all three columns visible) — this is the "Learn"
  screenshot.
- One primary button: `PLAY QUIZ`.
- Breadcrumb back to the level hub.

## 4. Quiz page — `/hsk/[level]/chapter/[chapter]/quiz` and `/hsk/[level]/combined/quiz`

- Covered in full in [06-quiz-mechanics.md](06-quiz-mechanics.md).

## 5. Results — shown in place after a quiz ends (no separate route; it replaces the quiz page's content so the timer/score state isn't lost on a route change)

- Score percentage, best-score comparison ("your best: 91%"), `REPLAY` / `STATS` buttons,
  `PLAY NEXT` / `PLAY ANOTHER` cards — full spec in
  [06-quiz-mechanics.md](06-quiz-mechanics.md)'s "End of quiz" section.

## 6. Stats detail — shown as an expansion/overlay on the results page when `STATS` is clicked, not a separate route

- Per-word breakdown for the just-finished attempt: which words were answered correctly vs.
  given up on / timed out. Pulled straight from the client-side attempt state (no extra API
  call needed — it's the same data just submitted via `POST /api/attempts`).

## 7. Leaderboard — `/leaderboard/[quizKey]`

- Reached from a quiz's results page (`AVG SCORE` / `AVG FRIEND SCORE` link,
  [06-quiz-mechanics.md](06-quiz-mechanics.md)) or from the header's `Leaderboard` link, which
  lands on a quiz picker (level → chapter/combined) if no `quizKey` is given yet.
- Two tabs: **Global** and **Friends**, both a `<LeaderboardTable>` ranked by best score,
  backed by `GET /api/leaderboard?quizKey=&scope=`.
- The current user's own row is visually pinned/highlighted even if it scrolls off the visible
  top ranks, so "where do I stand" is always answerable at a glance.

## 8. Friends — `/friends`

- **Your friends** list (accepted `Friendship` rows) — each rendered as a plain `<UserBadge>`.
  **Corrected per [56-audit-2026-08-16.md](56-audit-2026-08-16.md) finding 56-7**: this used to
  describe a per-friend "compare" link into a filtered leaderboard — that was never actually
  built (no `href` on the row, and the leaderboard route has no per-friend filter to link to).
  "Where do I stand vs. friends" today is answered by the Friends tab on a specific quiz's
  leaderboard (§7), which shows every friend together, not one at a time.
- **Pending requests** — incoming (`Accept` / `Ignore` via `<FriendRequestRow>`, hitting
  `POST /api/friends/requests/:id/accept` or `.../ignore` — see
  [05-architecture.md](05-architecture.md)) and outgoing (shown as "waiting," no cancel action
  needed at launch).
- **Add a friend** — a single username text field + `Send request` button, hitting
  `POST /api/friends/requests`. No user search/directory — you have to know the exact
  username; accounts are publicly self-registered but not publicly browsable.

## Explicitly not building

- A dedicated cross-quiz "progress/history" page — `GET /api/attempts/best` and the
  leaderboard endpoints answer every "where do I stand" question the pages above need. A full
  history view can be added later if wanted, but it's not blocking anything above.
- A friend-search/directory — see "Add a friend" above; username-only by design.

## Pages added since this doc was written (not fully spec'd here — see each one's own doc)

Per [43-audit-docs-consistency.md](43-audit-docs-consistency.md): roughly a third of the site's
real routes are missing from the numbered sitemap above. Listed here rather than folded into the
numbering, since giving each one the same level of design detail the sections above got would
mean effectively rewriting this whole doc — the actual specs already live in their own docs.

- **`/account`** — change-password form ([37-auth-hardening-and-ux-plan.md](37-auth-hardening-and-ux-plan.md)).
  This is the one place a settings-page non-goal above ("no user-configurable options at launch")
  is now slightly stale — it's not a general preferences page, but it is a real account-settings
  page.
- **`/forgot-password`, `/reset-password`** — the forgot-password flow referenced in §0/§0.5
  above ([36-better-auth-migration-plan.md](36-better-auth-migration-plan.md)).
- **`/custom-quiz`, `/custom-quiz/quiz`** — cross-level custom quiz picker/runner
  ([docs/hold/17-custom-chapter-quiz-plan.md](hold/17-custom-chapter-quiz-plan.md)).
- **`/hsk/[level]/custom/quiz`** — single-level, multi-chapter custom quiz (same doc as above).
- **`/hsk/[level]/chapter/[chapter]/all`, `.../all/words`, `.../all/quiz`** — a chapter's full
  dialog transcript, its flat "All Words" vocabulary list (broader than the curated New Words
  table in §3), and a quiz over that larger word set
  ([docs/hold/25-chapter-all-words-plan.md](hold/25-chapter-all-words-plan.md)).
- **Character mode** — a third quiz mode/answer format alongside "type pinyin" and "match
  meaning," reachable from the same quiz pages as §4 (`?mode=character`), with its own
  browse-then-quiz flow ([38-character-mode-overhaul-plan.md](38-character-mode-overhaul-plan.md)).
