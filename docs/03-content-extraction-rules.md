# Content Extraction Rules (per-chapter quizzes)

This is the exact rule set for turning one `vocabulary.md` into one chapter's quiz word list.
It's written as a spec so the parser's behavior is unambiguous and reviewable without reading
the parser code.

## Rule 1 — Primary range: everything between 课文 and 注释

Take every Chinese/Pinyin pair that appears **at or below** the heading
`## 课文 Text — Dialogues` and **above** the heading `## 注释 Grammar Notes`.

Concretely, that range contains (in the two sample files checked):
- Each `### Scene N` dialogue table (`Chinese | Pinyin | English`) — full sentences, not
  single words. **Do not quiz on full sentences** — extract only if a row is a single
  word/phrase, not a dialogue line. In practice this means: skip the Scene dialogue tables
  themselves for quiz purposes, but...
- ...the per-scene `**New Words — Scene N**` tables (HSK 2 style) *and* the consolidated
  `## 词汇 Vocabulary — New Words` table both fall inside this range and are exactly the
  single-word entries we want.
- Any `**Proper nouns:**` table (seen in `hsk1/chapter3`) also falls in this range and should
  be included — proper nouns like 中国/美国 do appear in HSK 1 material.

So in practice: **use the 词汇 Vocabulary — New Words table (plus any Proper Nouns table) as
the word list**, since it's the deduplicated superset of the per-scene tables and is confirmed
complete-with-pinyin per the pinyin guide. Do not also pull the per-scene New Words tables —
that would just duplicate the same words.

Row shape to extract: `{ chinese, pinyin, type, meaning }` from the `# | Character | Pinyin |
Type | Meaning` table header (column name is `Character` in the file but it holds the Chinese
word).

## Rule 2 — 注释 Grammar Notes and below: selective only

Everything from `## 注释 Grammar Notes` onward (注释, 拼音/语音, 汉字, 练习, 运用, etc.) is
**not** included wholesale. Only pull items that meet an "HSK-exam-relevant" bar:

**Include:**
- A grammar note's *key word/particle itself* if it's a standalone vocab item not already in
  the 词汇 table — e.g. tone-sandhi rules for 不 (bù) or 一 (yī) don't add a new word (不/一
  are already in 词汇), so skip; but a grammar note built around a word that never appeared in
  the 词汇 table (rare, but possible) should be added.
- Fixed structural patterns that HSK tests directly test sentence-pattern recognition for —
  e.g. `A + 吗？` yes/no questions, `是...的` constructions, `把`-sentences, `被`-sentences,
  result complements. These show up in HSK listening/reading sections as pattern-recognition,
  not typing, so they become a separate optional "grammar pattern" quiz item (see
  [06-quiz-mechanics.md](06-quiz-mechanics.md)), not a pinyin-typing word.

**Exclude:**
- Phonetics-only content (j/q/x vs z/c/s articulation, i/u/ü lip shape, stroke order rules,
  radical explanations) — these are pronunciation/writing instruction, not vocabulary, and HSK
  doesn't test IPA-style articulation description.
- 练习 Exercises and 运用 Application section content — these are practice prompts referencing
  words already captured, not new vocabulary.
- 热身 Warm-up section — also just recombines words already in 词汇.

## Rule 3 — Dedup across a chapter

Before writing a chapter's quiz JSON, dedupe by Chinese characters (a word appearing in both
词汇 and a Proper Nouns table, or reused across scenes, should appear once).

## Rule 4 — Missing pinyin

If a row's pinyin cell is empty (shouldn't happen in 词汇 tables per Rule 1, but guard for it
since some chapters are mid-backfill), skip the row from the quiz rather than guessing pinyin,
and log it so it can be flagged for the same manual-backfill process described in
[vocabulary-pinyin-guide.md](../../characters/words/docs/vocabulary-pinyin-guide.md).
