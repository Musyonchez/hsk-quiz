"use client";

// docs/57-saved-words-plan.md — client-side source of truth for "is this
// word saved" (so SaveWordButton, wired into 5 different call sites, doesn't
// need its own fetch) and the save/unsave mutations themselves. Seeded from
// a server-fetched snapshot (RootLayout → getSavedWordsInitialState) so the
// plus icon's saved-state survives a fresh page load, not just optimistic
// updates made in the current tab.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useToast } from "@/components/toast/ToastProvider";
import type { SavedWordsInitialState } from "@/lib/queries";

type SavedWordInput = { chinese: string; pinyin: string; meaning: string | null };

type SavedWordsContextValue = {
  enabled: boolean;
  isSaved: (chinese: string) => boolean;
  save: (word: SavedWordInput) => Promise<void>;
};

const SavedWordsContext = createContext<SavedWordsContextValue | null>(null);

export function SavedWordsProvider({
  initial,
  children,
}: {
  initial: SavedWordsInitialState;
  children: React.ReactNode;
}) {
  const { show } = useToast();
  const [enabled] = useState(initial.enabled);
  // chinese -> SavedWord id, so Undo can DELETE /api/saved-words/:id right
  // away without a lookup round trip.
  const [saved, setSaved] = useState<Map<string, number>>(
    () => new Map(initial.saved.map((w) => [w.chinese, w.id]))
  );

  const isSaved = useCallback((chinese: string) => saved.has(chinese), [saved]);

  const save = useCallback(
    async (word: SavedWordInput) => {
      if (saved.has(word.chinese)) {
        show({ message: "Already saved." });
        return;
      }

      const res = await fetch("/api/saved-words", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(word),
      });
      if (!res.ok) {
        show({ message: "Couldn't save that word — try again." });
        return;
      }
      const data: { id: number; alreadySaved: boolean } = await res.json();

      setSaved((prev) => new Map(prev).set(word.chinese, data.id));

      if (data.alreadySaved) {
        show({ message: "Already saved." });
        return;
      }

      show({
        message: `Saved ${word.chinese}.`,
        action: {
          label: "Undo",
          onClick: async () => {
            setSaved((prev) => {
              const next = new Map(prev);
              next.delete(word.chinese);
              return next;
            });
            await fetch(`/api/saved-words/${data.id}`, { method: "DELETE" }).catch(() => {});
          },
        },
      });
    },
    [saved, show]
  );

  const value = useMemo(() => ({ enabled, isSaved, save }), [enabled, isSaved, save]);

  return <SavedWordsContext.Provider value={value}>{children}</SavedWordsContext.Provider>;
}

export function useSavedWords(): SavedWordsContextValue {
  const ctx = useContext(SavedWordsContext);
  if (!ctx) throw new Error("useSavedWords must be used within a SavedWordsProvider");
  return ctx;
}
