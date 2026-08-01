# UI / UX Design System

Written up front, before any implementation, because retrofitting a visual language after
pages exist is expensive — every page in [09-pages.md](09-pages.md) is designed against this
spec, not against whatever a first draft happened to look like.

## Visual language (from the reference screenshots)

- **Dark theme by default**, matching the reference screenshots' results and quiz screens — see
  [10-color-palette.md](10-color-palette.md) for the actual token values (an "ink / paper /
  seal" palette, not generic near-black-plus-orange).
- **One accent color**, used sparingly and consistently for the single primary action per
  screen — `REPLAY`, `PLAY QUIZ`, the score ring/badge — never for body text or secondary
  buttons. Exact hex in [10-color-palette.md](10-color-palette.md).
- **Two button styles**: solid orange pill (primary action) and outline pill on dark
  background (secondary action, e.g. `STATS` next to `REPLAY`). No third button style.
- **Cards, not modals.** "Play Next" / "Play Another" are dark cards with a thumbnail-style
  icon/flag and two lines of text (category, then title) — reuse this card as the standard
  "link to another quiz" pattern anywhere it's needed (dashboard, results page, level hub).
- **Tables are the content, not decoration.** The answer-key table (Chinese / Pinyin / English
  columns, dark rows with a slightly lighter stripe for the header, black cells for the "not
  yet visible" character/definition columns during a quiz) is the dominant visual element on
  learn and quiz pages — don't compress it into a sidebar or hide it behind tabs.
- **Highlight states**: `--current` (gold) background = current row (mid-quiz), `--success`
  (jade) = correctly answered row — see [10-color-palette.md](10-color-palette.md); the
  character cell always stays visible, only the pinyin cell is blanked/revealed.
- **Typography**: a plain system sans-serif for English/pinyin UI text; Chinese characters need
  a font stack that includes a CJK-capable face (system default `-apple-system, "Segoe UI",
  "Noto Sans SC", sans-serif` is enough — no need to bundle a custom CJK webfont, it's heavy
  and system fonts render Chinese fine).
- **Numbers get emphasis.** Score, timer, and percentage are the largest text on any screen
  they appear on (see the `08:15` timer and `2%` score in the reference screenshot) — always
  bold, always in a monospace-leaning or tabular-figure style so digits don't jitter the layout
  as they change.

## Layout

- Fixed-width content area (`max-width: ~1100px`, centered) on desktop, matching the reference
  screenshots' proportions; single column, full-width tables on mobile (tables become
  horizontally scrollable rather than reflowing to cards — HSK vocab tables are inherently
  wide with 3 columns × up to 3 groups).
- A persistent lightweight header across every page (see [09-pages.md](09-pages.md) for exact
  contents) so navigating between "home → level → chapter → quiz" never feels like leaving the
  site, unlike the reference screenshots which seem to be a single embedded widget with no
  surrounding site chrome. The header also carries the logged-in user's name/avatar plus
  `Leaderboard` and `Friends` links — see [09-pages.md](09-pages.md).

## Motion

- Minimal. A quick highlight-row transition (color fade, ~150ms) when a word is answered, and
  a countdown timer that just ticks — no page-transition animations, confetti, or anything
  that would slow down rapid-fire quiz answering.

## Accessibility baseline

- All interactive controls (`PREV`/`NEXT`/`Give Up`/pause) are real `<button>`s, keyboard
  reachable, not `<div onclick>`.
- Color is never the only signal — the "current row" and "answered row" states also get a
  distinct left-border or icon, not just a background color swap, for colorblind users.
- The pinyin input field auto-focuses on quiz start and after every submitted answer, so the
  whole quiz is playable without touching the mouse.

## Component inventory (shared across pages, built once)

- `<AppHeader>` — logo/name, level switcher, nothing else (see [09-pages.md](09-pages.md))
- `<QuizLinkCard>` — the "Play Next / Play Another" card pattern
- `<VocabTable>` — the Chinese/Pinyin/English table, with a `reveal` prop per column so it
  serves both the learn view (all revealed) and the in-quiz view (pinyin hidden until answered)
- `<ScoreTimerBar>` — the shared score/timer/pause/give-up row shown during a quiz
- `<PillButton variant="primary" | "secondary">`
- `<PercentBadge>` — the big results-screen score circle/number
- `<LeaderboardTable>` — rank, avatar/initials, display name, score; used identically on the
  leaderboard page and the friends page's leaderboard tab
- `<FriendRequestRow>` — a pending request with Accept/Ignore actions
- `<UserBadge>` — small avatar-initials + display name, used in the header and leaderboard rows
