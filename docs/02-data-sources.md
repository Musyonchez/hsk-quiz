# Data Sources

## 1. Combined level lists (raw PDF)

Path: `raw/HSK-All-Levels-Vocabulary/HSK All Levels Vocabulary/HSK {N} Vocabulary list.pdf`
(only `HSK 1` and `HSK 2` are used).

Format confirmed by inspection: a single table per PDF with columns `Chinese | Pinyin |
English`, broken into word-class sections (`Personal Pron.`, `Numeral`, `Quantifier`, `Adverb`,
`Noun`, `Verb`, ...) marked by a full-width header row. Some rows have no English gloss
(auxiliary particles like 的/了/吗/呢) — keep them, quiz only needs Chinese → Pinyin.

Extraction plan:
- Parse the PDF once per level, produce a flat list of `{ chinese, pinyin, english, category }`.
- The `category` field (Personal Pron., Noun, Verb, ...) is kept as metadata but not required
  for the quiz — it's useful for optionally grouping the answer-key table, matching how the
  reference "answer key" screenshot appears to group by rough topic.
- Rows without English are still included (pinyin/typing target is what matters).

## 2. Per-chapter lists (`vocabulary.md`)

Path: `characters/words/hsk{1,2}/chapter{N}/vocabulary.md`.

These are hand-written markdown, not machine-generated, so parsing is section-based rather
than whole-file. See [03-content-extraction-rules.md](03-content-extraction-rules.md) for the
precise rule on which part of the file is in-scope.

Known structural facts (verified against `hsk1/chapter3` and `hsk2/chapter5`):
- Every chapter file has a `## 课文 Text — Dialogues` heading, followed by one or more
  `### Scene N` blocks, each with a `Chinese | Pinyin | English` table and (in HSK 2 files)
  a `**New Words — Scene N**` sub-table.
- Every chapter file has a `## 词汇 Vocabulary — New Words` heading with the consolidated
  `# | Character | Pinyin | Type | Meaning` table — this is a superset of the per-scene New
  Words tables, so it's the primary vocab source, not the per-scene ones (avoids duplicates).
- A `## 注释 Grammar Notes` heading always follows 词汇 Vocabulary. HSK 2 chapters additionally
  have a *separate* `grammer.md` file with the same grammar points explained in plain English
  (see [characters/words/docs/grammar-file-guide.md](../../characters/words/docs/grammar-file-guide.md)).
  Prefer `grammer.md` when present — it already has pinyin guaranteed next to every character,
  per that file's own house rule.
- HSK 1 chapters have no `grammer.md`; grammar notes live inline under `## 注释 Grammar Notes`
  in `vocabulary.md` only.
- Not every `vocabulary.md` table row is guaranteed to have pinyin filled in — some sections
  are mid-backfill per
  [characters/words/docs/vocabulary-pinyin-guide.md](../../characters/words/docs/vocabulary-pinyin-guide.md).
  The 词汇 Vocabulary table itself is called out there as **already complete**, so it's safe to
  rely on for pinyin without a fallback.

## 3. Appendices (reference, not primary source)

`characters/words/hsk{1,2}/appendices/vocabulary-index.md` exists per level — worth checking
during implementation as a possible cross-check for the full chapter-level word list, but the
per-chapter `vocabulary.md` 词汇 table remains the source of truth since the index may lag
behind ([[one-chapter-at-a-time]] editing means appendices can be stale).
