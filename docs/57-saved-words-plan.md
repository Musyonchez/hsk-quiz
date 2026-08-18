# Saved Words — plan

**Status: plan only, nothing built yet.** Written up front per this repo's usual practice
(docs/17, docs/38, docs/47 before them) — read for the shape, then implement and correct as
reality demands, same as every prior plan doc here.

**Trimmed to a lean v1** (the original full-scope version tried to ship 3-list categorization,
a full onboarding flow, and a 2-week auto-hide cron all in one pass — reasonable as a final
shape, disproportionate as a first PR). Everything cut is still fully specified, just moved to
the **Later** section at the end of this doc rather than deleted — nothing here was a bad idea,
just more than a first slice needs.

## What this is

A lightweight bookmarking system for individual vocabulary words — the words a player finds
tricky, sitting alongside (not replacing) the existing chapter/combined/custom quiz structure. A
plus icon next to a word saves it; a new nav tab, **Saved Words**, is where saved words live and
get drilled — reusing the existing quiz runners rather than building a new one.

**V1 scope in one sentence:** one implicit list per account, off by default via a plain toggle
(no onboarding flow yet), plus icon only where it can't leak a hard-mode-hidden answer, a small
new toast system with undo. No list management, no 3-list categorization, no auto-hide — those
are real, wanted, and coming, just not in the first PR. See the **Later** section at the end.

## Naming

"Saved Words" for the feature/nav tab/page title. Avoiding "Custom Quiz" (already a different,
existing feature — a chapter/level picker, docs/17) and "Drill" (already means "requiz the words
you got wrong in *this* run," docs/hold/18) — reusing either name here would collide with an
existing meaning.

## 1. Where the plus icon appears

Every current call site of `<SpeakerButton>`, per a repo-wide grep, falls into two real
categories:

**Per-word (`kind="word"`):**
- `VocabTable.tsx` — chapter/combined/All-Words answer-key tables
- `CharacterBrowse.tsx` — the Character-mode browse grid and its popup
- `QuizRunner.tsx`, `ChoiceQuizRunner.tsx`, `MatchQuizRunner.tsx`, `CharacterQuizRunner.tsx` — the
  pre-start word-preview tables and (where shown) in-quiz word displays

**Per-sentence (`kind="sentence"`) — out of scope entirely, v1 and later:**
- `src/app/hsk/[level]/chapter/[chapter]/all/page.tsx` — the chapter dialog transcript. A
  `DialogLine` (a full sentence) isn't a `Word` and has no vocabulary-word identity to save.

**V1 further restricts placement within the per-word list, to sidestep a real spoiler risk
cheaply instead of solving it (see §Later's "hard-mode-aware toast" for the full version):**
`QuizRunner`'s Hard mode (`hideSecondColumn`, docs/hold/28) hides either the pinyin or the meaning
column *during* a quiz, specifically so the player has to recall it. A plus icon rendered next to
an in-quiz answer display would let the save-confirmation toast (or the icon's own saved-state)
leak what's supposed to be hidden. **V1 decision: the plus icon only renders in
pre-quiz/no-answer-to-hide contexts** — `VocabTable`, `CharacterBrowse`, and every quiz runner's
*pre-start* word-preview table (before Start is clicked, nothing is hidden yet) — not on any
in-quiz answer display. This isn't a permanent limitation, just the cheapest way to avoid the
spoiler problem until the full hard-mode-aware toast (§Later) exists.

## 2. What "the same word" means — the duplicate-detection problem

This needs answering before anything else, because the schema doesn't make it obvious, and it's
identical for v1 and every later phase. Checked directly against `prisma/schema.prisma`: **the
same Chinese word can exist as several different `Word` rows with different `id`s.** `Word` is
unique on `[chapterId, chinese, source]`, where `source` is `"chapter"` (curated New Words),
`"dialog"` (that chapter's full dialog vocabulary, docs/hold/25), or `"combined"`
(`chapterId: null`, a level's cumulative official list). A word taught in chapter 5's New Words,
appearing again in that chapter's dialog vocabulary, and again in the level's combined list, is
**three separate rows**, three separate `id`s — not one row referenced from three places.
`QuizWord.id` (src/quiz/types.ts) is that row's raw DB id, so two plus icons rendered for what a
player sees as "the same word" can easily carry two different `id`s.

**Decision: identity for saving/duplicate-detection is the normalized Chinese text
(`chinese`, exact string match), not `Word.id`.** A `SavedWord` row stores `chinese` (+ a
denormalized snapshot of `pinyin`/`meaning`, see §3) rather than a foreign key to one specific
`Word` row. Saving "already-saved" is then a simple `chinese` lookup, regardless of which of the
several possible `Word` rows the click actually came from.

## 3. Data model

Built for where this is going (multi-list), used the v1-simple way (exactly one list, always,
per account) — so Phase 2 (§Later) is a UI change, not a schema migration.

```prisma
model SavedWordList {
  id        Int          @id @default(autoincrement())
  userId    Int
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  name      String
  isDefault Boolean      @default(false)
  createdAt DateTime     @default(now())
  words     SavedWord[]

  @@unique([userId, name])
  // v1: every user has at most one row here, auto-created (isDefault: true)
  // the first time they enable the feature (§4) — no create/rename/delete
  // UI yet. The uniqueness/multi-row shape is already correct for §Later's
  // "up to 3, player-named" without changing this model again.
}

model SavedWord {
  id        Int           @id @default(autoincrement())
  listId    Int
  list      SavedWordList @relation(fields: [listId], references: [id], onDelete: Cascade)
  chinese   String
  pinyin    String
  meaning   String?
  createdAt DateTime      @default(now())

  @@unique([listId, chinese])
}
```

`pinyin`/`meaning` are **snapshotted at save time**, not looked up live from `Word` — there's no
single `Word.id` to reference per §2, and a saved word should keep showing what the player
actually saw when they saved it even if a future content correction changes the source `Word`
row's pinyin/meaning slightly (same "don't let a content edit silently rewrite history" reasoning
`Attempt` already follows). `mnemonic` is deliberately **not** snapshotted — always looked up live
by `chinese` at render/quiz time, since a mnemonic is reference material that should stay current.

**Per-account toggle** — a single scalar on `User`, not a new table:

```prisma
// on model User, added:
savedWordsEnabled Boolean @default(false)
```

(`savedWordsLastUsed` — needed for the §Later auto-hide cron — is deferred with it; nothing in v1
reads or writes it, so it's not added until that phase actually needs it.)

## 4. Turning it on/off (v1: a plain toggle, not a full onboarding flow)

**New account default: `savedWordsEnabled: false`.** No plus icon anywhere until the player opts
in.

**V1's version of "opting in":** the Saved Words nav tab is always visible. Visiting it while
`savedWordsEnabled` is `false` shows one short line of explanation ("Save tricky words here to
drill them later.") and a single toggle/button — no diagram, no multi-step onboarding screen yet
(that's §Later). Flipping it on:
1. Sets `savedWordsEnabled: true`.
2. Auto-creates the user's one `SavedWordList` (`isDefault: true`, name "My Words") if it doesn't
   exist yet.
3. The tab immediately shows the (empty) list.

**Turning it off:** the same toggle, reachable from inside the tab at any time, flips
`savedWordsEnabled` back to `false`. **This never touches `SavedWord`/`SavedWordList` rows** —
only hides the plus icon and gates the tab behind the explanation+toggle screen again.

No auto-hide-after-disuse in v1 — that's §Later. A player who turns this on and never touches it
again just... has an unused tab, same as any other feature nobody happens to use. Fine for v1;
the auto-hide is a real, wanted refinement once there's usage data suggesting it's actually needed
rather than added pre-emptively.

## 5. Saving a word (v1: always the one list, no picker)

Since v1 only ever has one list, clicking + always saves straight into it — no dropdown, no list
picker (that UI doesn't exist until §Later). Optimistic UI (icon flips to a "saved" state
immediately) plus a toast (§7).

**Already saved:** clicking + for a word already in the list (by `chinese` match, §2) doesn't
insert a duplicate — shows an "Already saved" toast instead of the success/undo one.

## 6. The plus icon itself

A Lucide `Plus` (a plain glyph, not `PlusCircle`/`CirclePlus`) — matches how this codebase's
existing icon usage (`ToolbarButton`, `SpeakerButton`, `MobileNav`'s hamburger) consistently uses
Lucide's plain/outline glyphs inside the app's own pill/circle chrome, rather than icons bringing
their own circle/fill.

**Placement — "the space between the character and the sound icon,"** per the original request:
in every allowed call site (§1) the Chinese character and `SpeakerButton` already sit in the same
flex row — the plus icon becomes a same-sized sibling button positioned between them, same
tap-target sizing as `SpeakerButton`'s existing `p-1` circle-icon-button treatment.

**Saved-state feedback on the icon itself** (independent of the toast, which is transient): once
saved, the icon swaps to a filled/check state, so a player scanning a word list can see at a
glance which words they've already flagged.

## 7. Toasts (v1: success/already-saved, undo, X dismiss — new infrastructure either way)

Checked: there's no toast/notification component anywhere in this codebase today (grepped for
"toast" across `src/`, nothing). This is genuinely new, not a reuse of something existing.

**V1 scope:**
- Appears on save (success or "already saved").
- Success toast includes **Undo** — removes the just-saved row again (delete by the same
  `[listId, chinese]` key), fast enough to correct a misclick.
- Dismissible via an **X** in the top-right corner, and auto-dismisses after a few seconds
  (~4-5s) if untouched.
- **No hard-mode-content-awareness needed in v1** — §1 already keeps the plus icon out of every
  context where an answer could be hidden, so there's nothing for the toast to accidentally leak.
- **No swipe-to-dismiss in v1** — the X plus auto-dismiss covers dismissal; swipe is a gesture
  refinement, §Later.

**Implementation shape:** a `ToastProvider` mounted once near the root layout (alongside
`AppHeader`), a `useToast()` hook exposing `show({ message, action? })`, stacking if more than one
fires in quick succession. No new dependency — small enough to build directly in this app's
existing style (plain Tailwind + a Lucide `X`), matching this repo's consistent bias against
adding a library for something this contained.

## 8. The Saved Words tab/page (v1: one flat list + quiz modes)

New route, `/saved-words`, added to `AppHeader`'s nav (desktop link row + `MobileNav`'s drawer,
same pattern every existing nav link already follows) — a `Bookmark` or `Star` Lucide icon fits
alongside `Layers`/`Trophy`/`Users`.

V1 layout, once enabled (§4):
- The toggle (to turn the feature back off).
- The one list's words: Chinese, pinyin, meaning, mnemonic if present (looked up live per §3), a
  remove-from-list control. No list switcher — there's only ever one list in v1.
- **Quiz modes, reusing the existing runners** — this is the actual payoff, not deferred to
  later: the same answer formats this app already has (type pinyin, meaning match/choice,
  character recall), same as docs/06 describes for chapter/combined/custom quizzes, just sourced
  from this list's `SavedWord` rows instead of a chapter/level/custom selection. No new quiz
  runner component — `QuizRunner`/`ChoiceQuizRunner`/`MatchQuizRunner`/`CharacterQuizRunner`
  already do "drill words from selection X" generically once handed a `QuizWord[]`.
  Attempt-tracking/leaderboard question for this quiz key is still open — see §Open questions.

## 9. API surface needed (v1)

- `POST /api/saved-words` — body `{ chinese, pinyin, meaning }` (no `listId` — v1 always targets
  the caller's one list), upserts (no-op + "already saved" if `chinese` exists).
- `DELETE /api/saved-words/:id` — remove one saved word (undo, or the tab's own remove control).
- `GET /api/saved-words` — the player's saved words, for the tab.
- `POST /api/account/saved-words-toggle` — body `{ enabled }`, flips `savedWordsEnabled` (and
  auto-creates the default list on first enable, per §4).

Every mutating route follows the pattern already established everywhere else in this app:
`getSessionUser()` first, ownership check, input validation before touching the DB — see
`src/app/api/friends/**` for the closest existing shape.

## Open questions (v1)

1. **Leaderboard/attempt-tracking for saved-word drills (§8)** — tracked like a real quiz, or
   always `trackAttempt={false}`? A personal, freely-edited word list arguably doesn't make sense
   to leaderboard the same way a fixed chapter does — leaning toward `trackAttempt={false}`, but
   not decided here.
2. **Toast auto-dismiss duration** — proposed 4-5s, not confirmed.
3. **The "saved" icon-state visual** (filled `Plus` vs. `Check` vs. something else) — worth a
   quick look at actual Lucide options before committing.

---

## Later / not in v1 (still fully specified below — nothing here is a bad idea, just deferred)

### Multi-list: up to 3, player-named

- The player can create up to **2 more** lists (3 total) from inside the Saved Words tab, each
  named at creation (`@@unique([userId, name])` — already enforced by the v1 schema, §3). Renaming
  is always available.
- **Saving with multiple lists:** clicking + opens a small dropdown anchored to the button —
  every list name, click one to save there. Closest existing visual precedent: `CustomQuizPicker`'s
  per-level accordion/dropdown, not a new visual language.
- **"Already saved" becomes per-list, not global** — the same word can legitimately exist in more
  than one of the player's own lists (that's the point of categorizing), so the duplicate check
  (§2) only looks at the *target* list being saved into.
- **Move/copy between lists**, from the tab (not the plus icon, which only ever adds to one list
  per click): "Move to…" / "Copy to…", each opening the same list-picker dropdown minus the
  current list. Move = delete from source + insert into target; copy = insert into target only.
  Both still respect the per-target-list duplicate check.
- **List deletion — still an open question, not decided even for this phase:** delete a
  non-default list's `SavedWord` rows too (simple, needs a real confirm dialog, matching
  `LogoutButton`'s existing pattern), or migrate its words into the default list instead (nothing
  lost, but "delete" then doesn't mean delete)? Leaning toward delete-with-confirm as the more
  standard mental model, but flagging rather than deciding silently. **The default list can never
  be deleted** either way — there must always be somewhere a saved word can land.
- **New API routes this phase needs:** `POST /api/saved-word-lists` (create, rejects past 3 or a
  duplicate name), `PATCH /api/saved-word-lists/:id` (rename), `DELETE /api/saved-word-lists/:id`
  (per the open question above), and `POST /api/saved-words/:id/move` / `.../copy` (body
  `{ targetListId }`). `POST /api/saved-words` gains a required `listId` in its body once more
  than one list can exist.

### Full onboarding flow (upgrading v1's plain toggle)

- A short, plain-language explanation of what a saved word is and why the plus icon is normally
  hidden, plus a real annotated crop of the actual `VocabTable` row with the plus icon circled/
  arrowed (not an abstract illustration) — what the player sees should match exactly what they'll
  see next.
- One CTA at the bottom ("Show the + button on words," exact copy TBD) replacing v1's bare toggle.

### 14-day inactivity auto-hide

- `savedWordsLastUsed: DateTime?` added to `User` (deferred from §3 since nothing needs it yet).
  Touched on: saving a word, opening the Saved Words tab, starting a drill quiz from a saved list,
  and toggling the feature on/off itself (so enabling it and immediately closing the tab doesn't
  put you right back at the boundary).
- A scheduled job (mirroring the existing `/api/cron/purge-rate-limits` + Vercel Cron pattern,
  docs/41) runs daily, finds every user with `savedWordsEnabled: true` and `savedWordsLastUsed`
  older than 14 days, flips `savedWordsEnabled` back to `false` — same effect as the player
  turning it off themselves, same guarantee: `SavedWord`/`SavedWordList` untouched. They see the
  onboarding screen again next time, and the CTA immediately restores everything.
- New route: `GET /api/cron/purge-inactive-saved-words` (naming TBD), `CRON_SECRET`-gated exactly
  like the existing rate-limit-purge cron, wired into `vercel.json` alongside it.

### Toast: swipe-to-dismiss

Touch-drag-to-dismiss, matching the swipe gesture `CharacterBrowse`'s popup already implements
(same 40px-threshold pattern, reused rather than reinvented) — additive to v1's X/auto-dismiss,
not a replacement.

### Full hard-mode-aware toast content

If the plus icon's placement ever expands beyond §1 v1's conservative "pre-quiz/no-hidden-answer
contexts only" restriction — e.g. onto an in-quiz answer display where Hard mode is actively
hiding a column — the toast needs to actively respect that instead of relying on placement to
avoid the problem: **in any context where hard mode (or an equivalent hide-part-of-the-answer
state) is active, the toast shows only the Chinese character**, never pinyin or meaning,
regardless of what got saved underneath. Not needed as long as v1's placement restriction holds.

## Suggested implementation phases

1. **V1, everything above the `---`.** Schema (both tables, but v1 only ever populates one list
   row per user), the plain toggle, plus icon restricted to safe placements, single-list saving,
   the new toast system (success/already-saved/undo/X), the Saved Words tab with one flat list +
   quiz-mode integration. One PR-sized effort, not three.
2. **Multi-list.** Everything in "Multi-list: up to 3, player-named" above.
3. **Full onboarding + auto-hide + (if needed) hard-mode-aware toast.** Everything else in
   "Later" — naturally last since the hard-mode-aware toast specifically only matters if a later
   placement decision needs it.
