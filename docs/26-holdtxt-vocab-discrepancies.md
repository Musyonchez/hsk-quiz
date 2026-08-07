# hold.txt vs. Existing Chapter Data — Discrepancy Notes

Generated while building [25-chapter-all-words-plan.md](25-chapter-all-words-plan.md)'s dialog
vocabulary (`scripts-tmp-extract-dialogs.ts`, cross-checking `hold.txt`'s per-chapter New Words
tables against the already-live `hsk{1,2,3}-chapters-data.ts`). Per explicit instruction: **noted
here, not applied** — nothing in the existing chapter data was changed as a result of this pass.

266 differences found across 50 chapters, falling into three buckets:

## 1. Pinyin — spacing/tone-sandhi (worth a look, not urgent)

Most are just a formatting convention difference: the existing data writes two-syllable compound
verbs with a space (`"pǎo bù"`), `hold.txt` writes them solid (`"pǎobù"`) — e.g. 跑步, 游泳, 跳舞,
上班, 唱歌, 说话, 见面, 放心, 担心, 生气, 洗澡, 刮风, 留学, 提高, 完成, 注意, 上网, 刷牙, 请假,
结婚, 害怕, 离开, 帮忙, 发烧. Not a correctness issue either way, just an inconsistency in the
existing data's own style if it ever gets revisited.

A smaller handful look like genuine tone-sandhi discrepancies worth double-checking against a
dictionary rather than assuming either source is right:
- 一起, 一直, 一边, 一般 — existing data has `yī-` (1st tone) on 一 in all four; `hold.txt` has
  `yì-`/`yí-`. Standard Mandarin tone sandhi shifts 一 to 4th tone before a non-4th-tone syllable
  and 2nd tone before a 4th-tone syllable — 起/直/边/般 are all non-4th-tone, so `hold.txt`'s
  `yì-` reading is the textbook-correct one here; the existing data's `yī-` looks like the actual
  error across all four.
- 还是: existing `háishi` (neutral-tone 是) vs. `hold.txt` `háishì` (full-tone) — both readings
  exist in different dictionaries/regions; not a clear-cut error.
- 不 (HSK1 ch2): existing lists both readings `"bù / bú"` (bù before non-4th-tone, bú before
  4th-tone, both valid — 不 is a tone-sandhi word); `hold.txt` only shows `"bù"`. Existing data is
  more complete here, not wrong.
- A few others are just missing/present the "neutral tone" spelling convention (喜欢: `xǐhuan` vs
  `xǐhuān`; 眼睛: `yǎnjing` vs `yǎnjīng`; 关系: `guānxì` vs `guānxi`; 故事: `gùshì` vs `gùshi`) —
  both readings are attested; not flagging as errors.

## 2. Meaning — wording only (not errors, hold.txt is just more abbreviated)

The large majority of the "meaning differs" rows are `hold.txt` using a shorter paraphrase of the
same definition the existing data already has in fuller form — e.g. existing "to be in/on/at
(location verb)" vs. `hold.txt` "to be in/on/at", or existing "a unit of money, same as \"yuan\""
vs. `hold.txt` "unit of money (yuan)". These aren't disagreements, just different levels of
detail — the existing data's fuller glosses are being kept as-is.

## 3. Words in one source but not the other

Mostly proper nouns `hold.txt`'s New Words tables include that the existing chapter data
deliberately omits (matching this app's established convention — see
`hsk1-combined-data.ts`'s own comment on excluding 专有名词): 中国, 美国, 李月, 北京, 王方, 谢朋,
小丽, 小刚, and others. Not a gap in the existing "New Words" list — proper nouns were never in
scope there.

A few are parenthetical-bundling notation differences: `hold.txt` writes `"下面(下)"` and
`"没有(没)"` as one row each (matching the textbook's own shorthand for "word + its short form"),
while the existing chapter data already splits these into two separate rows (`下面`/`下`,
`没有`/`没`) — same information, different row-shape, not a real discrepancy.

## Full raw list

The complete 266-line comparison is not reproduced here (see the "What actually happened" note in
[25-chapter-all-words-plan.md](25-chapter-all-words-plan.md) if it's regenerated later via
`scripts-tmp-extract-dialogs.ts`, which is deleted after use per this repo's temp-script
convention) — the three buckets above cover every category of difference found.
