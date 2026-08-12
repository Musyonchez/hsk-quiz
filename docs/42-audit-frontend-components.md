# Audit: frontend / components layer

Part of the [project audit](40-project-audit-overview.md) (Aug 2026). Scope: `src/components/*.tsx`,
`src/quiz/*.ts`, and every client-interactive page under `src/app/**/page.tsx`.

## 1. Confirmed dead code

**✅ Both fixed** — `character-choices.ts` deleted, `MatchQuizRunner`'s `variant` prop (and both
`"character"`-branch conditionals plus the pre-start text) removed entirely from both
`MatchQuizRunner` and `MatchQuizRunnerInner`; re-confirmed via grep on re-audit that no importer/
caller of either survives.

- **`src/quiz/character-choices.ts` — the whole file (~78 lines) is dead.** Grepping for
  `buildCharacterChoices`/`character-choices` across the repo returns only the file's own internal
  self-references — no importers anywhere. Post-docs/38, `CharacterQuizRunner` uses `buildChoices`
  from `meaning-choices.ts` instead (pinyin→meaning distractors), not this file's ranked
  homophone/prefix-tier logic. Low severity (no runtime risk), but it's nontrivial logic a future
  reader could mistake for live code — worth deleting.
- **`MatchQuizRunner`'s `variant="character"` branch is unreachable.** `QuizModeGate.tsx` is the
  only call site and never passes `variant`, so the component always defaults to `"meaning"`. The
  `variant === "character"` conditionals (the pinyin-withheld character-matching board, plus its
  6-line explanatory doc comment) are all dead — matching the code's own comment that "the old
  chapter-scale click-to-pair board for Character is gone" (docs/38's rebuild), but the branch and
  prop were never actually removed. Low/medium severity — safe dead code, but exactly the kind of
  trap that invites someone to "fix" a branch that can never run.

## 2. Runner-quartet duplication

**Partially fixed.** `shuffle`/`averagePercent` and the entire attempt-submission effect are now
extracted into `src/quiz/submit-attempt.ts`'s `submitAttempt()`, called identically by all four
runners (also closes §3 below in the same change). **`ToolbarButton` and the results-screen JSX are
still duplicated across all four files, unchanged** — deliberately held over as its own dedicated
refactor pass rather than folded into this round's fixes; re-confirmed still present and still the
stronger case for extraction on re-audit (file sizes are, if anything, slightly larger now that each
runner independently gained the same `saveFailed` state + message line).

Confirmed: `QuizRunner.tsx`, `ChoiceQuizRunner.tsx`, `CharacterQuizRunner.tsx`,
`MatchQuizRunner.tsx` each independently redefine `shuffle<T>`, `averagePercent`, and a local
`ToolbarButton`. The duplication surface is actually larger than that: the entire
`POST /api/attempts` → best/leaderboard fetch-and-average `useEffect` (~35 lines, byte-for-byte
except variable names) and the entire "finished" results-screen JSX (~90 lines) are copy-pasted
across all four files too.

- **`shuffle`/`averagePercent`: byte-identical, no drift.** Safe, low-value extraction target —
  trivial (~10 lines each), no risk, just inertia. Low severity.
- **`ToolbarButton`: real, silent drift, not just duplication.** `QuizRunner`'s copy supports a
  third `variant: "active"` (bronze/accent-secondary styling, used only by the Hard-mode toggle)
  that the other three copies don't have. This is deliberate — Hard mode only exists in `QuizRunner`
  per docs/hold/28 — so not a bug, but it means a naive "just extract ToolbarButton" would need the
  `variant` union widened through three call sites that don't currently know about it.
- **The result-screen JSX and attempt-submission effect are the actually risky duplication** — more
  than the named helpers. They encode real per-mode scoring semantics (`missedWords` is computed
  differently in each: `!correctIds.has`, `answers.get(id) !== id`, or `CharacterQuizRunner`'s
  dual-format branch), and any future change (e.g. to the "avg friend score" line, or the
  attempt-submission payload shape) needs replicating by hand in 4 places, with 4 different
  plausible ways to get the missed-words logic subtly wrong. Medium severity (maintenance risk, not
  a live bug) — the stronger case for extraction of the two.

## 3. Silent failure on attempt/leaderboard fetch (one bug, four copies)

**✅ Fixed** — `submitAttempt()` now checks `postRes.ok` before chaining into best/leaderboard
fetches and returns a `saveFailed` flag; all four runners show "Your score couldn't be saved — check
your connection and try Replay." on the results screen when true. Re-confirmed placement/wording
consistent and correctly scoped (silent for untracked Drill-missed reruns) across all four on
re-audit.

`QuizRunner.tsx` and the identical pattern in the other three runners: the submission effect does
`fetch("/api/attempts", {POST...}).then(() => Promise.all([...]))` without ever checking `res.ok`
on the POST before chaining into the best/leaderboard fetches. The trailing `.catch(err =>
console.error(...))` only catches network-level rejections, not 4xx/5xx responses. Concretely: if
`POST /api/attempts` returns a 500 (DB hiccup, auth session race), the player's score is silently
not recorded, the UI proceeds anyway to fetch best/leaderboard (returning stale/empty data), and
nothing on the finished-quiz screen indicates the attempt wasn't saved. The player walks away
believing their score counted. Medium severity — duplicated identically in all four runners, so
one bug fixed once needs applying in four places (or extracting per §2's suggestion, which would
fix all four at once).

## 4. Unhandled fetch rejection in `AddFriendForm` (inconsistent with its sibling)

**✅ Fixed** — now wrapped in `try/catch` matching `FriendRequestRow.tsx`'s pattern.

`AddFriendForm.tsx` has no `try/catch` around its `fetch` call. Compare `FriendRequestRow.tsx`,
which wraps the same kind of call in `try { res = await fetch(...) } catch { ... }` specifically to
handle network failures. If `fetch` throws in `AddFriendForm` (offline, DNS failure, CORS,
connection reset), `setSubmitting(false)` never runs — the button stays stuck on "Sending…"
indefinitely, no error message, no retry short of a page reload. Real, user-reachable on `/friends`,
and the fix pattern already exists two files away. Medium severity.

## 5. Accessibility: no focus management in two modal/popup components

**✅ Both fixed** — both components now focus into the dialog on open and restore focus to the
trigger on close; `LogoutButton` additionally gained Escape-to-close (it had none before).
Re-confirmed on re-audit.

- **`CharacterBrowse.tsx`'s character-detail popup** (`role="dialog" aria-modal="true"`) — no focus
  moves into the dialog on open (no `autoFocus`, no ref-focus in an effect keyed on the open
  index), so a keyboard/screen-reader user stays focused on the grid tile behind it, defeating
  `aria-modal="true"` (Tab can still reach the underlying grid and header — no real focus trap). On
  close, focus is never returned to the tile that opened it. Medium severity — this is a real,
  testable WCAG 2.4.3 gap on a component that's explicitly keyboard-first (it already has
  documented arrow-key/Escape handling right next to the missing trap).
- **`LogoutButton.tsx`'s confirm dialog** — same gap: no initial focus (e.g. onto "Cancel"), no
  focus restored to the "Log out" trigger on close, and Escape isn't wired at all here (only
  click-outside and Cancel close it). Slightly lower severity than `CharacterBrowse` (short-lived
  two-button confirm vs. a browsable popup), but it's the same missing piece appearing
  independently in two components — worth fixing once, ideally shared (e.g. a small
  `useFocusTrap`/`useReturnFocus` hook), rather than a third bespoke copy showing up later.

## 6. Checked and clean

- **Hydration risk from `Math.random()` at initial render** — `MatchQuizRunner`'s board shuffle,
  `ChoiceQuizRunner`'s `choices`, `CharacterQuizRunner`'s `englishChoices` all compute a
  `Math.random()`-based shuffle in a `useState` lazy initializer at mount, which *looks* like the
  same class of bug the shuffle-in-`useEffect` convention exists to prevent elsewhere in this
  codebase. Traced carefully: in every case the randomized data only renders once
  `started`/`answerFormat` is truthy, and that flag is always `useState(false)`/`useState(null)`
  regardless of any `initialMode` prop — so even when a page pre-selects a mode via `?mode=`
  (skipping the picker screen), the runner's own "not started yet" screen is what actually paints
  on both the server-rendered and client-hydration passes. The randomized data differs between the
  two internal computations, but it's never in the DOM until after a client-only click. No visible
  mismatch — confirmed clean, not just assumed.
- `CharacterBrowse`'s own grid shuffle is triggered only by its Shuffle button (an event handler),
  never at mount — safe.
- No other clearly-dead or always-constant props found in this scope beyond `MatchQuizRunner`'s
  `variant` (§1) — `trackAttempt`, `allowDrillMissed`, `durationSeconds`, etc. all vary meaningfully
  across real call sites.
- No TODO/FIXME/HACK found anywhere in `src/components`, `src/quiz`, or `src/app`.
- Color-only state indication — checked the result tables and match-board tiles; correctness/
  selection state is always paired with a text change, never color alone. Clean.
