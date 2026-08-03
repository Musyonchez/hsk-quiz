"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { pillClasses } from "@/components/pill-classes";

type LevelWithChapters = {
  slug: string;
  name: string;
  chapters: { number: number; title: string }[];
};

export function CustomQuizPicker({ levels }: { levels: LevelWithChapters[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {levels.map((level) => (
        <LevelAccordionItem
          key={level.slug}
          level={level}
          open={openSlug === level.slug}
          onToggle={() =>
            setOpenSlug((current) => (current === level.slug ? null : level.slug))
          }
        />
      ))}
    </div>
  );
}

function LevelAccordionItem({
  level,
  open,
  onToggle,
}: {
  level: LevelWithChapters;
  open: boolean;
  onToggle: () => void;
}) {
  const router = useRouter();
  const [combined, setCombined] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  function toggleCombined() {
    setCombined((prev) => {
      if (!prev) setSelected(new Set());
      return !prev;
    });
  }

  function toggleChapter(number: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(number)) next.delete(number);
      else next.add(number);
      return next;
    });
    setCombined(false);
  }

  function startQuiz() {
    if (combined) {
      router.push(`/hsk/${level.slug}/combined/quiz`);
      return;
    }
    const chapters = [...selected].sort((a, b) => a - b).join(",");
    router.push(`/hsk/${level.slug}/custom/quiz?chapters=${chapters}`);
  }

  const canStart = combined || selected.size >= 2;

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-lg font-semibold">{level.name}</span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-6 py-5">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={combined} onChange={toggleCombined} />
            Combined (all {level.chapters.length} chapters)
          </label>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {level.chapters.map((chapter) => (
              <label
                key={chapter.number}
                className={`flex items-center gap-2 text-sm ${
                  combined ? "cursor-not-allowed opacity-40" : ""
                }`}
              >
                <input
                  type="checkbox"
                  disabled={combined}
                  checked={selected.has(chapter.number)}
                  onChange={() => toggleChapter(chapter.number)}
                />
                Chapter {chapter.number} — {chapter.title}
              </label>
            ))}
          </div>

          {!combined && selected.size === 1 && (
            <p className="text-sm text-muted-foreground">
              Pick at least 2 chapters, or use that chapter&apos;s own quiz from the level page.
            </p>
          )}

          <button
            type="button"
            onClick={startQuiz}
            disabled={!canStart}
            className={pillClasses("primary", !canStart, "sm") + " self-start"}
          >
            Start quiz
          </button>
        </div>
      )}
    </div>
  );
}
