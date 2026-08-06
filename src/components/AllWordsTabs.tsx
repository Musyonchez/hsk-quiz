import Link from "next/link";

// Shared by /hsk/[level]/chapter/[chapter]/all and its /quiz route
// (docs/25-chapter-all-words-plan.md) — three tabs: the plain dialog
// reference list itself, and the two quiz modes, all pointed at the same
// underlying dialog word set. Same active/inactive pill styling as the
// leaderboard pages' existing tabClasses, reused rather than reinvented.
export function AllWordsTabs({
  baseHref,
  active,
}: {
  baseHref: string;
  active: "dialog" | "type" | "meaning";
}) {
  const tabClasses = (isActive: boolean) =>
    `rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-accent text-accent-foreground"
        : "border border-border-strong text-foreground hover:bg-surface-raised"
    }`;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={baseHref} className={tabClasses(active === "dialog")}>
        Dialog
      </Link>
      <Link href={`${baseHref}/quiz?mode=type`} className={tabClasses(active === "type")}>
        Type pinyin
      </Link>
      <Link href={`${baseHref}/quiz?mode=meaning`} className={tabClasses(active === "meaning")}>
        Match meaning
      </Link>
    </div>
  );
}
