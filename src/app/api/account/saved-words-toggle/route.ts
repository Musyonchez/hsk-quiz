import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

// docs/57-saved-words-plan.md §4 — flips the per-account opt-in. Turning it
// off never touches SavedWordList/SavedWord rows, only the flag itself.
// Turning it on auto-creates the one v1 default list if it doesn't exist yet
// (a player who's toggled on/off before already has one).
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const enabled = body?.enabled;
  if (typeof enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: user.id }, data: { savedWordsEnabled: enabled } });
    if (!enabled) return;

    const existing = await tx.savedWordList.findFirst({ where: { userId: user.id, isDefault: true } });
    if (!existing) {
      await tx.savedWordList.create({
        data: { userId: user.id, name: "My Words", isDefault: true },
      });
    }
  });

  return NextResponse.json({ enabled });
}
