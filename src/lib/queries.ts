import { prisma } from "@/lib/db";

export function getLevelsOverview() {
  return prisma.level.findMany({
    orderBy: [{ number: "asc" }, { part: "asc" }],
    include: { _count: { select: { chapters: true } } },
  });
}

export function getMostRecentAttempt(userId: number) {
  return prisma.attempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function getLevelWithChapters(slug: string) {
  return prisma.level.findUnique({
    where: { slug },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: { _count: { select: { words: true } } },
      },
    },
  });
}

// Just the display name — for pages that already have the words/chapter
// they need and only want the level's name for a heading or breadcrumb
// (e.g. "HSK 4A" rather than the raw "4a" slug).
export function getLevelName(slug: string) {
  return prisma.level.findUnique({ where: { slug }, select: { name: true } });
}

export function getCombinedWordCount(slug: string) {
  return prisma.word.count({
    where: { level: { slug }, source: "combined" },
  });
}

export function getChapterWithWords(slug: string, chapterNumber: number) {
  return prisma.chapter.findFirst({
    where: { number: chapterNumber, level: { slug } },
    include: {
      words: { orderBy: { id: "asc" } },
      level: { select: { name: true } },
    },
  });
}

export function getCombinedWords(slug: string) {
  return prisma.word.findMany({
    where: { level: { slug }, source: "combined" },
    orderBy: { id: "asc" },
  });
}
