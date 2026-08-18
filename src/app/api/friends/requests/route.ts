import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  // better-auth's username plugin lowercases usernames at signup by default
  // (docs/36) — the stored column is always lowercase, so the lookup here
  // needs the same normalization, or a friend request typed in a different
  // case than the target registered with would 404.
  const username =
    typeof body?.username === "string" ? body.username.trim().toLowerCase() : "";
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

  // The read-then-write below (check for an existing row, then create/update)
  // is a check-then-act race: without isolation, two near-simultaneous
  // requests between the same pair (A→B and B→A) can both see "no existing
  // row" and both insert their own — the schema's @@unique([userId,
  // friendId]) is directional and doesn't catch the mirror pair. That let an
  // "ignore" on one row get silently overridden by the other row later being
  // accepted (docs/56 finding 56-1). Serializable isolation makes Postgres
  // itself detect the conflict and fail one of the two transactions instead
  // of letting both commit; retried a couple of times since a serialization
  // failure (Prisma P2034) is expected/normal under this isolation level,
  // not a real error — one retry is virtually always enough to observe the
  // other transaction's now-committed row and take the update-instead-of-
  // create branch.
  const run = () =>
    prisma.$transaction(
      async (tx) => {
        const existing = await tx.friendship.findFirst({
          where: {
            OR: [
              { userId: user.id, friendId: target.id },
              { userId: target.id, friendId: user.id },
            ],
          },
        });

        if (existing) {
          if (existing.status === "accepted") return;
          if (existing.status === "ignored") {
            // Anti-spam rule from docs/05-architecture.md: a request against
            // an already-ignored pair is a silent no-op, not a new pending
            // row and not an error.
            return;
          }
          if (existing.userId === user.id) {
            // Already pending in the same direction — don't create a duplicate.
            return;
          }
          // They already sent *us* a pending request — treat this call as
          // accepting theirs instead of creating a redundant second row.
          await tx.friendship.update({ where: { id: existing.id }, data: { status: "accepted" } });
          return;
        }

        await tx.friendship.create({
          data: { userId: user.id, friendId: target.id, status: "pending" },
        });
      },
      { isolationLevel: "Serializable" }
    );

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await run();
      break;
    } catch (err) {
      const isSerializationConflict =
        err && typeof err === "object" && "code" in err && err.code === "P2034";
      if (!isSerializationConflict || attempt === maxAttempts) throw err;
    }
  }

  return NextResponse.json({ ok: true });
}
