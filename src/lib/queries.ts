import { prisma } from "@/lib/db";
import { isLevelSlug } from "@/lib/hsk-level";

export const isLevelSlugParam = isLevelSlug;

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

export function getCombinedWordCount(slug: string) {
  return prisma.word.count({
    where: { level: { slug }, source: "combined" },
  });
}

export function getChapterWithWords(slug: string, chapterNumber: number) {
  return prisma.chapter.findFirst({
    where: { number: chapterNumber, level: { slug } },
    include: { words: { orderBy: { id: "asc" } } },
  });
}

export function getCombinedWords(slug: string) {
  return prisma.word.findMany({
    where: { level: { slug }, source: "combined" },
    orderBy: { id: "asc" },
  });
}
