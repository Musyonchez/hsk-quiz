import { requireSession } from "@/lib/auth/require-session";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export default async function AccountPage() {
  const user = await requireSession();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-8 px-4">
      <div className="flex flex-col items-center text-center">
        <span
          aria-hidden
          className="mb-4 flex h-14 w-14 -rotate-6 items-center justify-center rounded-md border-2 border-accent text-2xl font-bold text-accent"
        >
          词
        </span>
        <h1 className="text-2xl font-bold">Account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Signed in as <span className="text-foreground">{user.username}</span>
        </p>
      </div>

      <ChangePasswordForm />
    </main>
  );
}
