import { Bookmark } from "lucide-react";
import { requireSession } from "@/lib/auth/require-session";
import { getDefaultSavedWordList, getSavedWordsEnabled, getSavedWordsForList } from "@/lib/queries";
import { SavedWordsToggle } from "@/components/saved-words/SavedWordsToggle";
import { SavedWordsPanel } from "@/components/saved-words/SavedWordsPanel";

export default async function SavedWordsPage() {
  const user = await requireSession();
  const enabled = await getSavedWordsEnabled(user.id);
  const words = enabled
    ? await (async () => {
        const list = await getDefaultSavedWordList(user.id);
        return list ? getSavedWordsForList(list.id) : [];
      })()
    : [];

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Bookmark size={22} className="text-muted-foreground" />
          Saved Words
        </h1>
        {enabled && <SavedWordsToggle enabled />}
      </div>

      {enabled ? <SavedWordsPanel words={words} /> : <SavedWordsToggle enabled={false} />}
    </main>
  );
}
