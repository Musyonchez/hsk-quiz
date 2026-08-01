import { prisma } from "@/lib/db";

export function getLevelsOverview() {
  return prisma.level.findMany({
    orderBy: [{ number: "asc" }, { part: "asc" }],
    include: { _count: { select: { chapters: true } } },
  });
}

// Like getLevelsOverview, but also includes each level's combined-word count
// in the same query — for the landing page's stats strip, which used to
// issue one extra COUNT query per level.
export function getLevelsOverviewWithCombinedCount() {
  return prisma.level.findMany({
    orderBy: [{ number: "asc" }, { part: "asc" }],
    include: {
      _count: {
        select: { chapters: true, words: { where: { source: "combined" } } },
      },
    },
  });
}

export function getMostRecentAttempt(userId: number) {
  return prisma.attempt.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

// Highest score wins; earlier createdAt breaks a tie (rewards setting the
// bar, not just matching it later) — same rule the leaderboard uses.
export function getBestAttempt(userId: number, quizKey: string) {
  return prisma.attempt.findFirst({
    where: { userId, quizKey },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
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

// The other party's userId for every accepted friendship, either direction
// (Friendship is stored as one directional row per request — see
// 05-architecture.md — so "friends of X" means rows where X sent *or*
// received the now-accepted request).
export async function getAcceptedFriendUserIds(userId: number): Promise<number[]> {
  const rows = await prisma.friendship.findMany({
    where: { status: "accepted", OR: [{ userId }, { friendId: userId }] },
    select: { userId: true, friendId: true },
  });
  return rows.map((row) => (row.userId === userId ? row.friendId : row.userId));
}

export type FriendsData = {
  friends: { id: number; displayName: string }[];
  incoming: { requestId: number; user: { id: number; displayName: string } }[];
  outgoing: { requestId: number; user: { id: number; displayName: string } }[];
};

// Friendship is one directional row per request (userId sent it to
// friendId) — see docs/05-architecture.md. Reading "my friends page" needs
// four different slices of that one table for the current user: accepted
// rows they sent, accepted rows they received, pending rows waiting on
// their decision, and pending rows waiting on someone else's.
export async function getFriendsData(userId: number): Promise<FriendsData> {
  const [acceptedSent, acceptedReceived, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { userId, status: "accepted" },
      include: { friend: { select: { id: true, displayName: true } } },
    }),
    prisma.friendship.findMany({
      where: { friendId: userId, status: "accepted" },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.friendship.findMany({
      where: { friendId: userId, status: "pending" },
      include: { user: { select: { id: true, displayName: true } } },
    }),
    prisma.friendship.findMany({
      where: { userId, status: "pending" },
      include: { friend: { select: { id: true, displayName: true } } },
    }),
  ]);

  return {
    friends: [...acceptedSent.map((f) => f.friend), ...acceptedReceived.map((f) => f.user)],
    incoming: incoming.map((f) => ({ requestId: f.id, user: f.user })),
    outgoing: outgoing.map((f) => ({ requestId: f.id, user: f.friend })),
  };
}

export type LeaderboardRow = {
  userId: number;
  displayName: string;
  score: number;
  total: number;
  createdAt: Date;
};

// One row per user — their single best attempt for this quizKey — ranked
// highest score first, earliest createdAt breaking a tie. `participantIds`
// scopes to a friends-tab lookup; omit it for the global leaderboard.
// Dedupe happens in application code rather than a DB groupBy, since
// SQLite/Prisma can't cleanly express "best row per user, with that row's
// other columns" in one groupBy query — fine at this app's scale (see
// docs/14-phase6-plan.md).
export async function getLeaderboard(
  quizKey: string,
  participantIds?: number[]
): Promise<LeaderboardRow[]> {
  const attempts = await prisma.attempt.findMany({
    where: {
      quizKey,
      ...(participantIds ? { userId: { in: participantIds } } : {}),
    },
    orderBy: [{ score: "desc" }, { createdAt: "asc" }],
    include: { user: { select: { displayName: true } } },
  });

  const seen = new Set<number>();
  const ranked: LeaderboardRow[] = [];
  for (const attempt of attempts) {
    if (seen.has(attempt.userId)) continue;
    seen.add(attempt.userId);
    ranked.push({
      userId: attempt.userId,
      displayName: attempt.user.displayName,
      score: attempt.score,
      total: attempt.total,
      createdAt: attempt.createdAt,
    });
  }
  return ranked;
}
