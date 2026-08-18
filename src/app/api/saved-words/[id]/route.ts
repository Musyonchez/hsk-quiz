import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

// Used both by the tab's own "remove" control and SaveWordButton's Undo
// action (docs/57-saved-words-plan.md §7/§9).
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { id } = await params;
  const savedWordId = Number(id);
  if (!Number.isInteger(savedWordId)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  // Ownership check via the list relation — same pattern as
  // src/app/api/friends/** — rather than trusting the id alone.
  const word = await prisma.savedWord.findUnique({
    where: { id: savedWordId },
    select: { id: true, list: { select: { userId: true } } },
  });
  if (!word || word.list.userId !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await prisma.savedWord.delete({ where: { id: savedWordId } });
  return NextResponse.json({ ok: true });
}
