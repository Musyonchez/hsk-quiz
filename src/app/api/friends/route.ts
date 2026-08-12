import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { getFriendsData } from "@/lib/queries";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  return NextResponse.json(await getFriendsData(user.id));
}
