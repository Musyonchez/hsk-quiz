# Pages (full sitemap)

The quiz screen ([06-quiz-mechanics.md](06-quiz-mechanics.md)) is one page among several. This
doc lists every page so none of them get designed as an afterthought.

Every page shares the `<AppHeader>` component from [08-ui-ux.md](08-ui-ux.md): site name/logo
and level switcher (`HSK 1` / `HSK 2`) on the left, `Leaderboard` / `Friends` links and the
logged-in `<UserBadge>` (with a logout action) on the right. Any page requiring auth redirects
to `/login` if there's no valid session (checked server-side in a layout/page, not client-side
only).

Routes below are real Next.js App Router paths (`app/**/page.tsx`), not hash routes — see the
file tree in [05-architecture.md](05-architecture.md).

## 0. Login — `/login`

- Username + password form, single `Log in` button. No "forgot password" flow and no signup
  link — accounts are provisioned server-side (see [05-architecture.md](05-architecture.md)),
  so there's nothing for a self-service flow to do here.
- On success, redirect to `/` (home) or back to whatever page triggered the redirect.

## 1. Home — `/`

- Short intro line (what this site is).
- Two large cards: **HSK 1** and **HSK 2**, each showing chapter count and, once a player has
  played anything, their most recent activity (e.g. "Last played: Chapter 5 — 82%") pulled
  from `GET /api/attempts/best` — a light personal touch, not a full dashboard.
- No settings — this page's only job is picking a level (login is enforced by the layout, not
  by this page itself).

## 2. Level hub — `/hsk/[level]`

- Grid of chapter cards (Chapter 1 – 15), each showing the chapter title (e.g. "Lesson 5 —
  就买这件吧") and, if played before, best score.
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

- **Your friends** list (accepted `Friendship` rows) — each a `<UserBadge>` with a link into
  "compare" (just the friends-scope leaderboard filtered to that one person, reusing
  `<LeaderboardTable>`).
- **Pending requests** — incoming (`Accept` / `Ignore` via `<FriendRequestRow>`) and outgoing
  (shown as "waiting," no cancel action needed at launch).
- **Add a friend** — a single username text field + `Send request` button, hitting
  `POST /api/friends/requests`. No user search/directory — you have to know the exact
  username, consistent with accounts being provisioned rather than publicly discoverable.

## Explicitly not building

- A dedicated cross-quiz "progress/history" page — `GET /api/attempts/best` and the
  leaderboard endpoints answer every "where do I stand" question the pages above need. A full
  history view can be added later if wanted, but it's not blocking anything above.
- A settings/preferences page — there are no user-configurable options at launch (tone-free
  matching is fixed behavior per [06-quiz-mechanics.md](06-quiz-mechanics.md), not a toggle).
- A friend-search/directory — see "Add a friend" above; username-only by design.
