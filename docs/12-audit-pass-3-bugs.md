# Audit Pass 3 — Bugs

A read-only pass over `website/src`, `website/prisma`, and the extracted vocab data files,
looking specifically for things that are *wrong* (not just stylistic) — data that won't match
what the quiz can accept, or logic that will misbehave in a real session. All three findings
below were fixed in the same session as a batch edit. See
[13-audit-pass-3-best-practices.md](13-audit-pass-3-best-practices.md) for the non-bug,
best-practice half of this same audit.

## Fixed

- **Parenthesized "optional syllable" words are untypable in the quiz, and it's not a handful
  of typos — it's a systematic dictionary convention hitting dozens of words across every level
  from HSK1 through HSK5.** `matchesPinyin` (`quiz/pinyin-match.ts`) strips tone marks and
  whitespace but never touches `(`/`)`/full-width `（）`, so a stored pinyin like `nán (fāng)`,
  `bǐjìběn (diànnǎo)`, `liáotiān(r)`, or `(dài)tì` normalizes to `nan(fang)`,
  `bijibendiannao`, `liaotian(r)`, `(dai)ti` — the player has to type the literal parenthesis
  characters, with no on-screen hint that the target even contains one, to register a correct
  answer. Confirmed present in `hsk3-chapters-data.ts` (7 words: 南（方）, 春（天）, 夏（天）,
  聊天（儿）, 笔记本（电脑）, 极（了）, 冬（天）, 秋（天）), `combined-vocab-corrections.ts`'s
  HSK3 additions (same 笔记本/聊天 words), `hsk4b-chapters-data.ts`/`hsk4b-combined-data.ts`
  (勺(子), 袋(子)), and heavily in `hsk5a-chapters-data.ts`/`hsk5b-chapters-data.ts` (~20 more:
  屋(子), 银(子), 治(疗), (躲)藏, 骨(头), (代)替, (大)象, 使劲(儿), 私(人), 初(级)中(学), etc.).
  This is HSK1-3's live data today plus all of the paused HSK4/5 data waiting to go live.
  Fixed in the matching function, not per-word data edits: `normalizePinyin`
  (`quiz/pinyin-match.ts`) now strips any `(...)`/`（...）` group (and its contents) before the
  rest of normalization, so the target becomes just the mandatory syllables — `nán (fāng)` and
  `(dài)tì` now match `nan`/`dai` typed alone. Verified against every parenthesized entry found
  during the audit across HSK3/4b/5a/5b.
- **`QuizRunner`'s countdown timer called `setFinished` from inside `setSecondsLeft`'s functional
  updater** (`components/QuizRunner.tsx`). React's updater functions are expected to be pure —
  calling a different component's setter as a side effect from inside one is an anti-pattern
  that can double-fire under React's Strict Mode render-twice-to-check-purity behavior (harmless
  here since `setFinished("timeup")` was idempotent, but fragile). Fixed by no longer treating
  "timeup" as stored state at all: `finished` is now `completed`/`gaveup` (set directly in event
  handlers, which is fine) or derived at render time as `started && secondsLeft === 0`. This also
  satisfies `eslint-plugin-react-hooks`'s `set-state-in-effect` rule, which an earlier attempt at
  this fix (moving the `setFinished` call into its own `useEffect`) still tripped — the lint rule
  wants derivable state computed during render, not mirrored into state via an effect at all.
- **Landing page N+1-queried combined word counts.** `app/page.tsx` called
  `getCombinedWordCount(level.slug)` once per level inside a `Promise.all(levels.map(...))` —
  correct but one `SELECT COUNT` round-trip per level rather than a single grouped query, on
  every request. Fixed with a new `getLevelsOverviewWithCombinedCount()` in `queries.ts` that
  gets each level's chapter count and combined-word count in one `prisma.level.findMany` via two
  filtered `_count` selects; the landing page now uses that instead of `getLevelsOverview()` +
  N follow-up counts. (`getLevelsOverview()` itself is untouched — AppHeader and the dashboard
  still use it and don't need the combined count.)
