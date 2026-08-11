import { prisma } from "@/lib/db";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

// better-auth stores a reset token's owner as Verification.value (the
// user's id) under identifier `reset-password:${token}` — confirmed against
// the installed version's own api/routes/password.mjs, not documented
// publicly. Looked up read-only here (findFirst, not the token-consuming
// lookup the actual reset endpoint uses) purely so the page can show which
// account this link resets — the actual `authClient.resetPassword` call in
// ResetPasswordForm still does its own token verification server-side.
async function lookupResetEmail(token: string): Promise<string | null> {
  const verification = await prisma.verification.findFirst({
    where: { identifier: `reset-password:${token}`, expiresAt: { gt: new Date() } },
  });
  if (!verification) return null;

  const userId = Number(verification.value);
  if (!Number.isInteger(userId)) return null;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return user?.email ?? null;
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const email = token ? await lookupResetEmail(token) : null;
  return <ResetPasswordForm token={token ?? null} email={email} />;
}
