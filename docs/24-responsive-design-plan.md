# Responsive Design Plan

Written before any implementation, same discipline as
[17](17-custom-chapter-quiz-plan.md)/[18](18-quiz-runner-and-picker-improvements-plan.md)/
[19](19-meaning-quiz-mode-plan.md)/[20](20-postgres-vercel-migration-plan.md). The app was built
and visually tuned against a desktop viewport throughout — [08-ui-ux.md](08-ui-ux.md) *says*
"single column, full-width tables on mobile" as a goal, but that was never actually implemented
or verified against a narrow screen. This doc is a from-scratch look at what breaks today on
phone/tablet widths and what needs to change, page by page and component by component, before
calling the site actually responsive.

## Goal

Every page — landing, dashboard, level hub, learn, all three quiz modes, results, leaderboard,
friends, custom quiz picker, auth — should be fully usable (nothing clipped, nothing
overlapping, nothing requiring horizontal page scroll) at three reference widths:

- **Mobile**: 375px (iPhone SE/mini-class — the realistic narrow end, not 320px)
- **Tablet**: 768px (iPad portrait)
- **Desktop**: 1280px+ (already the tuned, working case — not a regression target)

Tailwind v4's default breakpoints (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280) are used
throughout already in the handful of places responsive classes exist — no custom breakpoint
config (there's no `tailwind.config.ts`; this app is on Tailwind v4's CSS-first `@theme` setup in
`globals.css`), and no reason to add one just for this.

## Current-state audit — what's actually desktop-only today

A pass over every page/component found these concretely broken-or-untested-on-narrow spots. Not
a redesign — the visual language (ink/paper/seal palette, cards, pill buttons) in
[08-ui-ux.md](08-ui-ux.md)/[10-color-palette.md](10-color-palette.md) is staying; this is purely
about layout surviving a narrow viewport.

- **`AppHeader` has no mobile treatment at all.** It's one `flex items-center justify-between`
  row containing: logo, Dashboard link, one link *per live level* (currently 3, will grow with
  HSK4+), then on the right Custom Quiz / Leaderboard / Friends / user badge / Log out — all as
  plain inline `<Link>`s with no wrapping strategy. At 375px this row is far wider than the
  viewport; today it just overflows/clips silently rather than wrapping onto a second line
  (nothing in the row is allowed to wrap gracefully) or scrolling. This is the single biggest
  item — every other page sits under this header.
- **The quiz runners' sticky toolbar height is a hardcoded magic number.** `QuizRunner`,
  `ChoiceQuizRunner`, and `MatchQuizRunner` all position their sticky score/timer bar at
  `top-18.25`, a value hand-tuned to sit just below `AppHeader`'s *desktop* height (flagged
  already as a coupling risk in [11-codebase-audit.md](11-codebase-audit.md), before responsive
  work was in scope). Once `AppHeader` gets a shorter/taller mobile layout (see above), this
  fixed offset goes wrong on exactly the viewport that most needs it to be right — the sticky bar
  would either float too low (wasted space) or overlap the header (content clipped underneath).
- **Vocab/answer tables have no horizontal-scroll wrapper.** `VocabTable`/`VocabTableGroup`
  (learn pages, results-screen "missed words"), `QuizRunner`'s in-quiz answer table, and
  `LeaderboardTable` are all plain `w-full` tables with no `overflow-x-auto` container —
  contradicts [08-ui-ux.md](08-ui-ux.md)'s own stated intent ("tables become horizontally
  scrollable rather than reflowing to cards"). Today a long English meaning or a wide Chinese
  phrase just forces the table wider than the card that contains it, which can force the whole
  page wider than the viewport (real horizontal page-scroll, the one thing 08's spec explicitly
  rules out).
- **`MatchQuizRunner`'s matching board is a fixed 2-column grid** (`grid-cols-2`, no responsive
  variant) — two side-by-side lists of clickable tiles, character+pinyin on the left, meaning on
  the right. Not obviously wrong at 375px (each column is still ~half the viewport), but never
  actually checked against real Chinese+pinyin+English text lengths at that width — a long
  4-syllable pinyin string or a verbose dictionary meaning could wrap awkwardly inside a narrow
  tile. Needs a real check with the widest actual content, not just an assumption either way.
- **Sticky-bar buttons mix icon+text** (`<ChevronLeft/> Prev`, `<Pause/> Pause`, `<Flag/> Give
  up`, etc.) inside `flex-wrap` rows that already do wrap at narrow widths — but tap-target size
  was never checked against the ~44×44px minimum comfortable touch target. `pillClasses`'s `"sm"`
  size (`px-4 py-1.5 text-sm`, used by header auth links and `FriendRequestRow`'s Accept/Ignore)
  is the tightest case and the most likely to be too small on a touchscreen.
- **Text inputs may trigger iOS Safari's auto-zoom.** The pinyin quiz input, and the
  username/password fields on login/register, all render at `text-sm`/default computed size.
  iOS Safari zooms the whole page in on focusing any input with a *computed* font-size under
  16px — jarring specifically on the pinyin input, which auto-focuses repeatedly (every advance)
  during a timed quiz. Needs a check of actual computed size, not just the Tailwind class name.
- **Fixed horizontal page padding (`px-6`) on every `<main>`** eats a disproportionate share of a
  375px viewport (12.8% each side) compared to how it reads on desktop. Not broken, just worth
  tightening to something like `px-4 sm:px-6` so mobile gets more usable width without changing
  the desktop look at all.
- **A few grids jump straight from 1 column to a wide multi-column layout at a single
  breakpoint** with nothing in between — e.g. the landing page's feature cards
  (`sm:grid-cols-3`, nothing at `md`) and combined-vocab grouped tables
  (`md:grid-cols-2 xl:grid-cols-3`). Not necessarily wrong, but never visually checked at the
  in-between tablet width (768px) where a 3-column jump from `sm` can look cramped.
- **What's already fine, checked and left alone**: `ChoiceQuizRunner`'s options grid
  (`grid-cols-1 sm:grid-cols-2`) already reflows correctly; `CustomQuizPicker`'s chapter-checkbox
  grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`) already has a sensible 3-step scale; the
  landing page's stats strip and hero already center and reflow fine at narrow widths since
  they're simple flex/center layouts with no fixed multi-column grid. Next.js's default viewport
  meta tag (`width=device-width, initial-scale=1`) is already present automatically — nothing to
  add there.

## Approach

- **Audit-then-fix per surface, not one giant pass.** Each item below is independently testable
  and shippable — no reason to land this as one enormous diff. Suggested order follows the list
  above roughly by blast radius: `AppHeader` first (everything sits under it), then the sticky
  quiz toolbar's coupling to it, then tables, then the smaller per-component polish items.
- **Fix the root coupling, don't patch the symptom.** `top-18.25` should become either a CSS
  custom property set once by `AppHeader` (measured or fixed-per-breakpoint) and read by the
  three quiz runners, or the runners should measure `AppHeader`'s actual rendered height at
  runtime (a `ResizeObserver` on mount, matching the existing pattern of measuring
  `stickyRef`/`containerRef` rects that `QuizRunner`/`ChoiceQuizRunner` already do for their
  scroll-to-current-row logic) — not a second hand-picked magic number for "mobile `AppHeader`
  height."
- **`AppHeader` mobile pattern**: collapse the level links + Dashboard/Custom Quiz/Leaderboard/
  Friends into a single disclosure (hamburger → slide-down/drawer panel) below a chosen width,
  keeping just the logo and a menu toggle (plus maybe `UserBadge`) in the always-visible row.
  Exact breakpoint TBD during implementation (`md` is the natural candidate, matching where the
  nav row's content actually starts colliding) — needs a real measurement against the current
  link count, not a guess, since it'll only get longer once HSK4+ levels go live
  ([07-roadmap.md](07-roadmap.md)).
- **Tables**: wrap every table (`VocabTableGroup`, `QuizRunner`'s in-quiz table,
  `LeaderboardTable`) in a `overflow-x-auto` container per column, matching what
  [08-ui-ux.md](08-ui-ux.md) already specifies — the table itself keeps a sane `min-width` so
  columns don't crush illegibly, and the *container* scrolls instead of the page.
- **Touch targets**: bump `pillClasses`'s `"sm"` vertical padding and/or `ToolbarButton`'s
  padding if a real measurement (rendered height) comes in under ~40-44px, rather than
  guessing — check with browser devtools against an actual mobile emulation, not just reading
  the Tailwind spacing scale.
- **Inputs**: confirm computed font-size on the pinyin/username/password inputs; bump to
  `text-base` (16px) specifically on `<input>` elements if the current computed size is smaller,
  scoped narrowly so it doesn't change other text sizing.

## Verification

- Manual pass at 375px, 768px, and 1280px+ (browser devtools device emulation, or real devices if
  available) through the full flow: landing (logged out) → register → dashboard → level hub →
  learn page → each quiz mode (type / choice / match) start-to-results → leaderboard (global +
  friends tabs) → custom quiz picker → friends page (add/accept/ignore). Nothing should require
  horizontal page scrolling, clip content, or overlap at any of the three widths.
- Specifically re-check the sticky-toolbar-vs-header offset after the `AppHeader` mobile pattern
  ships — this is the one change most likely to silently regress if done out of order.
- `tsc --noEmit` / `eslint` clean, as always — this is a CSS/layout-classes-only change, no new
  runtime logic expected beyond the `AppHeader` disclosure toggle and (if needed) a height
  measurement for the sticky offset.
- No visual-regression tooling exists in this repo today; verification is manual/eyeballed
  against the three reference widths above, same as every other UI change so far.

## What actually happened

**Status: implemented and verified end-to-end.** The approach above held up largely as planned,
with a few real findings along the way that weren't anticipated:

- **`AppHeader`'s collapse breakpoint is `lg` (1024px), not `md` (768px).** `md` was flagged as
  "the natural candidate... needs a real measurement, not a guess" — measured, and it was wrong:
  at exactly 768px the desktop nav row still wrapped ("HSK Quiz" split across two lines, several
  labels wrapped to two lines each), because `md` is the *minimum* width the row has to fit in,
  and the actual link content doesn't fit there yet. `lg` is the first breakpoint where the row
  stops being cramped, so that's where the hamburger drawer (`MobileNav.tsx`) hands off to it.
- **The sticky-offset fix is a runtime-measured CSS custom property, not a second magic number.**
  `HeaderHeightVar.tsx` wraps `AppHeader` in `layout.tsx`, measures its rendered height with a
  `ResizeObserver`, and writes it to `--header-height` (fallback set in `globals.css` for
  first paint). The three quiz runners read `top-[var(--header-height)]` instead of the old
  `top-18.25`. Confirmed this was worth doing, not just tidiness: the header's real height
  genuinely differs between the mobile-drawer row (73px) and the desktop nav row (61px) — a
  fixed number really would have gone wrong on whichever layout it wasn't tuned for.
- **A real, previously-unflagged bug turned up while checking touch targets**: the quiz
  toolbars' Prev/Pause/Next/Give up button group had no `flex-wrap` of its own (only the *outer*
  row did), so at 375px it forced real page-level horizontal scroll — "Give up" rendered clipped
  half off the card. Not something the original audit caught (it assumed the row "already does
  wrap"); fixed by adding `flex-wrap` to that inner button-group div in all three runners.
- **The table fix itself caused a regression on the combined-vocab grouped view**, caught during
  the tablet-breakpoint check. Giving every `VocabTableGroup` a `min-w-lg` (32rem) was correct
  for the single-table cases (learn page, in-quiz tables, results' missed-words) but broke the
  combined page's intentional multi-column layout — each category's table sits in a narrow grid
  cell by design, and forcing the same min-width there made every column need its own inner
  horizontal scroll, at both 768px and 1280px+, worse than the plain wrapping it had before this
  plan touched it. Fixed with a `constrainWidth` prop, `true` by default, passed `false` from the
  grouped multi-column render path only.
- **Touch targets**: measured (not guessed) at 34px for both `pillClasses("sm")` and
  `ToolbarButton` — under the ~40-44px target as suspected. `"sm"`'s vertical padding now matches
  `"md"`'s (`py-2.5`), landing both at 42px; only the horizontal padding still differs between the
  two sizes.
- **Input font-size (iOS auto-zoom) turned out already fine** — the audit item was written as "a
  risk, needs a real check," not a confirmed bug. Computed font-size on the pinyin/username/
  password inputs measured 16px (they inherit the body base; nothing sets a smaller explicit
  class on them), so there was nothing to fix.
- **The landing page's feature-card grid (`sm:grid-cols-3`) was fine as-is at 768px** — visually
  checked, reads cleanly, no in-between-breakpoint fix needed there. The tablet-grid risk that
  turned out real was the combined-vocab grid (previous bullet), not this one.
- **Matching board (`MatchQuizRunner`'s fixed `grid-cols-2`)** was checked against the actual
  worst-case content in the data (HSK1 ch.5's 92-character meaning for 了, HSK3 ch.11's
  `bǐjìběn diànnǎo`) at 375px and 768px — wraps cleanly, no fix needed.

Verified: full flow (landing → register → dashboard → level hub → learn page → all three quiz
modes start-to-results → leaderboard picker → custom quiz picker → friends page) scripted through
Playwright at 375px with a horizontal-scroll check after every step — all clean. A broader sweep
of every top-level page/route ran clean at 375px, 768px, 1024px, and 1280px, both at rest and in
each runner's started state. `tsc --noEmit`, `eslint .`, and `npm run build` all clean throughout.
Test accounts created during verification were cleaned up afterward.
