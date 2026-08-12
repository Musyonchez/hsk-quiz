import { ChevronDown } from "lucide-react";

// See src/lib/use-progressive-reveal.ts / docs/48. Renders nothing when
// there's nothing left to reveal — callers don't need their own `hasMore`
// check at the call site.
export function RevealMoreButton({
  hasMore,
  onClick,
}: {
  hasMore: boolean;
  onClick: () => void;
}) {
  if (!hasMore) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Show more words"
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-border-strong hover:bg-surface-raised hover:text-foreground"
    >
      <ChevronDown size={16} />
      Show more
    </button>
  );
}
