export function pillClasses(variant: "primary" | "secondary", disabled = false): string {
  const base =
    "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition-colors";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer";

  if (variant === "primary") {
    return `${base} ${disabledClasses} bg-accent text-accent-foreground hover:bg-accent-hover`;
  }

  return `${base} ${disabledClasses} border border-border-strong text-foreground hover:bg-surface-raised`;
}
