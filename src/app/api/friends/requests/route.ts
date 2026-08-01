import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { username } });
  if (!target) {
    return NextResponse.json({ error: "No user with that username." }, { status: 404 });
  }
  if (target.id === user.id) {
    return NextResponse.json({ error: "You can't friend yourself." }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: user.id, friendId: target.id },
        { userId: target.id, friendId: user.id },
      ],
    },
  });

  if (existing) {
    if (existing.status === "accepted") {
      return NextResponse.json({ ok: true });
    }
    if (existing.status === "ignored") {
      // Anti-spam rule from docs/05-architecture.md: a request against an
      // already-ignored pair is a silent no-op, not a new pending row and
      // not an error.
      return NextResponse.json({ ok: true });
    }
    if (existing.userId === user.id) {
      // Already pending in the same direction — don't create a duplicate.
      return NextResponse.json({ ok: true });
    }
    // They already sent *us* a pending request — treat this call as
    // accepting theirs instead of creating a redundant second row.
    await prisma.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
    return NextResponse.json({ ok: true });
  }

  await prisma.friendship.create({
    data: { userId: user.id, friendId: target.id, status: "pending" },
  });
  return NextResponse.json({ ok: true });
}
