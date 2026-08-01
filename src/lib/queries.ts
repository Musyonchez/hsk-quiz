import { prisma } from "@/lib/db";

export function isLevelNumber(n: number): n is 1 | 2 | 3 {
  return n === 1 || n === 2 || n === 3;
}

export function getLevelsOverview() {
  return prisma.level.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { chapters: true } } },
  });
}

export function getMostRecentAttempt(userId: number) {
  return prisma.attempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function getLevelWithChapters(levelNumber: number) {
  return prisma.level.findUnique({
    where: { number: levelNumber },
    include: {
      chapters: {
        orderBy: { number: "asc" },
        include: { _count: { select: { words: true } } },
      },
    },
  });
}

export function getCombinedWordCount(levelNumber: number) {
  return prisma.word.count({
    where: { level: { number: levelNumber }, source: "combined" },
  });
}

export function getChapterWithWords(levelNumber: number, chapterNumber: number) {
  return prisma.chapter.findFirst({
    where: { number: chapterNumber, level: { number: levelNumber } },
    include: { words: { orderBy: { id: "asc" } } },
  });
}

export function getCombinedWords(levelNumber: number) {
  return prisma.word.findMany({
    where: { level: { number: levelNumber }, source: "combined" },
    orderBy: { id: "asc" },
  });
}
