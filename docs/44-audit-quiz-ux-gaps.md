# Audit: quiz mechanics and player-facing UX gaps

Part of the [project audit](40-project-audit-overview.md) (Aug 2026). Scope: all four quiz
runners, `CharacterIsland`/`CharacterBrowse`, `QuizModeGate`, `CustomQuizPicker`, `AllWordsTabs`,
`AppHeader`/`MobileNav`/`LogoutButton`, the auth/account forms, and every quiz-adjacent route.
Traced as actual user flows (what happens if a player does X), not just read as code.

A real bug was fixed recently in this area (#19: the mobile hamburger menu's Log-out button was
silently unclickable because a parent drawer's "close on any click" handler unmounted it mid-
interaction, discarding its pending confirm-dialog state before it could render). This audit
specifically hunted for more of that bug class — state discarded by a sibling/parent effect — in
addition to plain edge cases and mode inconsistencies.

## State discarded by parent/sibling effect (the #19 bug class)

**Nothing else in scope reproduces this exact pattern.** Specifically checked every component that
wraps interactive children in a click/dismiss handler:

- `MobileNav.tsx`'s drawer still closes on *any* click inside it, including clicks on
  `LogoutButton`'s portaled dialog (which bubbles through the React tree, not the DOM tree).
  `LogoutButton.tsx` is the only interactive child with local confirm-dialog state rendered inside
  that drawer, and — post-#19 — it now has `stopPropagation()` on every one of its handlers
  (trigger, backdrop, dialog, both buttons). **Confirmed correctly fixed, no regression.**
- `CharacterBrowse.tsx`'s popup backdrop closes on click, but the inner card calls
  `stopPropagation()` and the swipe touch handlers are bound on that same inner card — a swipe/tap
  inside the popup can't trigger the backdrop's close. Done correctly, no issue.
- No other wrapper (`QuizModeGate`, `CustomQuizPicker`'s accordion, `AllWordsTabs`) unmounts a
  child based on a sibling's state while that child has pending local interaction.

## Edge cases

1. **`goTo(index)`'s modulo (`((index % total) + total) % total`) evaluates to `NaN` if `total` is
   ever 0**, silently breaking the quiz (blank card, dead Prev/Next) — in `QuizRunner`,
   `ChoiceQuizRunner`, and `CharacterQuizRunner` alike. Every current route that renders these
   guards `words.length === 0` with `notFound()` first, and "Drill missed words" only offers when
   `missedWords.length > 0`, so **this path isn't reachable from any page today**. Still a latent
   landmine for any future caller (e.g. a hypothetical "drill by tag" feature) that renders a
   runner with a filtered/empty list. **Low** — worth a defensive guard anyway.
2. **`MatchQuizRunner`'s `finished` derivation treats an empty `leftBoard` as immediately
   "completed."** If `words` were ever empty, the component would render the finished screen (and
   fire the attempt-tracking POST with 0/0) before the player does anything. Same reachability
   caveat as #1 — chapter pages (the only `meaningVariant="match"` caller) already guard empty
   word lists — but this is a sharper version of the same bug class (an effect firing a real POST
   with zero user interaction). **Low** — unreachable today.
3. **`buildChoicesFor` can collapse to zero distractors** with a very small or same-meaning-heavy
   word pool (e.g. a 1-2 word "All Words" chapter) — not a crash, but a "multiple choice" question
   with only one clickable option, trivially answerable. Low confidence this is reachable with real
   data (would need a genuinely tiny dialog-word chapter) — worth confirming against actual chapter
   sizes. **Low/nitpick**.
4. **`AllWordsTabs`'s active-tab default doesn't match what's actually shown** for a bookmarked
   `/all/quiz` URL with no `?mode=` — the tab bar highlights "Type pinyin" while the page below it
   actually renders the 3-way mode picker (`QuizModeGate` with `initialMode=null`). **Nitpick**.

## Mode inconsistencies (same feature, different behavior across the 3 runners)

Each of these is individually intentional per its own code comment — flagged because a player
switching between modes would likely read them as bugs rather than design choices, not because
any of them is wrong in isolation.

5. ✅ **Fixed for English mode** — Hard mode (hide-second-column) originally existed only in
   `QuizRunner` (Pinyin); now `ChoiceQuizRunner`/`MatchQuizRunner` (English) both have the
   equivalent toggle too (see docs/06-quiz-mechanics.md's Hard mode section). `CharacterQuizRunner`
   remains the one runner without it, but that's now a documented deliberate choice (Character
   mode is already the harder variant, with no "second column" left to hide), not an unexplained
   gap. **Was Low** — works as coded, likely to read as a missing feature.
6. **Shuffle exists on the pre-start screen of every runner except `MatchQuizRunner`.** Given the
   match-board mechanic already shuffles both boards independently per run, this is likely
   intentional (re-ordering underlying `words` wouldn't change anything visible) — but it's the one
   runner conspicuously missing a button every sibling offers. **Nitpick**.
7. **The live "Missed: N" counter exists only in `CharacterQuizRunner`** — explicitly new/
   intentional per docs/38, not a bug — but from a player's seat, seeing it in one mode and not the
   others (when all four already track correctness live internally) reads as arbitrary. **Low**.
8. **Pause gating was checked carefully since it seemed like a likely candidate — it isn't one.**
   All four runners gate Pause identically on `timed && ...`. No gap found.

## Forms / error-display gaps

9. **✅ Fixed** — see [42-audit-frontend-components.md](42-audit-frontend-components.md) §4. **`AddFriendForm.tsx` has an unguarded `fetch`** — see
   [42-audit-frontend-components.md](42-audit-frontend-components.md) §4 for the full writeup. If
   the network request itself fails (not just a non-OK response), the submit button gets stuck
   disabled forever with no error shown — `setSubmitting(false)` never runs because there's no
   `catch`. Contrast `FriendRequestRow.tsx`, which already handles exactly this. **Medium** — the
   fix pattern exists two files away.
10. **Every other form in scope is clean.** `ChangePasswordForm`, `ResetPasswordForm`, the login/
    register/forgot-password pages all use `authClient.*` (better-auth's client), which internally
    catches network failures and surfaces them via a returned `{error}` rather than throwing — all
    correctly display an error string and correctly reset their submitting state.

## Mobile / touch

11. **`CharacterBrowse`'s popup swipe threshold (40px) and stopPropagation handling are sound** —
    no off-screen or overlap issues found at any tested width; the dialog is centered with `p-4`
    padding and `max-w-md`, can't escape the viewport.
12. **Sticky bars are consistently offset below the app header** (`sticky top-[var(--header-height)]`)
    across all four runners. `ChoiceQuizRunner` additionally has a second sticky bar pinned to
    `bottom-0` for its answer options — worth confirming on a real short-viewport device (e.g.
    landscape phone) that the scrollable table between the two sticky bars doesn't get squeezed to
    near-zero height, since the space calc could go negative there. **Flagged as suspicious but
    unconfirmed** — couldn't verify visually without rendering it live.
13. **Toolbar button touch targets** (`px-3 py-2.5`) are close to but not clearly meeting the
    44×44px guideline on the smallest breakpoint. Not confirmed as an actual complaint, just on the
    small side for Prev/Next/Give-up/Pause on mobile. **Nitpick**.

## Summary of confident, actionable items

- **Medium**: `AddFriendForm.tsx` unguarded fetch (#9) — **✅ Fixed**.
- **Low**: latent `NaN`/zero-word landmines in three runners, unreachable today (#1-2) — still open,
  deliberately held (unreachable, defense-in-depth only).
- **Low/nitpick**: the three mode inconsistencies (#5-7), the All Words tab-default mismatch (#4) —
  still open, each re-confirmed intentional per its own code comment.
- **Unconfirmed, worth a look**: `ChoiceQuizRunner`'s dual-sticky-bar layout on short viewports
  (#12) — re-examined on re-audit with a sharper verdict: the CSS mechanics (two independent
  `position: sticky` elements pinned to opposite viewport edges, same `z-5`, no shared height
  budget) combined with realistic element heights make an actual visual overlap on short/landscape
  viewports likely, not just suspicious — still not visually confirmed live, still not fixed.

## Re-audit notes (second pass)

- The `submitAttempt`/`saveFailed` extraction (this session, see 42 §3) introduced no UX
  regression — the "couldn't be saved" message is consistently worded, placed, and scoped
  (`trackAttempt && quizKey`-gated) across all four runners.
- No new instance of the PR #19 "state discarded by parent/sibling effect" bug class found
  anywhere in the quiz flow on re-check, including around the new `submittedRef`/`saveFailed` state.
- `MatchQuizRunner`'s empty-board landmine (#2 above) was re-confirmed still present and unreachable
  — flagged again only because it's the sharper version of the `NaN` bug class (an effect firing a
  real `submitAttempt` POST with zero user interaction), not because it's changed.
- A few additional low-severity a11y gaps surfaced on this pass, not previously called out: the
  "Missed: N" counter (`CharacterQuizRunner`) has no `aria-live`, `MatchQuizRunner`'s selected tile
  has no `aria-pressed`, and table-row navigation in three runners is mouse/touch-only (no
  `tabIndex`/`onKeyDown` on the `<tr>`). All low/nitpick, none blocking, none regressions.
