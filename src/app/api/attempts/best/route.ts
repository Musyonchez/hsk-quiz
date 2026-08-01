import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getBestAttempt } from "@/lib/queries";
import { parseQuizKey } from "@/quiz/quiz-key";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const quizKey = new URL(request.url).searchParams.get("quizKey") ?? "";
  if (!parseQuizKey(quizKey)) {
    return NextResponse.json({ error: "Invalid quizKey." }, { status: 400 });
  }

  const best = await getBestAttempt(user.id, quizKey);
  return NextResponse.json(best ? { score: best.score, total: best.total } : null);
}
