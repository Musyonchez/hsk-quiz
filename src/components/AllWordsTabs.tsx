import Link from "next/link";

// Shared by /hsk/[level]/chapter/[chapter]/all, its /words sub-page, and its
// /quiz route (docs/25-chapter-all-words-plan.md and its addendum, plus
// docs/27-character-quiz-plan.md's Character tab) — five tabs: the real
// dialog transcript, the flat All Words vocabulary list, and the three quiz
// modes, all scoped to the same chapter. Same active/inactive pill styling
// as the leaderboard pages' existing tabClasses, reused rather than
// reinvented.
export function AllWordsTabs({
  baseHref,
  active,
}: {
  baseHref: string;
  active: "dialog" | "words" | "type" | "meaning" | "character";
}) {
  const tabClasses = (isActive: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent-secondary text-accent-secondary-foreground"
        : "border border-border-strong text-foreground hover:bg-surface-raised"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={baseHref} className={tabClasses(active === "dialog")}>
        Dialog
      </Link>
      <Link href={`${baseHref}/words`} className={tabClasses(active === "words")}>
        All Words
      </Link>
      <Link href={`${baseHref}/quiz?mode=type`} className={tabClasses(active === "type")}>
        Type pinyin
      </Link>
      <Link href={`${baseHref}/quiz?mode=meaning`} className={tabClasses(active === "meaning")}>
        Match meaning
      </Link>
      <Link href={`${baseHref}/quiz?mode=character`} className={tabClasses(active === "character")}>
        Character
      </Link>
    </div>
  );
}
