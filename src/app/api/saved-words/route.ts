import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/auth";
import { getDefaultSavedWordList, getSavedWordsEnabled } from "@/lib/queries";
import { prisma } from "@/lib/db";

// docs/57-saved-words-plan.md §9 — v1 always targets the caller's one
// default list (no `listId` in the body yet, §Later's multi-list phase adds
// that). Upserts: saving an already-saved word (by `chinese`, §2's identity
// decision) is a no-op that reports `alreadySaved: true` rather than a
// duplicate-key error, since a client-side desync (e.g. saved in another
// tab) is a real possibility, not just a misclick.
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }
  if (!(await getSavedWordsEnabled(user.id))) {
    return NextResponse.json({ error: "Saved Words isn't turned on." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const chinese = typeof body?.chinese === "string" ? body.chinese.trim() : "";
  const pinyin = typeof body?.pinyin === "string" ? body.pinyin.trim() : "";
  const meaning = typeof body?.meaning === "string" ? body.meaning : null;
  if (!chinese || !pinyin) {
    return NextResponse.json({ error: "chinese and pinyin are required." }, { status: 400 });
  }

  const list = await getDefaultSavedWordList(user.id);
  if (!list) {
    // Shouldn't happen — the toggle-on route always creates the default
    // list in the same transaction it flips savedWordsEnabled — but a
    // stale/desynced client (e.g. an old tab left open across a toggle-off
    // + toggle-on cycle) could in principle race this, so fail loudly
    // rather than silently writing to nowhere.
    return NextResponse.json({ error: "No Saved Words list yet." }, { status: 409 });
  }

  const existing = await prisma.savedWord.findUnique({
    where: { listId_chinese: { listId: list.id, chinese } },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id, alreadySaved: true });
  }

  try {
    const created = await prisma.savedWord.create({
      data: { listId: list.id, chinese, pinyin, meaning },
    });
    return NextResponse.json({ id: created.id, alreadySaved: false });
  } catch (err) {
    // P2002 (unique constraint) here means a genuine race with another
    // request for the same word — treat it the same as the pre-check above
    // finding it, rather than a 500.
    const isDuplicate = err && typeof err === "object" && "code" in err && err.code === "P2002";
    if (!isDuplicate) throw err;
    const existingAfterRace = await prisma.savedWord.findUnique({
      where: { listId_chinese: { listId: list.id, chinese } },
    });
    return NextResponse.json({ id: existingAfterRace!.id, alreadySaved: true });
  }
}
