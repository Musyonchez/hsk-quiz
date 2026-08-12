import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/auth";
import type { SessionUser } from "@/lib/auth/auth";

export async function requireSession(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
