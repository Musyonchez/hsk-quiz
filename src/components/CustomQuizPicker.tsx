"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { pillClasses } from "@/components/pill-classes";

type LevelWithChapters = {
  slug: string;
  name: string;
  chapters: { number: number; title: string }[];
};

type Selection = { combined: boolean; chapters: Set<number> };

function emptySelection(): Selection {
  return { combined: false, chapters: new Set() };
}

function summarize(selection: Selection | undefined): string | null {
  if (!selection) return null;
  if (selection.combined) return "Combined selected";
  if (selection.chapters.size > 0) {
    const numbers = [...selection.chapters].sort((a, b) => a - b).join(", ");
    return `Chapter${selection.chapters.size > 1 ? "s" : ""} ${numbers} selected`;
  }
  return null;
}

// Builds the quiz href from every level's selection. A single level picked
// with just 1 chapter isn't enough on its own (that's the existing
// per-chapter quiz page) — but once a second level contributes anything,
// even one chapter each is a genuinely new combination. See docs/17.
function buildQuizHref(selections: Record<string, Selection>): string | null {
  const picked = Object.entries(selections).filter(
    ([, s]) => s.combined || s.chapters.size > 0
  );
  if (picked.length === 0) return null;

  if (picked.length === 1) {
    const [slug, selection] = picked[0];
    if (selection.combined) return `/hsk/${slug}/combined/quiz`;
    if (selection.chapters.size >= 2) {
      const chapters = [...selection.chapters].sort((a, b) => a - b).join(",");
      return `/hsk/${slug}/custom/quiz?chapters=${chapters}`;
    }
    return null;
  }

  const parts = picked.map(([slug, selection]) =>
    selection.combined
      ? `${slug}:combined`
      : `${slug}:${[...selection.chapters].sort((a, b) => a - b).join("-")}`
  );
  return `/custom-quiz/quiz?picks=${parts.join(",")}`;
}

export function CustomQuizPicker({ levels }: { levels: LevelWithChapters[] }) {
  const router = useRouter();
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const [selections, setSelections] = useState<Record<string, Selection>>({});

  function toggleCombined(slug: string) {
    setSelections((prev) => {
      const current = prev[slug] ?? emptySelection();
      return { ...prev, [slug]: { combined: !current.combined, chapters: new Set() } };
    });
  }

  function toggleChapter(slug: string, number: number) {
    setSelections((prev) => {
      const current = prev[slug] ?? emptySelection();
      const chapters = new Set(current.chapters);
      if (chapters.has(number)) chapters.delete(number);
      else chapters.add(number);
      return { ...prev, [slug]: { combined: false, chapters } };
    });
  }

  const href = buildQuizHref(selections);
  const anySingleChapterOnly =
    Object.values(selections).some((s) => !s.combined && s.chapters.size === 1) && !href;

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
          selection={selections[level.slug]}
          onToggleCombined={() => toggleCombined(level.slug)}
          onToggleChapter={(number) => toggleChapter(level.slug, number)}
        />
      ))}

      <div className="flex flex-col gap-2">
        {anySingleChapterOnly && (
          <p className="text-sm text-muted-foreground">
            Select at least 2 chapters within a level, or add chapters from another level too.
          </p>
        )}
        <button
          type="button"
          onClick={() => href && router.push(href)}
          disabled={!href}
          className={pillClasses("primary", !href) + " self-start"}
        >
          Start quiz
        </button>
      </div>
    </div>
  );
}

function LevelAccordionItem({
  level,
  open,
  onToggle,
  selection,
  onToggleCombined,
  onToggleChapter,
}: {
  level: LevelWithChapters;
  open: boolean;
  onToggle: () => void;
  selection: Selection | undefined;
  onToggleCombined: () => void;
  onToggleChapter: (number: number) => void;
}) {
  const combined = selection?.combined ?? false;
  const chapters = selection?.chapters ?? new Set<number>();
  const summary = summarize(selection);

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="text-lg font-semibold">{level.name}</span>
          {summary && !open && (
            <span className="rounded-full bg-success-surface px-2.5 py-0.5 text-xs font-medium text-success">
              {summary}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-6 py-5">
          <Checkbox checked={combined} onChange={onToggleCombined}>
            Combined (all {level.chapters.length} chapters)
          </Checkbox>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {level.chapters.map((chapter) => (
              <Checkbox
                key={chapter.number}
                checked={chapters.has(chapter.number)}
                disabled={combined}
                onChange={() => onToggleChapter(chapter.number)}
              >
                Chapter {chapter.number} — {chapter.title}
              </Checkbox>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Custom-styled checkbox matching the app's ink/paper/seal system instead of
// the browser's native control. The real <input> stays in the DOM (visually
// hidden, not display:none) so focus/keyboard/screen-reader behavior is
// untouched — only the visible box is custom-drawn, driven directly by the
// `checked` prop rather than a CSS peer-checked selector, since the
// checkmark icon is nested inside that box rather than a direct sibling of
// the input (peer-* only matches siblings, not descendants of one).
function Checkbox({
  checked,
  disabled = false,
  onChange,
  children,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`flex items-center gap-2 text-sm ${
        disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"
      }`}
    >
      <span className="relative inline-flex h-4.5 w-4.5 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          className="peer absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <span
          aria-hidden
          className={`flex h-4.5 w-4.5 items-center justify-center rounded border transition-colors ${
            checked ? "border-success bg-success" : "border-border-strong bg-transparent"
          } peer-focus-visible:ring-2 peer-focus-visible:ring-border-strong peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-surface`}
        >
          {checked && <Check size={12} strokeWidth={3} className="text-foreground" />}
        </span>
      </span>
      {children}
    </label>
  );
}
