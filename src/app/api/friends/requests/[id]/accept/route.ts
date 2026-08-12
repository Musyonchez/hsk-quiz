import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { id } = await params;
  const requestId = Number(id);
  if (!Number.isInteger(requestId)) {
    return NextResponse.json({ error: "Invalid request id." }, { status: 400 });
  }

  const row = await prisma.friendship.findUnique({ where: { id: requestId } });
  if (!row) {
    return NextResponse.json({ error: "No such request." }, { status: 404 });
  }
  // Only the receiver of a request may accept it.
  if (row.friendId !== user.id) {
    return NextResponse.json({ error: "Not your request to accept." }, { status: 403 });
  }
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Request already resolved." }, { status: 400 });
  }

  await prisma.friendship.update({ where: { id: requestId }, data: { status: "accepted" } });
  return NextResponse.json({ ok: true });
}
