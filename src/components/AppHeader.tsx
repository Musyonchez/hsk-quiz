import Link from "next/link";
import { Layers, Trophy, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getLevelsOverview } from "@/lib/queries";
import { pillClasses } from "./pill-classes";
import { LogoutButton } from "./LogoutButton";
import { UserBadge } from "./UserBadge";
import { MobileNav } from "./MobileNav";

export async function AppHeader() {
  const user = await getSessionUser();
  const levels = user ? await getLevelsOverview() : [];

  // docs/hold/24-responsive-design-plan.md: below `lg` the full link row (logo +
  // one link per level + Custom Quiz/Leaderboard/Friends + user badge + log
  // out) doesn't fit without wrapping — checked against the
  // actual 768px tablet target, where `md` (768px) still forces "HSK Quiz"
  // and several labels onto two lines. `lg` (1024px) is the breakpoint where
  // this row genuinely stops being cramped, so it collapses into a hamburger
  // drawer below that instead. The link markup itself is shared between the
  // desktop row and the mobile drawer, just laid out differently.
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            HSK Quiz
          </Link>
          {user && (
            <nav className="hidden items-center gap-4 text-sm text-muted-foreground lg:flex">
              {levels.map((level) => (
                <Link
                  key={level.id}
                  href={`/hsk/${level.slug}`}
                  className="hover:text-foreground"
                >
                  {level.name}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {user ? (
          <div className="hidden items-center gap-4 lg:flex">
            <Link
              href="/custom-quiz"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Layers size={16} />
              Custom Quiz
            </Link>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Trophy size={16} />
              Leaderboard
            </Link>
            <Link
              href="/friends"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Users size={16} />
              Friends
            </Link>
            <Link href="/account" className="hover:opacity-80">
              <UserBadge displayName={user.displayName} />
            </Link>
            <LogoutButton />
          </div>
        ) : (
          <div className="hidden items-center gap-3 lg:flex">
            <Link href="/login" className={pillClasses("primary", false, "sm")}>
              Log in
            </Link>
            <Link href="/register" className={pillClasses("secondary", false, "sm")}>
              Register
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 lg:hidden">
          {user && (
            <Link href="/account" className="hover:opacity-80">
              <UserBadge displayName={user.displayName} />
            </Link>
          )}
          <MobileNav>
            {user ? (
              <>
                {levels.map((level) => (
                  <Link key={level.id} href={`/hsk/${level.slug}`} className="text-foreground">
                    {level.name}
                  </Link>
                ))}
                <div className="my-1 h-px w-full bg-border" />
                <Link href="/custom-quiz" className="flex items-center gap-1.5 text-foreground">
                  <Layers size={16} />
                  Custom Quiz
                </Link>
                <Link href="/leaderboard" className="flex items-center gap-1.5 text-foreground">
                  <Trophy size={16} />
                  Leaderboard
                </Link>
                <Link href="/friends" className="flex items-center gap-1.5 text-foreground">
                  <Users size={16} />
                  Friends
                </Link>
                <div className="my-1 h-px w-full bg-border" />
                <LogoutButton />
              </>
            ) : (
              // Side by side, not stacked with everything else in the
              // drawer's flex-col — a two-button row reads oddly split
              // across two lines.
              <div className="flex items-center gap-3">
                <Link href="/login" className={pillClasses("primary", false, "sm")}>
                  Log in
                </Link>
                <Link href="/register" className={pillClasses("secondary", false, "sm")}>
                  Register
                </Link>
              </div>
            )}
          </MobileNav>
        </div>
      </div>
    </header>
  );
}
