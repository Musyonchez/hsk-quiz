import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { User } from "@/generated/prisma/client";

export async function requireSession(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}
