import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { destroySession, SESSION_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await destroySession(token);
    } catch {
      // ignore — cookie always gets cleared
    }
  }
  cookieStore.delete(SESSION_COOKIE);
  const url = new URL("/login", req.url);
  return NextResponse.redirect(url, { status: 303 });
}
