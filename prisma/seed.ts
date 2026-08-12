import "dotenv/config";
import { prisma } from "@/lib/db";
import { extractAllCombinedLevels } from "@/lib/extract/extract-combined";
import { extractAllChapters } from "@/lib/extract/extract-chapters";
import { extractAllDialogWords } from "@/lib/extract/extract-dialog";
import { extractAllTranscripts } from "@/lib/extract/extract-transcripts";
import { ALL_LEVELS, type LevelSlug } from "@/lib/hsk-level";
import { confirmWrite } from "../scripts/confirm-write";

async function ensureLevels(): Promise<Record<LevelSlug, number>> {
  const ids = {} as Record<LevelSlug, number>;
  for (const level of ALL_LEVELS) {
    const row = await prisma.level.upsert({
      where: { slug: level.slug },
      create: { slug: level.slug, number: level.number, part: level.part, name: level.name },
      update: { number: level.number, part: level.part, name: level.name },
    });
    ids[level.slug] = row.id;
  }
  return ids;
}

async function seedCombinedLevels(levelIds: Record<LevelSlug, number>) {
  const levels = await extractAllCombinedLevels();

  for (const { slug, words } of levels) {
    // Matched on chinese+pinyin together, not chinese alone: several
    // characters are legitimately taught twice with different readings
    // (还 hái/huán, 长 cháng/zhǎng, 只 zhǐ/zhī...) as two distinct combined
    // words. Matching by chinese alone would treat the second reading as an
    // "update" of the first and silently lose one of them.
    for (const word of words) {
      const existing = await prisma.word.findFirst({
        where: {
          levelId: levelIds[slug],
          chapterId: null,
          chinese: word.chinese,
          pinyin: word.pinyin,
        },
      });

      const data = {
        levelId: levelIds[slug],
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
        where: { levelId: levelIds[slug], chapterId: null, source: "combined" },
        select: { id: true, chinese: true, pinyin: true },
      });
      const staleIds = existingRows
        .filter((row) => !currentKeys.has(`${row.chinese}|${row.pinyin}`))
        .map((row) => row.id);
      if (staleIds.length > 0) {
        await prisma.word.deleteMany({ where: { id: { in: staleIds } } });
      }
    }

    console.log(`Seeded HSK ${slug}: ${words.length} combined words`);
  }
}

async function seedChapters(levelIds: Record<LevelSlug, number>) {
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
          chapterId_chinese_source: {
            chapterId: chapterRow.id,
            chinese: word.chinese,
            source: "chapter",
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
    // linger in the DB from a previous seed run. Scoped to source: "chapter"
    // so it never touches that same chapterId's "dialog" rows (docs/25
    // -chapter-all-words-plan.md) — the two sources are independent lists.
    if (chapterData.words.length > 0) {
      const currentChinese = chapterData.words.map((w) => w.chinese);
      await prisma.word.deleteMany({
        where: {
          chapterId: chapterRow.id,
          source: "chapter",
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

// docs/hold/25-chapter-all-words-plan.md's "All Words" — a chapter's full dialog
// vocabulary, source: "dialog", independent from that same chapter's
// source: "chapter" New Words (a word can legitimately have a row in both).
// Runs after seedChapters so every chapter row it looks up already exists.
async function seedDialogWords(levelIds: Record<LevelSlug, number>) {
  const dialogChapters = await extractAllDialogWords();

  for (const dialogData of dialogChapters) {
    const levelId = levelIds[dialogData.level];
    const chapterRow = await prisma.chapter.findUnique({
      where: { levelId_number: { levelId, number: dialogData.chapterNumber } },
    });
    if (!chapterRow) {
      console.warn(
        `Skipping dialog words for HSK${dialogData.level} chapter ${dialogData.chapterNumber}: no matching chapter row`
      );
      continue;
    }

    for (const word of dialogData.words) {
      await prisma.word.upsert({
        where: {
          chapterId_chinese_source: {
            chapterId: chapterRow.id,
            chinese: word.chinese,
            source: "dialog",
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
          source: "dialog",
        },
        update: {
          pinyin: word.pinyin,
          wordType: word.wordType,
          meaning: word.meaning,
        },
      });
    }

    // Same stale-row cleanup pattern as seedChapters, scoped to source:
    // "dialog" so it never touches that chapter's "chapter" (New Words) rows.
    if (dialogData.words.length > 0) {
      const currentChinese = dialogData.words.map((w) => w.chinese);
      await prisma.word.deleteMany({
        where: {
          chapterId: chapterRow.id,
          source: "dialog",
          chinese: { notIn: currentChinese },
        },
      });
    }

    if (dialogData.words.length > 0) {
      console.log(
        `Seeded HSK${dialogData.level} chapter ${dialogData.chapterNumber} dialog: ${dialogData.words.length} words`
      );
    }
  }
}

// A chapter's dialog transcript (docs/hold/25-chapter-all-words-plan.md's
// addendum) — unlike Word rows (upserted one at a time, matched/kept stable
// by their own chinese/pinyin/meaning), a transcript is just "the ordered
// list of lines for this chapter," so delete-then-recreate per chapter is
// simpler and correct: no stable identity for a single line to upsert
// against anyway (order is literally what defines it), and a batched
// createMany is far faster than one row at a time over the network.
async function seedTranscripts(levelIds: Record<LevelSlug, number>) {
  const transcriptChapters = await extractAllTranscripts();

  for (const transcriptData of transcriptChapters) {
    if (transcriptData.lines.length === 0) continue;
    const levelId = levelIds[transcriptData.level];
    const chapterRow = await prisma.chapter.findUnique({
      where: { levelId_number: { levelId, number: transcriptData.chapterNumber } },
    });
    if (!chapterRow) {
      console.warn(
        `Skipping transcript for HSK${transcriptData.level} chapter ${transcriptData.chapterNumber}: no matching chapter row`
      );
      continue;
    }

    await prisma.dialogLine.deleteMany({ where: { chapterId: chapterRow.id } });
    await prisma.dialogLine.createMany({
      data: transcriptData.lines.map((line) => ({
        chapterId: chapterRow.id,
        order: line.order,
        dialogNumber: line.dialogNumber,
        dialogLabel: line.dialogLabel,
        speaker: line.speaker,
        chinese: line.chinese,
        pinyin: line.pinyin,
        english: line.english,
      })),
    });

    console.log(
      `Seeded HSK${transcriptData.level} chapter ${transcriptData.chapterNumber} transcript: ${transcriptData.lines.length} lines`
    );
  }
}

async function main() {
  await confirmWrite("prisma/seed.ts");
  const levelIds = await ensureLevels();
  await seedCombinedLevels(levelIds);
  await seedChapters(levelIds);
  await seedDialogWords(levelIds);
  await seedTranscripts(levelIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
