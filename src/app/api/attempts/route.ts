import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseQuizKey } from "@/quiz/quiz-key";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
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
