import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { pillClasses } from "./pill-classes";
import { LogoutButton } from "./LogoutButton";
import { UserBadge } from "./UserBadge";

export async function AppHeader() {
  const user = await getSessionUser();

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
            <Link href="/hsk/1" className="hover:text-foreground">
              HSK 1
            </Link>
            <Link href="/hsk/2" className="hover:text-foreground">
              HSK 2
            </Link>
          </nav>
        )}
      </div>
      {user ? (
        <div className="flex items-center gap-4">
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
