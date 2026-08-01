import "dotenv/config";
import { prisma } from "@/lib/db";
import { extractAllCombinedLevels } from "@/lib/extract/extract-combined";
import { extractAllChapters } from "@/lib/extract/extract-chapters";

async function ensureLevels(): Promise<Record<1 | 2 | 3, number>> {
  const ids = {} as Record<1 | 2 | 3, number>;
  for (const level of [1, 2, 3] as const) {
    const row = await prisma.level.upsert({
      where: { number: level },
      create: { number: level, name: `HSK ${level}` },
      update: { name: `HSK ${level}` },
    });
    ids[level] = row.id;
  }
  return ids;
}

async function seedCombinedLevels(levelIds: Record<1 | 2 | 3, number>) {
  const levels = await extractAllCombinedLevels();

  for (const { level, words } of levels) {
    // Matched on chinese+pinyin together, not chinese alone: several
    // characters are legitimately taught twice with different readings
    // (还 hái/huán, 长 cháng/zhǎng, 只 zhǐ/zhī...) as two distinct combined
    // words. Matching by chinese alone would treat the second reading as an
    // "update" of the first and silently lose one of them.
    for (const word of words) {
      const existing = await prisma.word.findFirst({
        where: {
          levelId: levelIds[level],
          chapterId: null,
          chinese: word.chinese,
          pinyin: word.pinyin,
        },
      });

      const data = {
        levelId: levelIds[level],
        chapterId: null,
        chinese: word.chinese,
        pinyin: word.pinyin,
        wordType: null,
        meaning: word.english,
        category: word.category,
        source: "combined",
      };

      if (existing) {
        await prisma.word.update({ where: { id: existing.id }, data });
      } else {
        await prisma.word.create({ data });
      }
    }

    // Delete rows a previous seed run created that the current extraction no
    // longer produces (e.g. a word corrected/renamed in
    // combined-vocab-corrections.ts, or a category of word — like proper
    // nouns — dropped from extraction entirely). Keyed on chinese+pinyin for
    // the same homograph reason as above — a chinese-only check could
    // mistake one reading's row for still-current because its sibling
    // reading is still in the fresh set.
    if (words.length > 0) {
      const currentKeys = new Set(words.map((w) => `${w.chinese}|${w.pinyin}`));
      const existingRows = await prisma.word.findMany({
        where: { levelId: levelIds[level], chapterId: null, source: "combined" },
        select: { id: true, chinese: true, pinyin: true },
      });
      const staleIds = existingRows
        .filter((row) => !currentKeys.has(`${row.chinese}|${row.pinyin}`))
        .map((row) => row.id);
      if (staleIds.length > 0) {
        await prisma.word.deleteMany({ where: { id: { in: staleIds } } });
      }
    }

    console.log(`Seeded HSK ${level}: ${words.length} combined words`);
  }
}

async function seedChapters(levelIds: Record<1 | 2 | 3, number>) {
  const chapters = await extractAllChapters();

  for (const chapterData of chapters) {
    const levelId = levelIds[chapterData.level];

    const chapterRow = await prisma.chapter.upsert({
      where: {
        levelId_number: {
          levelId,
          number: chapterData.chapterNumber,
        },
      },
      create: {
        levelId,
        number: chapterData.chapterNumber,
        title: chapterData.title,
      },
      update: { title: chapterData.title },
    });

    for (const word of chapterData.words) {
      await prisma.word.upsert({
        where: {
          chapterId_chinese: {
            chapterId: chapterRow.id,
            chinese: word.chinese,
          },
        },
        create: {
          levelId,
          chapterId: chapterRow.id,
          chinese: word.chinese,
          pinyin: word.pinyin,
          wordType: word.wordType,
          meaning: word.meaning,
          category: null,
          source: "chapter",
        },
        update: {
          pinyin: word.pinyin,
          wordType: word.wordType,
          meaning: word.meaning,
        },
      });
    }

    // Same stale-row cleanup as seedCombinedLevels — a word dropped from a
    // chapter's markdown (or a whole category, like proper nouns) shouldn't
    // linger in the DB from a previous seed run.
    if (chapterData.words.length > 0) {
      const currentChinese = chapterData.words.map((w) => w.chinese);
      await prisma.word.deleteMany({
        where: {
          chapterId: chapterRow.id,
          chinese: { notIn: currentChinese },
        },
      });
    }

    console.log(
      `Seeded HSK${chapterData.level} chapter ${chapterData.chapterNumber}: ${chapterData.words.length} words`
    );
  }

  // GrammarPattern (Rule 2 of website/docs/03-content-extraction-rules.md) is
  // deliberately not auto-extracted: which grammar notes are "HSK-exam
  // relevant" is a judgment call, and the source chapters' grammar-notes
  // headings aren't consistent enough (numbered vs. unnumbered, Chinese- vs.
  // English-first, inline vs. separate grammer.md) to make that judgment
  // reliably from markdown structure alone. See website/docs/07-roadmap.md.
}

async function main() {
  const levelIds = await ensureLevels();
  await seedCombinedLevels(levelIds);
  await seedChapters(levelIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
