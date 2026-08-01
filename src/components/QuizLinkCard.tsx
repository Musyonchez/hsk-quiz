import Link from "next/link";

export function QuizLinkCard({
  href,
  eyebrow,
  title,
}: {
  href: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-xl border border-border bg-surface p-5 transition-colors hover:border-border-strong hover:bg-surface-raised"
    >
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {eyebrow}
      </span>
      <span className="mt-2 text-lg font-semibold">{title}</span>
    </Link>
  );
}
