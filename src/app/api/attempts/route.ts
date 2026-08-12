import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQuizKey } from "@/quiz/quiz-key";
import { checkRateLimit } from "@/lib/api-rate-limit";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  // docs/41-audit-backend-data.md: this route had no rate limit at all, and
  // score/total are entirely client-supplied — a logged-in user could
  // otherwise script unlimited POSTs to pad their own (or anyone's, since
  // quizKey is also client-supplied) leaderboard rows. 20/60s is generous
  // enough for legitimate rapid use (e.g. quickly replaying/drilling missed
  // words several times in a session) while still capping a scripted flood.
  const allowed = await checkRateLimit(`app:attempts:${user.id}`, 60, 20);
  if (!allowed) {
    return NextResponse.json({ error: "Too many attempts, slow down." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const quizKey = typeof body?.quizKey === "string" ? body.quizKey : "";
  const score = body?.score;
  const total = body?.total;
  const durationSeconds = body?.durationSeconds;

  const validQuizKey = parseQuizKey(quizKey) !== null;
  const validNumbers =
    Number.isInteger(score) &&
    Number.isInteger(total) &&
    Number.isInteger(durationSeconds) &&
    total > 0 &&
    score >= 0 &&
    score <= total &&
    durationSeconds >= 0;

  if (!validQuizKey || !validNumbers) {
    return NextResponse.json({ error: "Invalid attempt payload." }, { status: 400 });
  }

  await prisma.attempt.create({
    data: { userId: user.id, quizKey, score, total, durationSeconds },
  });

  return NextResponse.json({ ok: true });
}
