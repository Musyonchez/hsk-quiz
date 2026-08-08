export function pillClasses(
  variant: "primary" | "secondary",
  disabled = false,
  size: "md" | "sm" = "md"
): string {
  // "sm"'s vertical padding matches "md" (both land ~40px tall, a real
  // measurement against the ~40-44px comfortable touch-target minimum —
  // docs/hold/24-responsive-design-plan.md) — only the horizontal padding stays
  // narrower, so "sm" is visually more compact without being harder to tap.
  const sizeClasses = size === "sm" ? "px-4 py-2.5 text-sm" : "px-5 py-2.5 text-sm";
  const base = `inline-flex items-center justify-center rounded-full font-semibold transition-colors ${sizeClasses}`;
  const disabledClasses = disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer";

  if (variant === "primary") {
    return `${base} ${disabledClasses} bg-accent text-accent-foreground hover:bg-accent-hover`;
  }

  return `${base} ${disabledClasses} border border-border-strong text-foreground hover:bg-surface-raised`;
}
