# Data Sources

> **Historical.** This describes the one-time extraction that originally produced the site's
> vocabulary. As of the self-containment pass, `website/` no longer reads the PDF or markdown
> sources below at runtime or seed time — their output is baked into
> `src/lib/extract/hsk{1,2,3}-chapters-data.ts` and `hsk{1,2,3}-combined-data.ts` as plain TS
> data, the same way HSK4A/4B always worked. The original PDFs and markdown files still live in
> the main `chinese/` repo (outside `website/`) for reference/history, but editing them no
> longer affects the site — corrections now go directly into the `*-data.ts` files. Kept below
> for context on where the data came from and the extraction rules that shaped it.

## 1. Combined level lists (raw PDF)

Path: `raw/HSK-All-Levels-Vocabulary/HSK All Levels Vocabulary/HSK {N} Vocabulary list.pdf`
(`HSK 1`, `HSK 2`, and `HSK 3` are used this way — see the note after §2 for why HSK4+ don't
follow this pattern).

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

Known structural facts (verified against all 30 chapter files, not just the original two samples):
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
  rely on for pinyin without a fallback — confirmed in practice: seeding all 30 chapters
  triggered the missing-pinyin guard (Rule 4 of
  [03-content-extraction-rules.md](03-content-extraction-rules.md)) zero times.
- Proper Nouns tables appear under three different labels across the 30 files:
  `**Proper nouns:**` (hsk1/ch3), `**Proper Nouns**` (hsk2/ch1), and one inline
  `**专有名词 Proper Noun:** 杨笑笑 ... — name of a person` (hsk2/ch13) that puts the entry on
  the same line as the label instead of in a following table. The first two are parsed; the
  third is a known, accepted gap (one proper noun missing from one chapter, out of 335 chapter
  words total) rather than a special case built into the parser for a single occurrence.
- The `#` column in 词汇 tables sometimes reads `*3` instead of `3` — a supplementary-word
  marker (a chapter-level footnote calls these "useful but not core exam vocabulary"). Words
  are read from the table positionally, not by that column, so this doesn't need special
  handling; it's noted here only because it's easy to mistake for a parsing artifact.

**HSK3 and later don't use `vocabulary.md` at all.** Per explicit instruction, no new content
was added under `characters/words/` past HSK2 — `characters/words/hsk3/` is still just the
`.keep` placeholder. HSK3's chapter word lists instead live as an in-repo TypeScript data file
(`website/src/lib/extract/hsk3-chapters-data.ts`), transcribed the same way as its combined list
(official textbook appendix, by lesson), and fed into the same `ChapterData` shape the markdown
parser produces via a shared adapter (`extractInRepoChapters` in `in-repo-chapters.ts`) so
`prisma/seed.ts` can't tell the two sources apart. Everything in this section's "known
structural facts" is specific to HSK1/HSK2's actual `.md` files; it doesn't apply to HSK3+.
HSK4A/4B/5A/5B follow the same in-repo-data pattern (currently unwired — see
[07-roadmap.md](07-roadmap.md)'s "HSK4+ paused" entry) rather than reviving the PDF/markdown
split described above.

## 3. Appendices (reference, not primary source)

`characters/words/hsk{1,2}/appendices/vocabulary-index.md` exists per level — worth checking
during implementation as a possible cross-check for the full chapter-level word list, but the
per-chapter `vocabulary.md` 词汇 table remains the source of truth since the index may lag
behind ([[one-chapter-at-a-time]] editing means appendices can be stale).
