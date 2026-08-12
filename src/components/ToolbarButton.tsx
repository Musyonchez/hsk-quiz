// Shared by all four quiz runners (QuizRunner, ChoiceQuizRunner,
// CharacterQuizRunner, MatchQuizRunner) — was defined near-identically in
// each file (docs/40 #20, docs/42-audit-frontend-components.md §2). This is
// the widened three-variant version: QuizRunner is the only caller that ever
// passes "active" (its Hard-mode toggle, docs/hold/28-progressive-difficulty-
// plan.md), the other three only ever pass "default"/"danger" — same
// rendering as their old private copies for those two, since this component
// is a straight extraction, not a redesign. See
// docs/46-quiz-runner-duplication-refactor.md.
export function ToolbarButton({
  onClick,
  disabled,
  label,
  variant = "default",
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  // "active" — a selected/toggled-on state (e.g. Hard mode once enabled),
  // bronze per docs/hold/30-color-palette-expansion-plan.md's accent-secondary,
  // same "selected but not a primary action" role tabs already use it for.
  variant?: "default" | "danger" | "active";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-2.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        variant === "danger"
          ? "border-border-strong text-danger hover:bg-danger/10"
          : variant === "active"
            ? "border-accent-secondary bg-accent-secondary text-accent-secondary-foreground hover:bg-accent-secondary-hover"
            : "border-border-strong text-foreground hover:bg-surface-raised"
      }`}
    >
      {children}
    </button>
  );
}
