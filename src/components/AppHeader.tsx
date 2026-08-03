import Link from "next/link";
import { Layers, Trophy, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getLevelsOverview } from "@/lib/queries";
import { pillClasses } from "./pill-classes";
import { LogoutButton } from "./LogoutButton";
import { UserBadge } from "./UserBadge";

export async function AppHeader() {
  const user = await getSessionUser();
  const levels = user ? await getLevelsOverview() : [];

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface/80 px-6 py-4 backdrop-blur">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-bold">
          HSK Quiz
        </Link>
        {user && (
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/dashboard" className="hover:text-foreground">
              Dashboard
            </Link>
            {levels.map((level) => (
              <Link key={level.id} href={`/hsk/${level.slug}`} className="hover:text-foreground">
                {level.name}
              </Link>
            ))}
          </nav>
        )}
      </div>
      {user ? (
        <div className="flex items-center gap-4">
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
          <UserBadge displayName={user.displayName} />
          <LogoutButton />
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Link href="/login" className={pillClasses("primary", false, "sm")}>
            Log in
          </Link>
          <Link href="/register" className={pillClasses("secondary", false, "sm")}>
            Register
          </Link>
        </div>
      )}
    </header>
  );
}
