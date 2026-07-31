import "dotenv/config";
import { prisma } from "@/lib/db";
import { extractAllCombinedLevels } from "@/lib/extract/extract-combined";

async function seedCombinedLevels() {
  const levels = await extractAllCombinedLevels();

  for (const { level, words } of levels) {
    const levelRow = await prisma.level.upsert({
      where: { number: level },
      create: { number: level, name: `HSK ${level}` },
      update: { name: `HSK ${level}` },
    });

    for (const word of words) {
      const existing = await prisma.word.findFirst({
        where: { levelId: levelRow.id, chapterId: null, chinese: word.chinese },
      });

      const data = {
        levelId: levelRow.id,
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

async function main() {
  await seedCombinedLevels();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
