import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  createSession,
  verifyPassword,
  SESSION_COOKIE_NAME,
  UNREACHABLE_PASSWORD_HASH,
} from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = typeof body?.username === "string" ? body.username : null;
  const password = typeof body?.password === "string" ? body.password : null;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { username } });
  const valid = await verifyPassword(password, user?.passwordHash ?? UNREACHABLE_PASSWORD_HASH);

  if (!user || !valid) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const { token, expiresAt } = await createSession(user.id);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  return NextResponse.json({ username: user.username, displayName: user.displayName });
}
