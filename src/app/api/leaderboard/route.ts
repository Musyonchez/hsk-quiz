import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getAcceptedFriendUserIds, getLeaderboard } from "@/lib/queries";
import { parseQuizKey } from "@/quiz/quiz-key";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const quizKey = params.get("quizKey") ?? "";
  const scope = params.get("scope") === "friends" ? "friends" : "global";

  if (!parseQuizKey(quizKey)) {
    return NextResponse.json({ error: "Invalid quizKey." }, { status: 400 });
  }

  const participantIds =
    scope === "friends" ? [...(await getAcceptedFriendUserIds(user.id)), user.id] : undefined;

  const rows = await getLeaderboard(quizKey, participantIds);
  return NextResponse.json(rows);
}
