import "dotenv/config";
import { prisma } from "@/lib/db";
import { extractAllCombinedLevels } from "@/lib/extract/extract-combined";
import { extractAllChapters } from "@/lib/extract/extract-chapters";

async function ensureLevels(): Promise<Record<1 | 2, number>> {
  const ids = {} as Record<1 | 2, number>;
  for (const level of [1, 2] as const) {
    const row = await prisma.level.upsert({
      where: { number: level },
      create: { number: level, name: `HSK ${level}` },
      update: { name: `HSK ${level}` },
    });
    ids[level] = row.id;
  }
  return ids;
}

async function seedCombinedLevels(levelIds: Record<1 | 2, number>) {
  const levels = await extractAllCombinedLevels();

  for (const { level, words } of levels) {
    for (const word of words) {
      const existing = await prisma.word.findFirst({
        where: { levelId: levelIds[level], chapterId: null, chinese: word.chinese },
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

    console.log(`Seeded HSK ${level}: ${words.length} combined words`);
  }
}

async function seedChapters(levelIds: Record<1 | 2, number>) {
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
