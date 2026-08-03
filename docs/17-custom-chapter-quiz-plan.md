# Custom Multi-Chapter Quiz Plan

Written before any code, per the same discipline as [14-phase6-plan.md](14-phase6-plan.md).

## Problem

Each level's per-chapter quizzes only cover that chapter's own handful of words, and the
existing "Combined" quiz only covers the level's whole curated word list. Between those two,
there's no way to revisit, say, "chapters 2, 5, and 7" together — so words from earlier
chapters get forgotten once you've moved on to later ones, and there's no lightweight way to
mix a few chapters for review without redoing the entire level.

## Decisions

- **Practice-only, no `Attempt` row.** Confirmed with the user: an arbitrary chapter subset has
  unbounded combinations, so tracking every combo on the leaderboard would require reworking
  leaderboard grouping for no clear benefit — this is a review tool, not a ranked quiz type.
  `QuizRunner` needs a way to skip the existing unconditional `POST /api/attempts` /
  best-score / leaderboard-average fetches (see below).
- **Minimum 2 chapters.** A single-chapter pick is already the existing per-chapter quiz page —
  requiring 2+ avoids a redundant path through the new picker.
- **Not persisted.** The chosen chapter set lives only in the URL for the one quiz run (query
  string) — no new Prisma model, no migration. Matches the user's "no need to save the
  combinations in the db."
- **Mutually exclusive with the level's "Combined" quiz in the picker UI**: selecting "Combined"
  disables/clears the individual chapter checkboxes and vice versa, since combined already
  means "all of them" — picking both doesn't mean anything additional.

## Data layer

Per-chapter words already carry `chapterId` (`prisma/schema.prisma`'s `Word` model), so an
arbitrary subset is a plain filter — no schema change:

```ts
// src/lib/queries.ts
export function getWordsForChapters(slug: string, chapterNumbers: number[]) {
  return prisma.word.findMany({
    where: { source: "chapter", level: { slug }, chapter: { number: { in: chapterNumbers } } },
    orderBy: [{ chapterId: "asc" }, { id: "asc" }],
  });
}
```

`AppHeader`'s existing `getLevelsOverview()` only returns a chapter *count*
(`_count.chapters`) — the dropdown needs actual chapter numbers, so it grows a sibling query:

```ts
export function getLevelsOverviewWithChapterNumbers() {
  return prisma.level.findMany({
    orderBy: [{ number: "asc" }, { part: "asc" }],
    include: { chapters: { select: { number: true }, orderBy: { number: "asc" } } },
  });
}
```

Fetched once in `AppHeader` (a server component) and passed down as props — no client-side
fetch/loading state needed, consistent with how the rest of the nav already works. Trivial
payload at this app's scale (HSK1-3, ~15-20 chapters each).

## Routing

Existing quiz routes use path segments (`/hsk/[level]/chapter/[chapter]/quiz`,
`/hsk/[level]/combined/quiz`) because each names one fixed, indexable thing. An arbitrary
chapter list doesn't fit that — a query string is the natural fit instead, stays bookmarkable/
shareable, and needs no client state beyond the URL:

```
/hsk/[level]/custom/quiz?chapters=2,5,7
```

New quiz page: `src/app/hsk/[level]/custom/quiz/page.tsx` (server component, same shape as the
existing chapter/combined quiz pages):

1. Parse `chapters` search param → `number[]` (split on `,`, `Number(...)`, filter `NaN`, dedupe).
2. Reject (redirect back to the level hub with nothing rendered, or a small inline "pick at
   least 2 valid chapters" message) if fewer than 2 valid numbers remain, or if a follow-up
   `getWordsForChapters` call comes back empty.
3. Fetch words via `getWordsForChapters(slug, chapterNumbers)`.
4. Render `<QuizRunner words={...} backHref={`/hsk/${slug}`} trackAttempt={false}
   durationSeconds={...} />` — `quizKey` omitted entirely (see `QuizRunner` change below).

No separate "learn" page for the custom set (unlike `/hsk/[level]/combined`'s learn view before
its quiz) — this is launched straight from the navbar picker as a quiz, not a vocab list to
browse first, so one page is enough.

**Duration**: chapter quizzes are a flat 600s; combined quizzes use a hardcoded per-level
lookup table sized to each level's known word count (see the "Give combined quizzes longer"
commit). An arbitrary subset's word count varies quiz-to-quiz, so instead of a lookup table,
scale directly off the fetched word count: `Math.max(600, words.length * 6)` seconds — same
rough per-word budget the combined-quiz table already implies (20-40 min for 177-661 words ≈
4-7s/word), just computed instead of hardcoded per level.

## `QuizRunner` change

Currently `quizKey` is required and the finish-effect unconditionally does `POST
/api/attempts` → best-score fetch → leaderboard-average fetch, and the results screen always
shows "your best" / avg-score line / "View leaderboard" link.

Add an optional prop, default preserving today's behavior:

```ts
{
  ...
  quizKey?: string;       // now optional
  trackAttempt?: boolean; // default true
}
```

When `trackAttempt` is `false`:
- Skip the entire finish-effect body (no `POST /api/attempts`, no best/leaderboard fetches).
- Results screen omits the "your best" line, the avg-score line, and the "View leaderboard"
  link — none of them have data to show anyway once nothing was submitted.
- `quizKey` isn't needed in this mode; existing chapter/combined callers are unaffected since
  they keep passing `trackAttempt` unset (defaults `true`) and their existing `quizKey`.

## Navbar link + picker page

Not a navbar dropdown — the navbar just gets one more plain link, same as `Leaderboard`/
`Friends` in `AppHeader` today:

```tsx
<Link href="/custom-quiz" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
  <Layers size={16} />
  Custom Quiz
</Link>
```

(`Layers` is already used elsewhere in the app for "combined"-flavored entry points, per
[07-roadmap.md](07-roadmap.md)'s Phase 7 icon-set note — reusing it here keeps the icon
vocabulary consistent rather than introducing a new one for a closely related concept.)

The actual picker lives on its own page, `src/app/custom-quiz/page.tsx` (server component,
session-gated like the rest of the authenticated nav) — one **accordion per level** (HSK1/2/3),
not a header dropdown:

- Fetched via `getLevelsOverviewWithChapterNumbers()` (new query, see above), rendered as a
  list of `<LevelAccordion>` client components, one per level.
- Each accordion's header is the level name — click expands/collapses that level's panel
  (plain `useState` open/closed per accordion; no reason for more than one open at once, but
  nothing forces that either — simplest version just toggles independently per level).
- Expanded panel contents, per level:
  - A "Combined" row (checkbox) — checking it disables (and un-checks) every chapter checkbox
    below it in the same panel.
  - One checkbox per chapter number for that level — checking any of these disables the
    Combined row.
  - A "Start quiz" button: disabled unless (Combined is checked) or (2+ chapters are checked).
    - Combined checked → navigate to the existing `/hsk/[slug]/combined/quiz`.
    - N chapters checked → navigate to `/hsk/[slug]/custom/quiz?chapters=2,5,7` (sorted,
      comma-joined).

This keeps `AppHeader` untouched beyond the one new link (still a plain server component, no
new client-side nav complexity there) and puts all the picker's interactive state in a page
whose only job is picking chapters — consistent with how `/leaderboard` is a level-then-quiz
picker page today rather than living in the header.

## Explicitly out of scope

- Attempt tracking / leaderboard entries for custom quizzes (see Decisions above).
- Persisting a named/saved combination for reuse later — every custom quiz is built fresh from
  the URL each time.
- A "learn" (vocab list, no quiz) view for a custom chapter subset — quiz-only, launched
  straight from the picker.
