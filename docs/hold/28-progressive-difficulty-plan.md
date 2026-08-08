# Progressive Difficulty — Hide a Second Column

Right now every quiz mode reveals 2 of the 3 word attributes (Chinese, pinyin, English) and asks
for the 3rd: typing mode shows Chinese + asks for pinyin (English stays visible in the table
throughout); meaning-match shows Chinese + pinyin and asks the player to pick English. This adds
an optional harder tier: **hide a second attribute too**, so the player is recalling from a
single visible column instead of two.

## Shape of the feature

A difficulty toggle, presented the same way `Shuffle` already is on the pre-quiz "Start quiz"
screen ([QuizRunner.tsx](../src/components/QuizRunner.tsx)'s `ToolbarButton` row) — an opt-in
control the player sets before starting, not a separate quiz mode/route. Concretely: a `Hide
another column` toggle that, once on, additionally blanks the column that quiz mode doesn't
already blank:

| Mode | Always hidden (asked for) | Optionally also hidden |
|---|---|---|
| Type pinyin | Pinyin | English |
| Match meaning | English | Pinyin |
| Character (27) | Chinese | Pinyin (the candidate-filter input still needs pinyin *typed*, but the answer-key table's pinyin column can still blank) |

With the toggle on, the answer-key table has only **one** visible column (Chinese, in all three
cases) until a row is answered, at which point it reveals both hidden columns for that row —
same reveal-on-answer behavior the tables already have for the one hidden column.

## Why this instead of a fully separate hard mode

Keeps the existing three quiz modes as the actual identity of "what are you being tested on,"
and layers difficulty orthogonally on top, rather than multiplying the mode count (2 columns ×
3 base modes = 6 named things to maintain, vs. 3 modes + 1 toggle). It also means it doesn't
need its own `quizKey` mode letter — see "Scoring" below for why it likely still needs *some*
key change.

## Scoring / leaderboard implications

An open question, not resolved by this doc: does a harder run belong on the **same** leaderboard
as a normal run of that quiz, or does it need its own suffix (like `-match`/`-all` already do),
since a harder run is a genuinely different (lower, presumably) score distribution than a normal
one and mixing them would make the leaderboard misleading?

Recommendation: give it its own suffix (e.g. `-hard`) so leaderboards stay comparable, matching
the precedent both `wordSet` and `mode` already set in [quiz-key.ts](../src/quiz/quiz-key.ts) —
"different difficulty = different scoreboard" is the existing house rule, not a new one.

## Implementation shape

- A new `hideSecondColumn` boolean, threaded the same way `durationSeconds`/`trackAttempt`
  already are through `QuizRunner`/`ChoiceQuizRunner`'s props, set from a pre-quiz toggle state
  (not a route/URL param — it's a per-run choice like Shuffle, not a distinct linkable quiz).
- The answer-key `<table>` in each runner needs its blanking logic to accept "blank this column
  until answered" for a second column, not just the one it already conditionally blanks.
- Quiz-key suffix (`-hard`, pending the decision above) only gets attached when
  `trackAttempt` is true and the toggle was on for that run — same pattern `mode`/`wordSet`
  already follow.

## Decisions

- **`-hard` leaderboard suffix, confirmed** — matches the existing `wordSet`/`mode` precedent in
  `quiz-key.ts` exactly, and keeping the competitive angle intact (rather than opting hard runs
  out of tracking entirely) is worth the one extra suffix.
- **Ships on Type pinyin first**, the highest-traffic mode, then extends to Match meaning and
  27's Character mode once the toggle/table-blanking pattern is proven out — avoids building the
  same plumbing three times before confirming the interaction feels right on one.
