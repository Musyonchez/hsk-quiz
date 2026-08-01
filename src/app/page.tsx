import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { pillClasses } from "@/components/pill-classes";

export default async function LandingPage() {
  const user = await getSessionUser();

  return (
    <main className="mx-auto flex min-h-[calc(100vh-73px)] w-full max-w-2xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <h1 className="text-4xl font-bold">HSK Quiz</h1>
        <p className="mt-3 text-lg text-muted-foreground">
          Type the pinyin for HSK 1 and HSK 2 vocabulary, by chapter or the
          full level.
        </p>
      </div>

      {user ? (
        <Link href="/dashboard" className={pillClasses("primary")}>
          Go to dashboard
        </Link>
      ) : (
        <div className="flex items-center gap-4">
          <Link href="/login" className={pillClasses("primary")}>
            Log in
          </Link>
          <Link href="/register" className={pillClasses("secondary")}>
            Register
          </Link>
        </div>
      )}
    </main>
  );
}
