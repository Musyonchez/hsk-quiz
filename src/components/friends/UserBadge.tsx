export function UserBadge({ displayName }: { displayName: string }) {
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-raised text-xs font-semibold">
        {initial}
      </span>
      <span className="text-foreground">{displayName}</span>
    </div>
  );
}
