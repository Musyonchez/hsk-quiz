import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function QuizLinkCard({
  href,
  eyebrow,
  title,
  icon: Icon,
}: {
  href: string;
  eyebrow: string;
  title: string;
  icon?: LucideIcon;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      {Icon && (
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-foreground">
          <Icon size={20} />
        </span>
      )}
      <span className="flex flex-col">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {eyebrow}
        </span>
        <span className="mt-1 text-lg font-semibold">{title}</span>
      </span>
    </Link>
  );
}
